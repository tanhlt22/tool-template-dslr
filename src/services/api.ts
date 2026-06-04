import { FrameConfig } from '../types/canvas';

// ─── Client-side in-memory cache ────────────────────────────────────────────
// TTL 5 phút — hợp lí vì template ít thay đổi, CDN đã cache 10 phút ở trên
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 phút (ms)
let framesCache: { data: any[]; timestamp: number } | null = null;

function invalidateFramesCache() {
  framesCache = null;
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
    if (framesCache && now - framesCache.timestamp < CLIENT_CACHE_TTL) {
      return framesCache.data;
    }
    const res = await fetch('/api/frames');
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
    const res = await fetch(`/api/frames/${frameId}`);
    if (!res.ok) {
      throw new Error(`Failed to load frame configuration: ${frameId}`);
    }
    return res.json();
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
    const res = await fetch('/api/frames', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error('Lỗi cập nhật cấu hình mẫu');
    }
    invalidateFramesCache(); // Xóa cache để fetch lại data mới
    return res.json();
  },

  /**
   * Delete a template
   */
  async deleteFrame(frameId: string): Promise<any> {
    const res = await fetch(`/api/frames?id=${frameId}`, {
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
