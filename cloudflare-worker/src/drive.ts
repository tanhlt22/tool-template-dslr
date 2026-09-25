import { Env } from './types';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

export async function getAccessToken(env: Env): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const params = new URLSearchParams({
    client_id: env.DRIVE_CLIENT_ID,
    client_secret: env.DRIVE_CLIENT_SECRET,
    refresh_token: env.DRIVE_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000
  };

  return data.access_token;
}

export interface UploadOptions {
  name: string;
  mimeType: string;
  body: ArrayBuffer | Uint8Array | string | Blob;
  folderId?: string;
}

export async function uploadToDrive(
  env: Env,
  options: UploadOptions
): Promise<{ id: string; name: string }> {
  const token = await getAccessToken(env);
  const boundary = 'cf_boundary_' + Math.random().toString(36).substring(2);

  const metadata = {
    name: options.name,
    parents: [options.folderId || env.DRIVE_ROOT_FOLDER_ID]
  };

  const encoder = new TextEncoder();
  const headPart = encoder.encode(
    `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n--${boundary}\r\nContent-Type: ${options.mimeType}\r\n\r\n`
  );
  const footPart = encoder.encode(`\r\n--${boundary}--`);

  const multipartBody = new Blob([headPart, options.body, footPart]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Drive upload failed (${uploadRes.status}): ${errorText}`);
  }

  const fileData = (await uploadRes.json()) as { id: string; name: string };

  // Set file permission to public reader
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (err) {
    console.warn('Could not set public permission on file:', err);
  }

  return fileData;
}

export async function getFileContent(env: Env, fileId: string): Promise<Response> {
  // 1. Ưu tiên tải trực tiếp qua CDN public của Google ở chế độ nét nhất (=s0)
  try {
    const directRes = await fetch(`https://lh3.googleusercontent.com/d/${fileId}=s0`, {
      redirect: 'follow'
    });
    if (directRes.ok && directRes.status === 200) {
      return directRes;
    }
  } catch (err) {
    console.warn(`Direct fetch failed for ${fileId}, trying alternatives:`, err);
  }

  // 2. Thử qua endpoint direct uc export của Google Drive
  try {
    const ucRes = await fetch(`https://drive.google.com/uc?export=view&id=${fileId}`, {
      redirect: 'follow'
    });
    if (ucRes.ok && ucRes.status === 200) {
      return ucRes;
    }
  } catch (err) {
    console.warn(`UC export fetch failed for ${fileId}:`, err);
  }

  // 3. Fallback sang Google Drive API có token nếu các cách trên không được
  const token = await getAccessToken(env);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res;
}

export async function updateFileContent(
  env: Env,
  fileId: string,
  mimeType: string,
  body: ArrayBuffer | Uint8Array | string | Blob
): Promise<void> {
  const token = await getAccessToken(env);
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType
      },
      body: body
    }
  );
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Drive update failed (${res.status}): ${errorText}`);
  }
}

export async function deleteFileFromDrive(env: Env, fileId: string): Promise<void> {
  const token = await getAccessToken(env);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Drive delete failed (${res.status}): ${errorText}`);
  }
}
