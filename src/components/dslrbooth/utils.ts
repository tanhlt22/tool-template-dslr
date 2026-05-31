import { Template } from './types';

export const TEMPLATES: Template[] = [
  {
    id: 1,
    name: 'Rustic Lavender Blossom',
    desc: 'Hương vị đồng quê Pháp, nét vẽ lavender tinh tế & lãng mạn',
    bgType: 'gradient',
    bgGrad: 'linear-gradient(135deg, #fff5f8 0%, #f3e8ff 100%)',
    borderColor: '#c084fc',
    textColor: '#6b21a8',
    calligraphyFont: 'Pacifico',
    accentColor: '#e9d5ff',
    slots: [
      { id: 1, x: 80, y: 80, w: 480, h: 360 },
      { id: 2, x: 640, y: 80, w: 480, h: 360 },
      { id: 3, x: 80, y: 500, w: 480, h: 360 },
      { id: 4, x: 640, y: 500, w: 480, h: 360 },
    ],
    qr: { x: 980, y: 920, w: 140, h: 140 }
  },
  {
    id: 2,
    name: 'Luxury Royal Gold',
    desc: 'Hoàng gia quý phái với viền kim loại vàng bóng & nền đá obsidian huyền bí',
    bgType: 'color',
    bgColor: '#0b0f19',
    borderColor: '#fbbf24',
    textColor: '#f59e0b',
    calligraphyFont: 'Great Vibes',
    accentColor: '#fef3c7',
    slots: [
      { id: 1, x: 100, y: 100, w: 460, h: 340 },
      { id: 2, x: 640, y: 100, w: 460, h: 340 },
      { id: 3, x: 100, y: 500, w: 460, h: 340 },
      { id: 4, x: 640, y: 500, w: 460, h: 340 },
    ],
    qr: { x: 990, y: 910, w: 130, h: 130 }
  },
  {
    id: 3,
    name: 'Minimalist Modern Teal',
    desc: 'Xu hướng trẻ trung phong cách Hàn Quốc, viền bạc hà thanh mát tối giản',
    bgType: 'gradient',
    bgGrad: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    borderColor: '#34d399',
    textColor: '#047857',
    calligraphyFont: 'Outfit',
    accentColor: '#d1fae5',
    slots: [
      { id: 1, x: 80, y: 100, w: 490, h: 330 },
      { id: 2, x: 630, y: 100, w: 490, h: 330 },
      { id: 3, x: 80, y: 500, w: 490, h: 330 },
      { id: 4, x: 630, y: 500, w: 490, h: 330 },
    ],
    qr: { x: 1000, y: 900, w: 120, h: 120 }
  }
];

export const formatDate = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const generateDslrboothId = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({length: 25}, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};
