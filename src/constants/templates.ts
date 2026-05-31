export const STICKER_TEMPLATES = [
  {
    name: 'Neon Heart',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
  },
  {
    name: 'Sparkle Star',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2322d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  },
  {
    name: 'Camera Badge',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>'
  },
  {
    name: 'Cute Smile',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>'
  },
  {
    name: 'Growth Leaf',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-13.9.2"/><path d="M9 22v-4h4"/></svg>'
  },
  {
    name: 'Music Note',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
  }
];

export const PROMPT_PRESETS = [
  'Lưới Retro Cyberpunk tối với đèn neon tím hồng phát sáng',
  'Hình khối Pastel tối giản, bố cục trừu tượng, nền kem thanh lịch',
  'Khu vườn Ngọc Bích huyền bí, lá cây thảo mộc và điểm nhấn ánh sáng vàng',
  'Hoàng hôn Retro Vaporwave, phong cảnh núi chrome và hàng dừa',
  'Đá cẩm thạch đen thẩm mỹ với các đường vân vàng lấp lánh',
];

export const PRESETS = [
  { name: 'Landscape (1200x800)', w: 1200, h: 800 },
  { name: 'Portrait (800x1200)', w: 800, h: 1200 },
  { name: 'Square (1000x1000)', w: 1000, h: 1000 },
];

export const PAPER_SIZES = [
  { name: 'Strip 2x6 (Dải ảnh cực hot)', id: '2x6', width: 600, height: 1800, ratio: 1 / 3 },
  { name: 'Khổ 4x6 (Chuẩn)', id: '4x6', width: 1200, height: 1800, ratio: 2 / 3 },
  { name: 'Khổ 5x7', id: '5x7', width: 1500, height: 2100, ratio: 5 / 7 },
  { name: 'Khổ 6x9', id: '6x9', width: 1800, height: 2700, ratio: 6 / 9 },
  { name: 'Tùy chỉnh (Custom)', id: 'custom', width: 1200, height: 800, ratio: 1.5 }
];

export const GOOGLE_FONTS = [
  { name: 'Hanken Grotesk (Hiện đại)', value: "'Hanken Grotesk', sans-serif" },
  { name: 'Pacifico (Nghệ thuật)', value: "'Pacifico', cursive" },
  { name: 'Great Vibes (Mềm mại)', value: "'Great Vibes', cursive" },
  { name: 'Outfit (Sắc nét)', value: "'Outfit', sans-serif" },
  { name: 'Playfair Display (Cổ điển)', value: "'Playfair Display', serif" },
  { name: 'Bungee (Cá tính)', value: "'Bungee', sans-serif" }
];

export const BACKGROUND_PRESETS = [
  { name: 'Trắng tinh khôi', value: '#ffffff', type: 'color' },
  { name: 'Navy Precision', value: '#111c2d', type: 'color' },
  { name: 'Hồng ngọt ngào', value: '#fff0f3', type: 'color' },
  { name: 'Xanh thanh khiết', value: '#e7eeff', type: 'color' },
  { name: 'Vàng nắng ấm', value: '#fefae0', type: 'color' },
  { name: 'Hoàng hôn rực rỡ', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', type: 'gradient' },
  { name: 'Cầu vồng Vaporwave', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', type: 'gradient' },
  { name: 'Neon Deep Cyan', value: 'linear-gradient(135deg, #0058be 0%, #2170e4 100%)', type: 'gradient' },
  { name: 'Vũ trụ đêm', value: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)', type: 'gradient' }
];

