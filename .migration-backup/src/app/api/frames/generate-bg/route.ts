import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const DEFAULT_GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Suffix optimizer helper
function getOptimizedSuffix(prompt: string, currentSuffix: string): string {
  const pLower = prompt.toLowerCase();

  const y2kGinghamSuffix = ", cute pastel blue and white gingham checkered pattern background, sweet Y2K ribbon bows, nostalgic stars with half-tone shading, bubble lettering, cute illustration stickers, high quality, professional photobooth layout, no plastic flowers, no watermarks";
  const vintageSuffix = ", classic vintage postal stamp airmail envelope style, kraft paper card texture, serrated stamp outline borders, red and blue diagonal stripes on edges, peace dove stamp watermark, old nostalgia theme, highly detailed, beautiful retro aesthetic";
  const christmasSuffix = ", cozy festive Christmas holiday frame, deep red gradient background, warm winter glowing bokeh sparkles, beautiful snow flakes, cute gingerbread man plushies, metallic gold 3D letters, high-end celebratory illustration";
  const netflixSuffix = ", modern movie streaming service UI overlay, dark theme cinema layout, red logos on the top left of slots, red progress bar watching indicator, Xem Ngay and Tap Moi buttons, clean white text, high fidelity user interface design";
  const filmSuffix = ", analog vintage camera film negative strip design, dark navy blue borders, frame numbers like 76 or 29 printed in white along dividers, Take Your Memory branding, cinematic retro aesthetic, perfect film edges";
  const weddingSuffix = ", ultra-modern 2026 premium wedding backdrop, minimal sleek elegant aesthetic, soft pastel gradient mesh, smooth liquid blurred colors, subtle cinematic analog film grain texture, high-end fine art editorial photography, contemporary clean design, thin classy minimalist gold borders on the very edges, completely clean uncluttered spacious center area, high resolution, award-winning contemporary event styling, natural soft diffused lighting, organic high-fashion atmosphere, no retro elements, no clip-art, no cheap plastic flowers, no text, no watermarks, no camera icons, no grid lines.";

  const isDefaultOrEmpty = (
    !currentSuffix ||
    currentSuffix.includes("wedding backdrop") ||
    currentSuffix.includes("pastel gradient mesh")
  );

  if (isDefaultOrEmpty) {
    if (pLower.includes("y2k") || pLower.includes("gingham") || pLower.includes("check") || pLower.includes("kawaii") || pLower.includes("ribbon")) {
      return y2kGinghamSuffix;
    } else if (pLower.includes("stamp") || pLower.includes("postal") || pLower.includes("mail") || pLower.includes("dove") || pLower.includes("vintage") || pLower.includes("retro")) {
      return vintageSuffix;
    } else if (pLower.includes("christmas") || pLower.includes("holiday") || pLower.includes("winter") || pLower.includes("gingerbread")) {
      return christmasSuffix;
    } else if (pLower.includes("netflix") || pLower.includes("movie") || pLower.includes("ui") || pLower.includes("streaming")) {
      return netflixSuffix;
    } else if (pLower.includes("film") || pLower.includes("negative") || pLower.includes("strip") || pLower.includes("analog") || pLower.includes("camera")) {
      return filmSuffix;
    } else {
      return weddingSuffix;
    }
  }

  return currentSuffix;
}

export async function POST(req: Request) {
  try {
    const { prompt, width, height } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // 1. Get AI Settings from Supabase
    let modelName = 'imagen-3.0-generate-002';
    let apiKey = DEFAULT_GEMINI_API_KEY;
    let prefix = '';
    let rawSuffix = '';
    let aspectRatio = '3:2'; // standard horizontal, or 3:4, etc.

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data } = await supabase.from('ai_settings').select('*').limit(1).single();
        if (data) {
          modelName = data.model_name || modelName;
          apiKey = data.gemini_api_key || apiKey;
          prefix = data.prompt_prefix || prefix;
          rawSuffix = data.prompt_suffix || rawSuffix;
          aspectRatio = data.aspect_ratio || aspectRatio;
        }
      } catch (err) {
        console.warn('[Gemini API] Failed to fetch settings from Supabase, using defaults.');
      }
    }

    // 2. Build optimized full prompt
    const optimizedSuffix = getOptimizedSuffix(prompt, rawSuffix);
    const fullPrompt = `${prefix}${prompt}${optimizedSuffix}`.trim();

    // 3. Convert aspect ratio from setting value to Gemini accepted string
    // Standard Gemini options: "1:1", "3:4", "4:3", "9:16", "16:9"
    let resolvedAspectRatio = '3:2';
    if (aspectRatio === '1.5' || aspectRatio === '3:2') resolvedAspectRatio = '3:2';
    else if (aspectRatio === '0.67' || aspectRatio === '2:3') resolvedAspectRatio = '3:4'; // close enough to 2:3
    else if (aspectRatio === '1.0' || aspectRatio === '1:1') resolvedAspectRatio = '1:1';
    else if (aspectRatio === '1.77' || aspectRatio === '16:9') resolvedAspectRatio = '16:9';
    else if (aspectRatio === '0.56' || aspectRatio === '9:16') resolvedAspectRatio = '9:16';

    if (apiKey) {
      try {
        console.log(`[Gemini REST] Calling Imagen model: ${modelName} | Prompt: ${fullPrompt}`);
        
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateImages?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: fullPrompt,
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: resolvedAspectRatio
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData?.generatedImages?.[0]?.image?.imageBytes) {
            const base64Bytes = resData.generatedImages[0].image.imageBytes;
            return NextResponse.json({
              image: `data:image/png;base64,${base64Bytes}`,
              prompt: fullPrompt
            });
          }
        } else {
          const errText = await response.text();
          console.error('[Gemini REST] Imagen error response:', errText);
        }
      } catch (geminiError: any) {
        console.error('[Gemini REST] Exception thrown during image generation:', geminiError.message);
      }
    }

    // 4. Fallback: return a beautiful mock generative canvas background as base64
    console.warn('[Gemini REST] Falling back to client mock gradient generation.');
    
    // We can return a beautiful soft pastel gradient mesh to make it look excellent even in offline fallback mode
    const fallbackImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${width || 1200}" height="${height || 800}" viewBox="0 0 ${width || 1200} ${height || 800}"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%230f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:%23020617;stop-opacity:1" /></linearGradient></defs><rect width="100%" height="100%" fill="url(%23grad)" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="Outfit, sans-serif" font-size="28" opacity="0.3">${prompt.toUpperCase()} (MOCK AI BACKGROUND)</text></svg>`;

    return NextResponse.json({
      image: fallbackImage,
      prompt: fullPrompt
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tạo ảnh nền AI' }, { status: 500 });
  }
}
