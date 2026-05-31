import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'frames-bucket';

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
      slots: payload.slots || [],
      elements: payload.elements || [],
      created_at: createdAt
    };

    let imageUrl = payload.backgroundImageUrl || '';

    // If a pre-composited final image is sent from the client-side canvas, upload it directly to Supabase Storage!
    if (payload.finalImageBase64 && SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Extract base64 bytes
        const base64Data = payload.finalImageBase64.replace(/^data:image\/\w+;base64,/, '');
        const fileBuffer = Buffer.from(base64Data, 'base64');
        const filename = `frame_${frameId}.png`;

        // Upload to bucket
        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(filename, fileBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (!uploadError) {
          const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filename);
          imageUrl = data.publicUrl;
        } else {
          console.error('[Export API] Storage upload error:', uploadError);
        }
      } catch (storageErr: any) {
        console.error('[Export API] Storage exception:', storageErr.message);
      }
    }

    // Save configuration record to Supabase frames database table
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const dbRecord = {
          ...record,
          background_image_url: imageUrl
        };

        const { error: dbError } = await supabase
          .from('frames')
          .insert([dbRecord]);

        if (dbError) throw dbError;
      } catch (dbErr: any) {
        console.error('[Export API] Database insert exception:', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      frame_id: frameId,
      image_url: imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="100%" height="100%" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff">No Image</text></svg>',
      name: record.name
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xuất và lưu khung ảnh' }, { status: 500 });
  }
}
