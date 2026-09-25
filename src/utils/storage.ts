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

export function isBitmapDataUrl(value?: string | null): boolean {
  return !!value && value.startsWith('data:image/') && !value.includes('image/svg+xml');
}

/**
 * Chuẩn hóa URL asset luôn đi qua Cloudflare Worker proxy CDN
 */
export function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (isBitmapDataUrl(url)) return url;

  const workerBase = import.meta.env.VITE_WORKER_URL || 'https://frame-storage-proxy.toashop2002.workers.dev';

  // Nếu là relative path /assets/..., gắn base của Cloudflare Worker
  if (url.startsWith('/assets/')) {
    return `${workerBase}${url}`;
  }

  // Nếu là link Google Drive CDN cũ, chuyển hướng về Cloudflare Worker proxy
  const googleMatch = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (googleMatch && googleMatch[1]) {
    return `${workerBase}/assets/${googleMatch[1]}`;
  }

  // Nếu là link drive.google.com uc?id= hoặc file/d/
  const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|uc\?(?:[^&]+&)*id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `${workerBase}/assets/${driveMatch[1]}`;
  }

  return url;
}

export function getAssetUrl(url?: string | null): string | null {
  if (!url) return null;
  return resolveAssetUrl(url);
}

// Alias tương thích ngược cho getCloudinaryThumbnailUrl
export const getCloudinaryThumbnailUrl = (url?: string | null, _width?: number) => getAssetUrl(url);

/**
 * Tải dữ liệu ảnh (dataUrl base64) lên Cloudflare Worker -> Google Drive
 */
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
      if (data.url) return resolveAssetUrl(data.url);
    }
  } catch (err) {
    console.warn('Worker upload failed, falling back to legacy storage if configured:', err);
  }

  // Fallback sang ID system nếu có cấu hình
  if (idSystemApi.settings.isConfigured()) {
    const asset = await idSystemApi.storage.uploadImage({
      data_url: dataUrl,
      source_type: 'tool_upload'
    });
    if (asset.url && !isBitmapDataUrl(asset.url)) {
      return asset.url;
    }
  }

  throw new Error('Không thể tải ảnh lên hệ thống lưu trữ Cloudflare');
}

/**
 * Upload ảnh lên Cloudflare Worker Storage
 */
export async function uploadToStorage(dataUrl: string): Promise<string> {
  if (!isBitmapDataUrl(dataUrl)) {
    return dataUrl;
  }

  return uploadDataUrlToBackend(dataUrl);
}

/**
 * Upload File / Blob lên Cloudflare Worker Storage
 */
export async function uploadFileToStorage(file: File | Blob): Promise<string> {
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
      if (data.url) return resolveAssetUrl(data.url);
    }
  } catch (err) {
    console.warn('Direct file upload to worker failed, converting to dataUrl:', err);
  }

  return uploadDataUrlToBackend(await blobToDataUrl(file), (file as File).name);
}

// Alias tương thích ngược cho code cũ
export const uploadToCloudinary = uploadToStorage;
export const uploadFileToCloudinary = uploadFileToStorage;
