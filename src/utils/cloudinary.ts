import { idSystemApi } from '../services/idSystemApi';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Không đọc được file ảnh'));
    reader.readAsDataURL(blob);
  });
}

function getWorkerUploadUrl(): string {
  const workerBase = import.meta.env.VITE_WORKER_URL || '';
  return workerBase ? `${workerBase}/upload` : '/api/upload';
}

async function uploadDataUrlToBackend(dataUrl: string, filename?: string): Promise<string> {
  try {
    const uploadUrl = getWorkerUploadUrl();
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data_url: dataUrl,
        filename: filename || `img_${Date.now()}.png`
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.warn('Worker upload failed, falling back to legacy storage if configured:', err);
  }

  // Fallback to legacy ID system if configured
  if (idSystemApi.settings.isConfigured()) {
    const asset = await idSystemApi.storage.uploadImage({
      data_url: dataUrl,
      source_type: 'tool_upload'
    });
    if (asset.url && !isBitmapDataUrl(asset.url)) {
      return asset.url;
    }
  }

  throw new Error('Không thể tải ảnh lên hệ thống lưu trữ');
}

export async function uploadToCloudinary(dataUrl: string): Promise<string> {
  if (!isBitmapDataUrl(dataUrl)) {
    return dataUrl;
  }

  return uploadDataUrlToBackend(dataUrl);
}

export async function uploadFileToCloudinary(file: File | Blob): Promise<string> {
  try {
    const uploadUrl = getWorkerUploadUrl();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.warn('Direct file upload to worker failed, converting to dataUrl:', err);
  }

  return uploadDataUrlToBackend(await blobToDataUrl(file), (file as File).name);
}

export function isBitmapDataUrl(value?: string | null): boolean {
  return !!value && value.startsWith('data:image/') && !value.includes('image/svg+xml');
}

export function getCloudinaryThumbnailUrl(url?: string | null, width?: number): string | null {
  if (!url) return null;
  if (isBitmapDataUrl(url)) return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;

  const uploadToken = '/image/upload/';
  const idx = url.indexOf(uploadToken);
  if (idx === -1) return url;

  const prefix = url.substring(0, idx + uploadToken.length);
  let remainder = url.substring(idx + uploadToken.length);

  const slashIdx = remainder.indexOf('/');
  if (slashIdx !== -1 && !remainder.substring(0, slashIdx).match(/^v\d+$/)) {
    remainder = remainder.substring(slashIdx + 1);
  }

  const transform = width && width > 0 ? `f_auto,q_auto:best,w_${Math.max(width, 2400)},c_limit/` : 'f_auto,q_auto:best/';
  return `${prefix}${transform}${remainder}`;
}
