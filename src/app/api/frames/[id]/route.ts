import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Hardcoded DEFAULT_TEMPLATES from route.ts
const DEFAULT_TEMPLATES = [
  {
    id: "template_korean_strip",
    name: "Dải Ảnh Hàn Quốc Cute (Strip 2x6)",
    width: 600,
    height: 1800,
    background_prompt: "Korean Cute Strip, pink pastel color, hearts background",
    slots: [
      { id: "slot_k1", x: 50, y: 150, width: 500, height: 380, rotation: 0, order: 1 },
      { id: "slot_k2", x: 50, y: 580, width: 500, height: 380, rotation: 0, order: 2 },
      { id: "slot_k3", x: 50, y: 1010, width: 500, height: 380, rotation: 0, order: 3 }
    ],
    elements: [
      {
        id: "text_ktitle",
        type: "text",
        content: "KOREAN MEMORIES",
        x: 50,
        y: 1450,
        width: 500,
        height: 60,
        rotation: 0,
        style: {
          color: "#ec4899",
          fontSize: 32,
          fontFamily: "'Pacifico', cursive",
          fontWeight: "bold",
          order: 0
        }
      },
      {
        id: "sticker_kheart",
        type: "icon",
        content: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23ec4899\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\"/></svg>",
        x: 380,
        y: 1430,
        width: 60,
        height: 60,
        rotation: -15,
        style: { order: 1 }
      },
      {
        id: "qr_kcode",
        type: "qr",
        content: "https://lumibooth.com/share/korean",
        x: 230,
        y: 1580,
        width: 140,
        height: 140,
        rotation: 0,
        style: { order: 2 }
      }
    ],
    created_at: "2026-05-30T10:00:00Z"
  },
  {
    id: "template_wedding_luxury",
    name: "Luxury Gold Wedding (Khổ 4x6)",
    width: 1200,
    height: 1800,
    background_prompt: "Elegant Navy background with gold luxury lines",
    slots: [
      { id: "slot_w1", x: 80, y: 120, width: 480, height: 360, rotation: 0, order: 1 },
      { id: "slot_w2", x: 640, y: 120, width: 480, height: 360, rotation: 0, order: 2 },
      { id: "slot_w3", x: 80, y: 540, width: 480, height: 360, rotation: 0, order: 3 },
      { id: "slot_w4", x: 640, y: 540, width: 480, height: 360, rotation: 0, order: 4 }
    ],
    elements: [
      {
        id: "text_wtitle1",
        type: "text",
        content: "HAPPY WEDDING",
        x: 80,
        y: 1560,
        width: 800,
        height: 80,
        rotation: 0,
        style: {
          color: "#dfb26b",
          fontSize: 48,
          fontFamily: "'Great Vibes', cursive",
          fontWeight: "bold",
          order: 0
        }
      },
      {
        id: "text_wtitle2",
        type: "text",
        content: "MINH & LAN • 30.05.2026",
        x: 80,
        y: 1660,
        width: 800,
        height: 40,
        rotation: 0,
        style: {
          color: "#ffffff",
          fontSize: 20,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: "bold",
          order: 1
        }
      },
      {
        id: "qr_wcode",
        type: "qr",
        content: "https://lumibooth.com/share/wedding",
        x: 920,
        y: 1530,
        width: 180,
        height: 180,
        rotation: 0,
        style: { order: 2 }
      }
    ],
    created_at: "2026-05-30T10:01:00Z"
  },
  {
    id: "template_vaporwave_neon",
    name: "Neon Vaporwave Landscape (1200x800)",
    width: 1200,
    height: 800,
    background_prompt: "Vaporwave retro sunset landscape with neon mountains",
    slots: [
      { id: "slot_v1", x: 80, y: 120, width: 480, height: 360, rotation: -5, order: 1 },
      { id: "slot_v2", x: 640, y: 120, width: 480, height: 360, rotation: 5, order: 2 }
    ],
    elements: [
      {
        id: "text_vtitle",
        type: "text",
        content: "CYBERPUNK RETRO NIGHT",
        x: 80,
        y: 620,
        width: 1040,
        height: 80,
        rotation: 0,
        style: {
          color: "#22d3ee",
          fontSize: 38,
          fontFamily: "'Bungee', sans-serif",
          fontWeight: "bold",
          order: 0
        }
      },
      {
        id: "sticker_vsparkle",
        type: "icon",
        content: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%2322d3ee\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/></svg>",
        x: 950,
        y: 60,
        width: 80,
        height: 80,
        rotation: 15,
        style: { order: 1 }
      }
    ],
    created_at: "2026-05-30T10:02:00Z"
  }
];

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const frameId = params.id;

  // 1. Check default templates first
  const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.id === frameId);
  if (defaultTemplate) {
    return NextResponse.json(defaultTemplate);
  }

  // 2. Fetch from Supabase
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data, error } = await supabase
        .from('frames')
        .select('*')
        .eq('id', frameId)
        .limit(1)
        .single();

      if (!error && data) {
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn(`[Frames API] Failed to fetch frame ${frameId} from Supabase, using fallback.`);
    }
  }

  // 3. Optional: Not found response
  return NextResponse.json(
    { error: `Frame layout config not found for ID: ${frameId}` },
    { status: 404 }
  );
}
