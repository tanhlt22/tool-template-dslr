import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const AUTH_SECRET = process.env.AUTH_SECRET || 'lumibooth-ai-secret-key-2026';

// In-memory fallback for AI settings
let localAISettings = {
  model_name: 'imagen-3.0-generate-002',
  gemini_api_key: '',
  prompt_prefix: '',
  prompt_suffix:
    ', ultra-modern 2026 premium wedding backdrop, minimal sleek elegant aesthetic, soft pastel gradient mesh, smooth liquid blurred colors, subtle cinematic analog film grain texture, high-end fine art editorial photography, contemporary clean design, thin classy minimalist gold borders on the very edges, completely clean uncluttered spacious center area, high resolution, award-winning contemporary event styling, natural soft diffused lighting, organic high-fashion atmosphere, no retro elements, no clip-art, no cheap plastic flowers, no text, no watermarks, no camera icons, no grid lines.',
  aspect_ratio: '1.5',
};

// Hardcoded default templates
const DEFAULT_TEMPLATES = [
  {
    id: 'template_korean_strip',
    name: 'Dải Ảnh Hàn Quốc Cute (Strip 2x6)',
    width: 600,
    height: 1800,
    background_prompt: 'Korean Cute Strip, pink pastel color, hearts background',
    slots: [
      { id: 'slot_k1', x: 50, y: 150, width: 500, height: 380, rotation: 0, order: 1 },
      { id: 'slot_k2', x: 50, y: 580, width: 500, height: 380, rotation: 0, order: 2 },
      { id: 'slot_k3', x: 50, y: 1010, width: 500, height: 380, rotation: 0, order: 3 },
    ],
    elements: [
      {
        id: 'text_ktitle',
        type: 'text',
        content: 'KOREAN MEMORIES',
        x: 50,
        y: 1450,
        width: 500,
        height: 60,
        rotation: 0,
        style: { color: '#ec4899', fontSize: 32, fontFamily: "'Pacifico', cursive", fontWeight: 'bold', order: 0 },
      },
    ],
    created_at: '2026-05-30T10:00:00Z',
  },
  {
    id: 'template_wedding_luxury',
    name: 'Luxury Gold Wedding (Khổ 4x6)',
    width: 1200,
    height: 1800,
    background_prompt: 'Elegant Navy background with gold luxury lines',
    slots: [
      { id: 'slot_w1', x: 80, y: 120, width: 480, height: 360, rotation: 0, order: 1 },
      { id: 'slot_w2', x: 640, y: 120, width: 480, height: 360, rotation: 0, order: 2 },
      { id: 'slot_w3', x: 80, y: 540, width: 480, height: 360, rotation: 0, order: 3 },
      { id: 'slot_w4', x: 640, y: 540, width: 480, height: 360, rotation: 0, order: 4 },
    ],
    elements: [
      {
        id: 'text_wtitle1',
        type: 'text',
        content: 'HAPPY WEDDING',
        x: 80,
        y: 1560,
        width: 800,
        height: 80,
        rotation: 0,
        style: { color: '#dfb26b', fontSize: 48, fontFamily: "'Great Vibes', cursive", fontWeight: 'bold', order: 0 },
      },
      {
        id: 'text_wtitle2',
        type: 'text',
        content: 'MINH & LAN • 30.05.2026',
        x: 80,
        y: 1660,
        width: 800,
        height: 40,
        rotation: 0,
        style: { color: '#ffffff', fontSize: 20, fontFamily: "'Outfit', sans-serif", fontWeight: 'bold', order: 1 },
      },
    ],
    created_at: '2026-05-30T10:01:00Z',
  },
  {
    id: 'template_vaporwave_neon',
    name: 'Neon Vaporwave Landscape (1200x800)',
    width: 1200,
    height: 800,
    background_prompt: 'Vaporwave retro sunset landscape with neon mountains',
    slots: [
      { id: 'slot_v1', x: 80, y: 120, width: 480, height: 360, rotation: -5, order: 1 },
      { id: 'slot_v2', x: 640, y: 120, width: 480, height: 360, rotation: 5, order: 2 },
    ],
    elements: [],
    created_at: '2026-05-30T10:02:00Z',
  },
];

let _supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!_supabaseClient) {
    _supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabaseClient;
}

function checkAdmin(password: string): { ok: boolean; error?: string; status?: number } {
  if (!ADMIN_PASSWORD) {
    return { ok: false, error: 'ADMIN_PASSWORD is not configured on this server', status: 500 };
  }
  if (password !== ADMIN_PASSWORD) {
    return { ok: false, error: 'Mật khẩu quản trị không đúng. Truy cập bị từ chối!', status: 401 };
  }
  return { ok: true };
}

// GET /api/frames — list all frames
router.get('/frames', async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('frames')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return res.json([...DEFAULT_TEMPLATES, ...data]);
      }
    } catch (err) {
      req.log.warn('Failed to fetch frames from Supabase, using defaults');
    }
  }
  return res.json(DEFAULT_TEMPLATES);
});

// POST /api/frames — create frame
router.post('/frames', async (req, res) => {
  try {
    const payload = req.body;
    const authPost = checkAdmin(payload.password || '');
    if (!authPost.ok) return res.status(authPost.status!).json({ error: authPost.error });
    const frameId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const record = {
      id: frameId,
      name: payload.name || 'Untitled Premium Layout',
      width: Number(payload.width) || 1200,
      height: Number(payload.height) || 1800,
      background_prompt: payload.backgroundPrompt || '',
      background_image_url: payload.backgroundImageUrl || null,
      slots: payload.slots || [],
      elements: payload.elements || [],
      created_at: createdAt,
    };
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('frames').insert([record]).select();
      if (error) throw error;
      const saved = data?.[0] || record;
      return res.status(201).json({ frame_id: saved.id, ...saved });
    }
    return res.status(201).json({ frame_id: record.id, ...record });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lỗi tạo mẫu thiết kế mới' });
  }
});

// PUT /api/frames — update frame
router.put('/frames', async (req, res) => {
  try {
    const payload = req.body;
    const authPut = checkAdmin(payload.password || '');
    if (!authPut.ok) return res.status(authPut.status!).json({ error: authPut.error });
    const { id, name, width, height, backgroundPrompt, backgroundImageUrl, slots, elements } = payload;
    if (!id) return res.status(400).json({ error: 'Thiếu ID khung ảnh cần cập nhật' });
    const updatedRecord = {
      name: name || 'Untitled Premium Layout',
      width: Number(width) || 1200,
      height: Number(height) || 1800,
      background_prompt: backgroundPrompt || '',
      background_image_url: backgroundImageUrl || null,
      slots: slots || [],
      elements: elements || [],
    };
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('frames').update(updatedRecord).eq('id', id).select();
      if (error) throw error;
      return res.json(data?.[0] || { id, ...updatedRecord });
    }
    return res.json({ id, ...updatedRecord });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lỗi cập nhật cấu hình mẫu' });
  }
});

// DELETE /api/frames?id=&password= — delete frame
router.delete('/frames', async (req, res) => {
  try {
    const { id, password } = req.query as { id: string; password: string };
    if (!id) return res.status(400).json({ error: 'Missing frame id' });
    const authDel = checkAdmin(password || '');
    if (!authDel.ok) return res.status(authDel.status!).json({ error: authDel.error });
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('frames').delete().eq('id', id);
      if (error) throw error;
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lỗi xóa mẫu thiết kế' });
  }
});

// GET /api/frames/ai-settings
router.get('/frames/ai-settings', async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('ai_settings').select('*').limit(1).single();
      if (!error && data) return res.json(data);
    } catch (err) {
      req.log.warn('Failed to fetch AI settings from Supabase');
    }
  }
  return res.json(localAISettings);
});

// POST /api/frames/ai-settings
router.post('/frames/ai-settings', async (req, res) => {
  try {
    const payload = req.body;
    const settingsRecord = {
      model_name: payload.model_name || 'imagen-3.0-generate-002',
      gemini_api_key: payload.gemini_api_key || '',
      prompt_prefix: payload.prompt_prefix || '',
      prompt_suffix: payload.prompt_suffix || '',
      aspect_ratio: payload.aspect_ratio || '1.5',
    };
    const supabase = getSupabase();
    if (supabase) {
      const { data: existing } = await supabase.from('ai_settings').select('id').limit(1);
      if (existing && existing.length > 0) {
        const { data, error } = await supabase
          .from('ai_settings')
          .update(settingsRecord)
          .eq('id', existing[0].id)
          .select();
        if (!error && data?.[0]) return res.json(data[0]);
      } else {
        const { data, error } = await supabase.from('ai_settings').insert([settingsRecord]).select();
        if (!error && data?.[0]) return res.json(data[0]);
      }
    }
    localAISettings = { ...localAISettings, ...settingsRecord };
    return res.json(localAISettings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lỗi lưu AI Settings' });
  }
});

// POST /api/frames/generate-bg
router.post('/frames/generate-bg', async (req, res) => {
  try {
    const { prompt, width, height } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    let modelName = 'imagen-3.0-generate-002';
    let apiKey = GEMINI_API_KEY;
    let prefix = '';
    let rawSuffix = '';
    let aspectRatio = '3:2';

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data } = await supabase.from('ai_settings').select('*').limit(1).single();
        if (data) {
          modelName = data.model_name || modelName;
          apiKey = data.gemini_api_key || apiKey;
          prefix = data.prompt_prefix || '';
          rawSuffix = data.prompt_suffix || '';
          aspectRatio = data.aspect_ratio || '3:2';
        }
      } catch (_) {
        req.log.warn('Failed to fetch AI settings for generate-bg');
      }
    }

    const fullPrompt = `${prefix}${prompt}${rawSuffix}`.trim();

    // Resolve aspect ratio
    const arNum = parseFloat(aspectRatio);
    let resolvedAspectRatio = '3:2';
    if (!isNaN(arNum)) {
      if (Math.abs(arNum - 1) < 0.1) resolvedAspectRatio = '1:1';
      else if (arNum > 1.4 && arNum < 1.6) resolvedAspectRatio = '3:2';
      else if (arNum > 1.7) resolvedAspectRatio = '16:9';
      else if (arNum < 0.8) resolvedAspectRatio = '9:16';
    }

    if (apiKey) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateImages?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: fullPrompt,
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: resolvedAspectRatio,
          }),
        });
        if (response.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const resData: any = await response.json();
          if (resData?.generatedImages?.[0]?.image?.imageBytes) {
            return res.json({
              image: `data:image/png;base64,${resData.generatedImages[0].image.imageBytes}`,
              prompt: fullPrompt,
            });
          }
        }
      } catch (geminiError: any) {
        req.log.error({ err: geminiError }, 'Gemini API error');
      }
    }

    // Fallback SVG gradient
    const fallbackImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${width || 1200}" height="${height || 800}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%230f172a"/><stop offset="100%" style="stop-color:%23020617"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23g)"/></svg>`;
    return res.json({ image: fallbackImage, prompt: fullPrompt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lỗi tạo ảnh nền AI' });
  }
});

// POST /api/frames/export
router.post('/frames/export', async (req, res) => {
  try {
    const record = req.body;
    const frameId = record.id || `frame_${Date.now()}`;
    let imageUrl = '';

    // Save to Supabase frames table
    const supabase = getSupabase();
    if (supabase) {
      try {
        const dbRecord = { ...record, background_image_url: imageUrl };
        const { error } = await supabase.from('frames').insert([dbRecord]);
        if (error) req.log.warn({ err: error }, 'Export DB insert error');
      } catch (dbErr: any) {
        req.log.error({ err: dbErr }, 'Export DB exception');
      }
    }

    return res.json({
      success: true,
      frame_id: frameId,
      image_url: imageUrl || '',
      name: record.name,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lỗi xuất và lưu khung ảnh' });
  }
});

// GET /api/frames/:id
router.get('/frames/:id', async (req, res) => {
  const frameId = req.params.id;
  const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.id === frameId);
  if (defaultTemplate) return res.json(defaultTemplate);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('frames').select('*').eq('id', frameId).single();
      if (!error && data) return res.json(data);
    } catch (_) {
      req.log.warn(`Failed to fetch frame ${frameId} from Supabase`);
    }
  }

  return res.status(404).json({ error: `Frame layout config not found for ID: ${frameId}` });
});

export { AUTH_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID };
export default router;
