import { FrameConfig } from '../types/canvas';
import { isBitmapDataUrl } from '../utils/cloudinary';

// ─── Client-side in-memory cache ────────────────────────────────────────────
const CLIENT_CACHE_TTL = 5 * 60 * 1000;
let framesCache: { data: any[]; timestamp: number } | null = null;
const frameDetailCache = new Map<string, any>();

function invalidateFramesCache() {
  framesCache = null;
  frameDetailCache.clear();
}

function assertNoBitmapDataUrls(payload: any) {
  if (isBitmapDataUrl(payload.backgroundImageUrl)) {
    throw new Error('Anh nen van la base64. Can upload len Cloudinary truoc khi luu mau.');
  }

  const badElement = (payload.elements || []).find((element: any) => isBitmapDataUrl(element?.content));
  if (badElement) {
    throw new Error(`Layer "${badElement.id || badElement.fileName || 'image'}" van la base64. Can upload len Cloudinary truoc khi luu mau.`);
  }
}
// ────────────────────────────────────────────────────────────────────────────

export const apiService = {
  /**
   * Generate an AI background using Google Gemini Imagen 3
   */
  async generateBackground(prompt: string, width: number, height: number): Promise<{ image: string; prompt: string }> {
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
  async getFrames(): Promise<any[]> {
    const now = Date.now();
    if (CLIENT_CACHE_TTL > 0 && framesCache && now - framesCache.timestamp < CLIENT_CACHE_TTL) {
      return framesCache.data;
    }
    const res = await fetch(`/api/frames`);
    if (!res.ok) {
      throw new Error('Failed to fetch list of frames');
    }
    const data = await res.json();
    framesCache = { data, timestamp: now };
    return data;
  },

  /**
   * Fetch detailed frame layout config
   */
  async getFrame(frameId: string): Promise<any> {
    const cached = frameDetailCache.get(frameId);
    if (cached) return cached;

    const res = await fetch(`/api/frames/${frameId}`);
    if (!res.ok) {
      throw new Error(`Failed to load frame configuration: ${frameId}`);
    }
    const data = await res.json();
    frameDetailCache.set(frameId, data);
    return data;
  },

  /**
   * Get dynamic AI Settings
   */
  async getAISettings(): Promise<any> {
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
    assertNoBitmapDataUrls(payload);

    const res = await fetch('/api/frames', {
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
    assertNoBitmapDataUrls(payload);

    const res = await fetch('/api/frames', {
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
    const res = await fetch(`/api/frames?id=${frameId}&password=${encodeURIComponent(password || '')}`, {
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
