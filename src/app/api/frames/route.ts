import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Hardcoded DEFAULT_TEMPLATES from legacy Python backend
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

// Fallback in-memory database
const localFramesDb: Record<string, any> = {};

export async function GET() {
  let dbFrames: any[] = [];
  
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data, error } = await supabase
        .from('frames')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[Frames API] Supabase query error details:', error);
      } else if (data) {
        dbFrames = data;
      }
    } catch (err: any) {
      console.error('[Frames API] Failed to fetch frames from Supabase, error details:', err.message || err);
    }
  }

  if (dbFrames.length === 0) {
    dbFrames = Object.values(localFramesDb);
    dbFrames.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Prepend default templates
  return NextResponse.json([...DEFAULT_TEMPLATES, ...dbFrames]);
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
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
      created_at: createdAt
    };

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Insert record
        const { data, error } = await supabase
          .from('frames')
          .insert([record])
          .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
          return NextResponse.json({
            success: true,
            frame_id: frameId,
            image_url: payload.backgroundImageUrl || '',
            name: record.name
          });
        }
      } catch (err: any) {
        console.error('[Frames API] Supabase save error:', err.message);
        return NextResponse.json({ error: `Lỗi lưu Supabase: ${err.message}` }, { status: 500 });
      }
    }

    // Save to local fallback cache
    localFramesDb[frameId] = record;
    return NextResponse.json({
      success: true,
      frame_id: frameId,
      image_url: payload.backgroundImageUrl || '',
      name: record.name
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi lưu cấu hình khung ảnh' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const payload = await req.json();
    const { id, name, width, height, backgroundPrompt, backgroundImageUrl, slots, elements } = payload;
    
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID khung ảnh cần cập nhật' }, { status: 400 });
    }

    const updatedRecord = {
      name: name || 'Untitled Premium Layout',
      width: Number(width) || 1200,
      height: Number(height) || 1800,
      background_prompt: backgroundPrompt || '',
      background_image_url: backgroundImageUrl || null,
      slots: slots || [],
      elements: elements || [],
      updated_at: new Date().toISOString()
    };

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { error } = await supabase
          .from('frames')
          .update(updatedRecord)
          .eq('id', id);

        if (error) throw error;
      } catch (err: any) {
        console.error('[Frames API] Supabase update error:', err.message);
        return NextResponse.json({ error: `Lỗi cập nhật Supabase: ${err.message}` }, { status: 500 });
      }
    }

    if (localFramesDb[id]) {
      localFramesDb[id] = { ...localFramesDb[id], ...updatedRecord };
    }

    return NextResponse.json({ success: true, message: 'Đã cập nhật khung ảnh thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật khung ảnh' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID khung ảnh cần xóa' }, { status: 400 });
    }

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { error } = await supabase
          .from('frames')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (err: any) {
        console.error('[Frames API] Supabase delete error:', err.message);
      }
    }

    if (localFramesDb[id]) {
      delete localFramesDb[id];
    }

    return NextResponse.json({ success: true, message: 'Đã xóa khung ảnh thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xóa khung ảnh' }, { status: 500 });
  }
}
