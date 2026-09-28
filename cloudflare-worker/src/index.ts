import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, FrameIndex, FrameLayoutPayload, User } from './types';
import { uploadToDrive, getFileContent, updateFileContent, deleteFileFromDrive } from './drive';
import { hashPassword, verifyPassword, signJwt, verifyJwt } from './auth';

const app = new Hono<{ Bindings: Env }>();

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  })
);

// Helper to extract optional auth user
async function getAuthUser(authHeader: string | undefined, secret: string): Promise<User | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  const payload = await verifyJwt(token, secret);
  return payload as User | null;
}

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/', (c) => {
  return c.json({
    service: 'Photobooth Cloudflare Worker API',
    status: 'online',
    version: '2.0.0'
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Auth Endpoints ─────────────────────────────────────────────────────────
app.post('/auth/register', async (c) => {
  try {
    const { username, password, role = 'user' } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: 'Username và password là bắt buộc' }, 400);
    }

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?')
      .bind(username.trim().toLowerCase())
      .first();

    if (existing) {
      return c.json({ error: 'Tên người dùng hoặc email đã tồn tại' }, 409);
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await c.env.DB.prepare(
      'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)'
    )
      .bind(id, username.trim().toLowerCase(), passwordHash, role)
      .run();

    const user = { id, username: username.trim().toLowerCase(), role };
    const token = await signJwt(user, c.env.JWT_SECRET);

    return c.json({ success: true, user, token });
  } catch (err: any) {
    return c.json({ error: err.message || 'Đăng ký thất bại' }, 500);
  }
});

app.post('/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: 'Vui lòng nhập đầy đủ username và password' }, 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT id, username, password_hash, role FROM users WHERE username = ?'
    )
      .bind(username.trim().toLowerCase())
      .first<User>();

    if (!user) {
      return c.json({ error: 'Sai tài khoản hoặc mật khẩu' }, 401);
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Sai tài khoản hoặc mật khẩu' }, 401);
    }

    const userPayload = { id: user.id, username: user.username, role: user.role };
    const token = await signJwt(userPayload, c.env.JWT_SECRET);

    return c.json({ success: true, user: userPayload, token });
  } catch (err: any) {
    return c.json({ error: err.message || 'Đăng nhập thất bại' }, 500);
  }
});

app.get('/auth/me', async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'), c.env.JWT_SECRET);
  if (!user) {
    return c.json({ error: 'Chưa đăng nhập hoặc token không hợp lệ' }, 401);
  }
  return c.json({ user });
});

// ─── Upload (Open / Free Upload to Google Drive) ─────────────────────────────
app.post('/upload', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';
    let fileName = `upload_${Date.now()}`;
    let mimeType = 'image/png';
    let fileBody: ArrayBuffer | Uint8Array | Blob;

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const entry = formData.get('file');

      if (!entry || typeof entry === 'string') {
        return c.json({ error: 'Thiếu file trong formData' }, 400);
      }

      const file = entry as File;
      fileName = file.name || `upload_${Date.now()}`;
      mimeType = file.type || 'image/png';
      fileBody = await file.arrayBuffer();
    } else {
      // Expect JSON with base64 dataUrl or binary
      const body = await c.req.json();
      const dataUrl = body.data_url || body.dataUrl || body.image;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return c.json({ error: 'Thiếu trường data_url base64' }, 400);
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return c.json({ error: 'Định dạng data_url không hợp lệ' }, 400);
      }

      mimeType = match[1];
      const base64Data = match[2];
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBody = bytes;
      if (body.filename) fileName = body.filename;
    }

    const driveFile = await uploadToDrive(c.env, {
      name: fileName,
      mimeType: mimeType,
      body: fileBody
    });

    const origin = new URL(c.req.url).origin;
    const proxyUrl = `${origin}/assets/${driveFile.id}`;

    return c.json({
      success: true,
      file_id: driveFile.id,
      name: driveFile.name,
      url: proxyUrl,
      direct_url: proxyUrl
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Lỗi upload ảnh lên hệ thống lưu trữ' }, 500);
  }
});

// ─── Asset Proxy / Cloudflare CDN Cache ──────────────────────────────────────
app.get('/assets/:fileId', async (c) => {
  const fileId = c.req.param('fileId');
  if (!fileId) return c.text('Not found', 404);

  try {
    const driveRes = await getFileContent(c.env, fileId);
    if (!driveRes.ok) {
      return c.text('Asset not found in storage', driveRes.status as any);
    }

    const contentType = driveRes.headers.get('content-type') || 'image/png';
    const contentLength = driveRes.headers.get('content-length');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000, immutable'
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    return new Response(driveRes.body, {
      status: 200,
      headers
    });
  } catch (err: any) {
    return c.text(`Asset load failed: ${err.message}`, 500);
  }
});

// ─── Categories Endpoint ────────────────────────────────────────────────────
app.get('/categories', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT DISTINCT category FROM frames_index WHERE category IS NOT NULL AND category != "" ORDER BY category ASC'
    ).all<{ category: string }>();

    const categories = (results.results || []).map((r) => r.category);
    return c.json({ categories });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── Frames API ─────────────────────────────────────────────────────────────

// 1. GET /frames: List frames (fast D1 query, with category and search filter)
app.get('/frames', async (c) => {
  try {
    const category = c.req.query('category');
    const search = c.req.query('search');

    let query = 'SELECT * FROM frames_index WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      query += ' AND name LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(query).bind(...params).all<FrameIndex>();

    return c.json(result.results || []);
  } catch (err: any) {
    return c.json({ error: err.message || 'Lỗi nạp danh sách frames' }, 500);
  }
});

// 2. GET /frames/:id: Load full template layout config
app.get('/frames/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const indexRecord = await c.env.DB.prepare(
      'SELECT * FROM frames_index WHERE id = ?'
    )
      .bind(id)
      .first<FrameIndex>();

    if (!indexRecord) {
      return c.json({ error: 'Không tìm thấy mẫu thiết kế' }, 404);
    }

    // If there is a drive_file_id, fetch JSON from Google Drive
    if (indexRecord.drive_file_id) {
      try {
        const driveRes = await getFileContent(c.env, indexRecord.drive_file_id);
        if (driveRes.ok) {
          const configJson = (await driveRes.json()) as FrameLayoutPayload;
          return c.json({
            ...configJson,
            id: indexRecord.id,
            name: indexRecord.name || configJson.name,
            category: indexRecord.category || configJson.category || 'general',
            width: indexRecord.width || configJson.width,
            height: indexRecord.height || configJson.height,
            thumbnail_url: indexRecord.thumbnail_url || configJson.thumbnail_url,
            background_image_url: indexRecord.background_image_url || configJson.background_image_url,
            created_at: indexRecord.created_at
          });
        }
      } catch (driveErr: any) {
        console.warn(`Could not load drive JSON for frame ${id}:`, driveErr);
      }
    }

    // Fallback if no drive JSON
    return c.json({
      id: indexRecord.id,
      name: indexRecord.name,
      category: indexRecord.category,
      width: indexRecord.width,
      height: indexRecord.height,
      background_image_url: indexRecord.background_image_url,
      thumbnail_url: indexRecord.thumbnail_url,
      slots: [],
      elements: [],
      created_at: indexRecord.created_at
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Lỗi tải chi tiết frame' }, 500);
  }
});

// 3. POST /frames: Create new template (Save JSON to Google Drive + Index in D1)
app.post('/frames', async (c) => {
  try {
    const payload = (await c.req.json()) as FrameLayoutPayload;
    const user = await getAuthUser(c.req.header('Authorization'), c.env.JWT_SECRET);

    const frameId = payload.id || crypto.randomUUID();
    const name = payload.name || 'Mẫu thiết kế mới';
    const category = payload.category || 'general';
    const width = Number(payload.width) || 1200;
    const height = Number(payload.height) || 1800;
    let bgUrl = payload.backgroundImageUrl || payload.background_image_url || null;
    if (!bgUrl && Array.isArray(payload.elements)) {
      const bgEl = payload.elements.find((el: any) =>
        (el?.type === 'image' || el?.type === 'icon') &&
        (el?.id?.startsWith('background_frame') || (el?.width === width && el?.height === height) || el?.content)
      );
      if (bgEl?.content) bgUrl = bgEl.content;
    }
    const thumbUrl = payload.thumbnail_url || bgUrl || null;

    // 1. Upload full JSON config to Google Drive
    const driveFile = await uploadToDrive(c.env, {
      name: `frame_${frameId}_config.json`,
      mimeType: 'application/json',
      body: JSON.stringify({ ...payload, id: frameId, name, category, width, height })
    });

    // 2. Insert into D1 index
    await c.env.DB.prepare(
      `INSERT INTO frames_index 
        (id, name, category, width, height, thumbnail_url, background_image_url, drive_file_id, user_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        width = excluded.width,
        height = excluded.height,
        thumbnail_url = excluded.thumbnail_url,
        background_image_url = excluded.background_image_url,
        drive_file_id = excluded.drive_file_id,
        updated_at = CURRENT_TIMESTAMP`
    )
      .bind(
        frameId,
        name,
        category,
        width,
        height,
        thumbUrl,
        bgUrl,
        driveFile.id,
        user?.id || null
      )
      .run();

    return c.json({
      success: true,
      frame_id: frameId,
      id: frameId,
      name,
      category,
      width,
      height,
      thumbnail_url: thumbUrl,
      background_image_url: bgUrl,
      drive_file_id: driveFile.id
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Lỗi tạo mẫu thiết kế' }, 500);
  }
});

// 4. PUT /frames/:id: Update existing template
app.put('/frames/:id', async (c) => {
  const frameId = c.req.param('id');
  try {
    const payload = (await c.req.json()) as FrameLayoutPayload;

    const existing = await c.env.DB.prepare(
      'SELECT * FROM frames_index WHERE id = ?'
    )
      .bind(frameId)
      .first<FrameIndex>();

    if (!existing) {
      return c.json({ error: 'Không tìm thấy mẫu thiết kế' }, 404);
    }

    const name = payload.name || existing.name;
    const category = payload.category || existing.category;
    const width = Number(payload.width) || existing.width;
    const height = Number(payload.height) || existing.height;
    let bgUrl =
      payload.backgroundImageUrl ||
      payload.background_image_url ||
      existing.background_image_url;
    if (!bgUrl && Array.isArray(payload.elements)) {
      const bgEl = payload.elements.find((el: any) =>
        (el?.type === 'image' || el?.type === 'icon') &&
        (el?.id?.startsWith('background_frame') || (el?.width === width && el?.height === height) || el?.content)
      );
      if (bgEl?.content) bgUrl = bgEl.content;
    }
    const thumbUrl = payload.thumbnail_url || existing.thumbnail_url || bgUrl;

    let driveFileId = existing.drive_file_id;

    // Update or create Google Drive file
    if (driveFileId) {
      try {
        await updateFileContent(
          c.env,
          driveFileId,
          'application/json',
          JSON.stringify({ ...payload, id: frameId, name, category, width, height })
        );
      } catch {
        // If update failed (e.g. file deleted on Drive), upload new one
        const driveFile = await uploadToDrive(c.env, {
          name: `frame_${frameId}_config.json`,
          mimeType: 'application/json',
          body: JSON.stringify({ ...payload, id: frameId, name, category, width, height })
        });
        driveFileId = driveFile.id;
      }
    } else {
      const driveFile = await uploadToDrive(c.env, {
        name: `frame_${frameId}_config.json`,
        mimeType: 'application/json',
        body: JSON.stringify({ ...payload, id: frameId, name, category, width, height })
      });
      driveFileId = driveFile.id;
    }

    // Update D1
    await c.env.DB.prepare(
      `UPDATE frames_index SET 
        name = ?, category = ?, width = ?, height = ?, thumbnail_url = ?, 
        background_image_url = ?, drive_file_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(name, category, width, height, thumbUrl, bgUrl, driveFileId, frameId)
      .run();

    return c.json({
      success: true,
      frame_id: frameId,
      id: frameId,
      name,
      category,
      width,
      height,
      thumbnail_url: thumbUrl,
      background_image_url: bgUrl
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Lỗi cập nhật mẫu thiết kế' }, 500);
  }
});

// Also support PUT /frames with payload.id
app.put('/frames', async (c) => {
  try {
    const payload = (await c.req.json()) as FrameLayoutPayload;
    const frameId = payload.id;
    if (!frameId) {
      return c.json({ error: 'Thiếu id của mẫu thiết kế' }, 400);
    }

    const existing = await c.env.DB.prepare(
      'SELECT * FROM frames_index WHERE id = ?'
    )
      .bind(frameId)
      .first<FrameIndex>();

    if (!existing) {
      return c.json({ error: 'Không tìm thấy mẫu thiết kế' }, 404);
    }

    const name = payload.name || existing.name;
    const category = payload.category || existing.category;
    const width = Number(payload.width) || existing.width;
    const height = Number(payload.height) || existing.height;
    let bgUrl =
      payload.backgroundImageUrl ||
      payload.background_image_url ||
      existing.background_image_url;
    if (!bgUrl && Array.isArray(payload.elements)) {
      const bgEl = payload.elements.find((el: any) =>
        (el?.type === 'image' || el?.type === 'icon') &&
        (el?.id?.startsWith('background_frame') || (el?.width === width && el?.height === height) || el?.content)
      );
      if (bgEl?.content) bgUrl = bgEl.content;
    }
    const thumbUrl = payload.thumbnail_url || existing.thumbnail_url || bgUrl;

    let driveFileId = existing.drive_file_id;

    // Update or create Google Drive file
    if (driveFileId) {
      try {
        await updateFileContent(
          c.env,
          driveFileId,
          'application/json',
          JSON.stringify({ ...payload, id: frameId, name, category, width, height })
        );
      } catch {
        const driveFile = await uploadToDrive(c.env, {
          name: `frame_${frameId}_config.json`,
          mimeType: 'application/json',
          body: JSON.stringify({ ...payload, id: frameId, name, category, width, height })
        });
        driveFileId = driveFile.id;
      }
    } else {
      const driveFile = await uploadToDrive(c.env, {
        name: `frame_${frameId}_config.json`,
        mimeType: 'application/json',
        body: JSON.stringify({ ...payload, id: frameId, name, category, width, height })
      });
      driveFileId = driveFile.id;
    }

    // Update D1
    await c.env.DB.prepare(
      `UPDATE frames_index SET 
        name = ?, category = ?, width = ?, height = ?, thumbnail_url = ?, 
        background_image_url = ?, drive_file_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(name, category, width, height, thumbUrl, bgUrl, driveFileId, frameId)
      .run();

    return c.json({
      success: true,
      frame_id: frameId,
      id: frameId,
      name,
      category,
      width,
      height,
      thumbnail_url: thumbUrl,
      background_image_url: bgUrl
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Lỗi cập nhật mẫu thiết kế' }, 500);
  }
});

// 5. DELETE /frames/:id or DELETE /frames?id=:id
app.delete('/frames/:id', async (c) => {
  const frameId = c.req.param('id');
  try {
    const existing = await c.env.DB.prepare(
      'SELECT drive_file_id FROM frames_index WHERE id = ?'
    )
      .bind(frameId)
      .first<{ drive_file_id: string }>();

    if (existing?.drive_file_id) {
      try {
        await deleteFileFromDrive(c.env, existing.drive_file_id);
      } catch (err) {
        console.warn('Could not delete drive file:', err);
      }
    }

    await c.env.DB.prepare('DELETE FROM frames_index WHERE id = ?').bind(frameId).run();

    return c.json({ success: true, frame_id: frameId, id: frameId });
  } catch (err: any) {
    return c.json({ error: err.message || 'Lỗi xóa mẫu thiết kế' }, 500);
  }
});

// Also support DELETE /frames?id=... for backwards compatibility
app.delete('/frames', async (c) => {
  const frameId = c.req.query('id');
  if (!frameId) {
    return c.json({ error: 'Thiếu id' }, 400);
  }

  try {
    const existing = await c.env.DB.prepare(
      'SELECT drive_file_id FROM frames_index WHERE id = ?'
    )
      .bind(frameId)
      .first<{ drive_file_id: string }>();

    if (existing?.drive_file_id) {
      try {
        await deleteFileFromDrive(c.env, existing.drive_file_id);
      } catch (err) {
        console.warn('Could not delete drive file:', err);
      }
    }

    await c.env.DB.prepare('DELETE FROM frames_index WHERE id = ?').bind(frameId).run();

    return c.json({ success: true, frame_id: frameId, id: frameId });
  } catch (err: any) {
    return c.json({ error: err.message || 'Lỗi xóa mẫu thiết kế' }, 500);
  }
});

export default app;
