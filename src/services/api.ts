import { FrameConfig } from '../types/canvas';
import { isBitmapDataUrl, resolveAssetUrl } from '../utils/storage';
import { CentralFrame, getIdSystemSettings, idSystemApi } from './idSystemApi';

function getWorkerApiUrl(path: string): string {
  const workerBase = import.meta.env.VITE_WORKER_URL;
  if (workerBase) {
    const cleanPath = path.startsWith('/api') ? path.substring(4) : path;
    return `${workerBase}${cleanPath}`;
  }
  return path;
}

// ─── Client-side in-memory cache ────────────────────────────────────────────
const CLIENT_CACHE_TTL = 5 * 60 * 1000;
let framesCache: { data: any[]; timestamp: number } | null = null;
const frameDetailCache = new Map<string, any>();

function invalidateFramesCache() {
  framesCache = null;
  frameDetailCache.clear();
}

function normalizeFrameUrls(frame: any): any {
  if (!frame) return frame;
  const copy = { ...frame };
  if (copy.background_image_url) {
    copy.background_image_url = resolveAssetUrl(copy.background_image_url);
  }
  if (copy.backgroundImageUrl) {
    copy.backgroundImageUrl = resolveAssetUrl(copy.backgroundImageUrl);
  }
  if (copy.thumbnail_url) {
    copy.thumbnail_url = resolveAssetUrl(copy.thumbnail_url);
  }
  if (copy.thumbnailUrl) {
    copy.thumbnailUrl = resolveAssetUrl(copy.thumbnailUrl);
  }
  if (Array.isArray(copy.elements)) {
    copy.elements = copy.elements.map((el: any) => {
      if (el && (el.type === 'image' || el.type === 'icon') && el.content) {
        return { ...el, content: resolveAssetUrl(el.content) };
      }
      return el;
    });
  }
  return copy;
}

function assertNoBitmapDataUrls(payload: any) {
  if (isBitmapDataUrl(payload.backgroundImageUrl)) {
    throw new Error('Ảnh nền vẫn là base64. Cần tải lên hệ thống lưu trữ trước khi lưu mẫu.');
  }

  const badElement = (payload.elements || []).find((element: any) => isBitmapDataUrl(element?.content));
  if (badElement) {
    throw new Error(`Lớp "${badElement.id || badElement.fileName || 'ảnh'}" vẫn là base64. Cần tải lên hệ thống lưu trữ trước khi lưu mẫu.`);
  }
}

function isCentralApiEnabled() {
  return idSystemApi.settings.isConfigured();
}

function encodeFrameConfig(payload: any) {
  return JSON.stringify({
    background_prompt: payload.backgroundPrompt || '',
    background_image_url: payload.backgroundImageUrl || null,
    slots: payload.slots || [],
    elements: payload.elements || []
  });
}

function decodeCentralFrame(frame: CentralFrame) {
  let config: any = {};
  try {
    config = frame.config_json ? JSON.parse(frame.config_json) : {};
  } catch {
    config = {};
  }

  return {
    id: frame.id,
    name: frame.name,
    width: frame.width,
    height: frame.height,
    background_prompt: config.background_prompt || '',
    background_image_url: config.background_image_url || null,
    slots: Array.isArray(config.slots) ? config.slots : [],
    elements: Array.isArray(config.elements) ? config.elements : [],
    is_list_item: false,
    created_at: frame.created_at,
    status: frame.status
  };
}
// ────────────────────────────────────────────────────────────────────────────

export const apiService = {
  /**
   * Generate an AI background using Google Gemini Imagen 3
   */
  async generateBackground(prompt: string, width: number, height: number): Promise<{ image: string; prompt: string }> {
    if (isCentralApiEnabled()) {
      const job = await idSystemApi.ai.createGeneration(prompt, width, height);
      if (!job.output_image_url) {
        throw new Error(job.error_message || 'Backend chưa trả URL ảnh AI.');
      }
      return {
        image: job.output_image_url,
        prompt: job.prompt || prompt
      };
    }

    const res = await fetch('/api/frames/generate-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width, height })
    });
    
    if (!res.ok) {
      throw new Error('Failed to generate background image via API');
    }
    
    return res.json();
  },

  /**
   * Export complete composite PNG with slot holes and styles
   */
  async exportFrame(payload: FrameConfig): Promise<{ success: boolean; frame_id: string; image_url: string; name: string }> {
    const res = await fetch('/api/frames/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Export API request failed');
    }

    return res.json();
  },

  /**
   * Fetch all saved frame layouts from database
   * Client cache: 5 phút | CDN cache: 10 phút
   */
  async getFrames(category?: string): Promise<any[]> {
    const now = Date.now();
    if (!category && CLIENT_CACHE_TTL > 0 && framesCache && now - framesCache.timestamp < CLIENT_CACHE_TTL) {
      return framesCache.data;
    }

    if (isCentralApiEnabled()) {
      const data = (await idSystemApi.frames.list()).map(decodeCentralFrame);
      framesCache = { data, timestamp: now };
      return data;
    }

    const query = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(getWorkerApiUrl(`/frames${query}`));
    if (!res.ok) {
      throw new Error('Failed to fetch list of frames');
    }
    const rawData = await res.json();
    const data = Array.isArray(rawData) ? rawData.map(normalizeFrameUrls) : rawData;
    if (!category) {
      framesCache = { data, timestamp: now };
    }
    return data;
  },

  /**
   * Get unique categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const res = await fetch(getWorkerApiUrl('/categories'));
      if (!res.ok) return [];
      const data = await res.json();
      return data.categories || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch detailed frame layout config
   */
  async getFrame(frameId: string): Promise<any> {
    const cached = frameDetailCache.get(frameId);
    if (cached) return cached;

    if (isCentralApiEnabled()) {
      const data = decodeCentralFrame(await idSystemApi.frames.get(frameId));
      frameDetailCache.set(frameId, data);
      return data;
    }

    try {
      const res = await fetch(getWorkerApiUrl(`/frames/${frameId}`));
      if (res.ok) {
        const rawData = await res.json();
        const data = normalizeFrameUrls(rawData);
        frameDetailCache.set(frameId, data);
        return data;
      }
    } catch (e) {
      console.warn('API /frames/:id request failed, attempting direct recovery:', e);
    }

    const frames = await this.getFrames().catch(() => []);
    const indexRecord = frames.find((f: any) => f.id === frameId);
    if (indexRecord?.drive_file_id) {
      try {
        const directJsonRes = await fetch(`https://drive.google.com/uc?export=view&id=${indexRecord.drive_file_id}`);
        if (directJsonRes.ok) {
          const configJson = await directJsonRes.json();
          const merged = normalizeFrameUrls({
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
          frameDetailCache.set(frameId, merged);
          return merged;
        }
      } catch (err) {
        console.warn('Direct Google Drive JSON fetch failed:', err);
      }
    }

    if (indexRecord) {
      const fallback = normalizeFrameUrls({
        id: indexRecord.id,
        name: indexRecord.name,
        category: indexRecord.category,
        width: indexRecord.width,
        height: indexRecord.height,
        background_image_url: indexRecord.background_image_url,
        thumbnail_url: indexRecord.thumbnail_url,
        slots: indexRecord.slots || [],
        elements: indexRecord.elements || [],
        created_at: indexRecord.created_at
      });
      frameDetailCache.set(frameId, fallback);
      return fallback;
    }

    throw new Error(`Failed to load frame configuration: ${frameId}`);
  },

  /**
   * Get dynamic AI Settings
   */
  async getAISettings(): Promise<any> {
    if (getIdSystemSettings().apiBaseUrl) {
      return idSystemApi.ai.settings('frame_background');
    }

    const res = await fetch('/api/frames/ai-settings');
    if (!res.ok) {
      throw new Error('Failed to fetch AI Settings');
    }
    return res.json();
  },

  /**
   * Save dynamic AI Settings
   */
  async saveAISettings(settings: any): Promise<any> {
    if (isCentralApiEnabled()) {
      return idSystemApi.admin.saveAiSetting({
        type: settings.type || 'frame_background',
        name: settings.name || 'AI Frame Background',
        cost_credits: Number(settings.cost_credits || 1),
        provider: settings.provider || 'manual_worker',
        model: settings.model || undefined,
        status: settings.status || 'active'
      });
    }

    const res = await fetch('/api/frames/ai-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      throw new Error('Failed to save AI Settings');
    }
    return res.json();
  },

  /**
   * Save a new template
   */
  async createFrame(payload: any): Promise<any> {
    if (isCentralApiEnabled()) {
      assertNoBitmapDataUrls(payload);
      const frame = await idSystemApi.frames.create({
        name: payload.name,
        width: payload.width,
        height: payload.height,
        config_json: encodeFrameConfig(payload)
      });
      invalidateFramesCache();
      return { frame_id: frame.id, ...decodeCentralFrame(frame) };
    }

    assertNoBitmapDataUrls(payload);

    const res = await fetch(getWorkerApiUrl('/frames'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error('Lỗi tạo mẫu thiết kế mới');
    }
    invalidateFramesCache(); // Xóa cache để fetch lại data mới
    return res.json();
  },

  /**
   * Update an existing template
   */
  async updateFrame(payload: any): Promise<any> {
    if (isCentralApiEnabled()) {
      assertNoBitmapDataUrls(payload);
      const frame = await idSystemApi.frames.update(payload.id, {
        name: payload.name,
        width: payload.width,
        height: payload.height,
        config_json: encodeFrameConfig(payload)
      });
      invalidateFramesCache();
      return { frame_id: frame.id, ...decodeCentralFrame(frame) };
    }

    assertNoBitmapDataUrls(payload);

    const res = await fetch(getWorkerApiUrl('/frames'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      let errorMsg = 'Lỗi cập nhật cấu hình mẫu';
      try {
        const data = await res.json();
        if (data.error) errorMsg = data.error;
      } catch (e) {
        // ignore
      }
      throw new Error(errorMsg);
    }
    invalidateFramesCache(); // Xóa cache để fetch lại data mới
    return res.json();
  },

  /**
   * Delete a template
   */
  async deleteFrame(frameId: string, password?: string): Promise<any> {
    if (isCentralApiEnabled()) {
      const frame = await idSystemApi.frames.delete(frameId);
      invalidateFramesCache();
      return { frame_id: frame.id, ...decodeCentralFrame(frame) };
    }

    const res = await fetch(getWorkerApiUrl(`/frames?id=${frameId}&password=${encodeURIComponent(password || '')}`), {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error('Lỗi xóa mẫu thiết kế');
    }
    invalidateFramesCache(); // Xóa cache để fetch lại data mới
    return res.json();
  }
};
export default apiService;
