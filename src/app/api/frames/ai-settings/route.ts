import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Fallback in-memory cache for AI Settings
let localAISettings = {
  model_name: 'imagen-3.0-generate-002',
  gemini_api_key: '',
  prompt_prefix: '',
  prompt_suffix: ', ultra-modern 2026 premium wedding backdrop, minimal sleek elegant aesthetic, soft pastel gradient mesh, smooth liquid blurred colors, subtle cinematic analog film grain texture, high-end fine art editorial photography, contemporary clean design, thin classy minimalist gold borders on the very edges, completely clean uncluttered spacious center area, high resolution, award-winning contemporary event styling, natural soft diffused lighting, organic high-fashion atmosphere, no retro elements, no clip-art, no cheap plastic flowers, no text, no watermarks, no camera icons, no grid lines.',
  aspect_ratio: '1.5'
};

export async function GET() {
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data, error } = await supabase.from('ai_settings').select('*').limit(1).single();
      
      if (!error && data) {
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn('[AI Settings API] Failed to fetch from Supabase, using local settings cache.');
    }
  }

  return NextResponse.json(localAISettings);
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Validate schema
    const settingsRecord = {
      model_name: payload.model_name || 'imagen-3.0-generate-002',
      gemini_api_key: payload.gemini_api_key || '',
      prompt_prefix: payload.prompt_prefix || '',
      prompt_suffix: payload.prompt_suffix || '',
      aspect_ratio: payload.aspect_ratio || '1.5'
    };

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        // Supabase upsert requires unique identifiers or specific table configurations.
        // Usually, we can use a static key/id like 'default_config' to make upsert simple,
        // or check if a record exists and insert/update.
        const { data: existingRecords } = await supabase.from('ai_settings').select('id').limit(1);
        
        let result;
        if (existingRecords && existingRecords.length > 0) {
          // Update the first existing configuration
          const { data, error } = await supabase
            .from('ai_settings')
            .update(settingsRecord)
            .eq('id', existingRecords[0].id)
            .select();
          if (error) throw error;
          result = data?.[0];
        } else {
          // Insert first configuration
          const { data, error } = await supabase
            .from('ai_settings')
            .insert([settingsRecord])
            .select();
          if (error) throw error;
          result = data?.[0];
        }

        if (result) {
          return NextResponse.json(result);
        }
      } catch (err: any) {
        console.error('[AI Settings API] Supabase upsert error:', err.message);
      }
    }

    // Local fallback
    localAISettings = { ...localAISettings, ...settingsRecord };
    return NextResponse.json(localAISettings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi lưu AI Settings' }, { status: 500 });
  }
}
