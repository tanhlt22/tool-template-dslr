import { FrameSlot, FrameElement } from '../types/canvas';
import JSZip from 'jszip';
import { formatDate, generateDslrboothId } from '../components/dslrbooth/utils';

/**
 * Renders a background (color, gradient, or image) onto a canvas context.
 */
export async function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: {
    backgroundType: 'color' | 'gradient' | 'ai';
    backgroundColor: string;
    bgGradient: string;
    bgImageUrl: string | null;
  }
): Promise<void> {
  const { backgroundType, backgroundColor, bgGradient, bgImageUrl } = options;

  // Base color or gradient
  if (backgroundType === 'gradient' && bgGradient) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = backgroundColor || '#0f172a';
    ctx.fillRect(0, 0, width, height);
  }

  // Draw background image if set
  if (bgImageUrl) {
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0, width, height);
        resolve(null);
      };
      bgImg.onerror = () => resolve(null);
      bgImg.src = bgImageUrl;
    });
  }
}

/**
 * Renders all visible image elements at their canvas positions.
 */
export async function renderImageElements(
  ctx: CanvasRenderingContext2D,
  elements: FrameElement[]
): Promise<void> {
  const imageElements = elements.filter(e => e.type === 'image' && e.visible !== false && e.content);
  for (const elem of imageElements) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      img.onload = () => {
        ctx.save();
        const cx = elem.x + elem.width / 2;
        const cy = elem.y + elem.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate((elem.rotation * Math.PI) / 180);
        ctx.drawImage(img, -elem.width / 2, -elem.height / 2, elem.width, elem.height);
        ctx.restore();
        resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = elem.content;
    });
  }
}

/**
 * Renders all visible elements sequentially to preserve z-order.
 */
export async function renderAllElements(
  ctx: CanvasRenderingContext2D,
  elements: FrameElement[]
): Promise<void> {
  for (const elem of elements.filter(e => e.visible !== false)) {
    ctx.save();
    const cx = elem.x + elem.width / 2;
    const cy = elem.y + elem.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((elem.rotation * Math.PI) / 180);

    if (elem.type === 'text') {
      ctx.font = `bold ${elem.style?.fontSize || 24}px ${elem.style?.fontFamily || 'Outfit'}, Outfit, sans-serif`;
      ctx.fillStyle = elem.style?.color || '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(elem.content, 0, 0);
      ctx.restore();
    } else if (elem.type === 'icon' || elem.type === 'image') {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, -elem.width / 2, -elem.height / 2, elem.width, elem.height);
          ctx.restore();
          resolve();
        };
        img.onerror = () => {
          ctx.restore();
          resolve();
        };
        img.src = elem.content;
      });
    } else if (elem.type === 'qr') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-elem.width / 2, -elem.height / 2, elem.width, elem.height);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-elem.width / 2 + 10, -elem.height / 2 + 10, 30, 30);
      ctx.fillRect(elem.width / 2 - 40, -elem.height / 2 + 10, 30, 30);
      ctx.fillRect(-elem.width / 2 + 10, elem.height / 2 - 40, 30, 30);
      ctx.fillRect(elem.width / 2 - 30, elem.height / 2 - 30, 15, 15);
      ctx.restore();
    } else {
      ctx.restore();
    }
  }
}

/**
 * Punches out slot areas using destination-out composite operation.
 */
export function punchSlotHoles(
  ctx: CanvasRenderingContext2D,
  slots: FrameSlot[],
  useRoundRect = false
): void {
  ctx.globalCompositeOperation = 'destination-out';
  for (const slot of slots.filter(s => s.visible !== false)) {
    ctx.save();
    const cx = slot.x + slot.width / 2;
    const cy = slot.y + slot.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(((slot.rotation || 0) * Math.PI) / 180);
    ctx.fillStyle = 'black';
    if (useRoundRect) {
      ctx.beginPath();
      ctx.roundRect(-slot.width / 2, -slot.height / 2, slot.width, slot.height, 8);
      ctx.fill();
    } else {
      ctx.fillRect(-slot.width / 2, -slot.height / 2, slot.width, slot.height);
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Generates a simulated gradient background (offline mode fallback).
 */
export function simulateLocalBackground(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height) * 0.7);
  grad.addColorStop(0, '#1e1b4b');
  grad.addColorStop(1, '#090514');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
  ctx.lineWidth = 1;
  const size = 50;
  for (let x = 0; x < width; x += size) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += size) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  return canvas.toDataURL();
}

/**
 * Generates a full composite PNG base64 for export.
 */
export async function generateClientBase64(
  width: number,
  height: number,
  slots: FrameSlot[],
  elements: FrameElement[],
  bgOptions: {
    backgroundType: 'color' | 'gradient' | 'ai';
    backgroundColor: string;
    bgGradient: string;
    bgImageUrl: string | null;
  }
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  await renderBackground(ctx, width, height, bgOptions);

  // Punch slot holes
  punchSlotHoles(ctx, slots, true);

  // Draw elements
  ctx.globalCompositeOperation = 'source-over';
  await renderAllElements(ctx, elements);

  return canvas.toDataURL('image/png');
}

/**
 * Generates a DSLRbooth ZIP file (background.jpg + overlay.png + template.xml + template.json).
 */
export async function generateDslrboothZip(
  width: number,
  height: number,
  slots: FrameSlot[],
  elements: FrameElement[],
  frameName: string,
  bgOptions: {
    backgroundType: 'color' | 'gradient' | 'ai';
    backgroundColor: string;
    bgGradient: string;
    bgImageUrl: string | null;
  }
): Promise<Blob> {
  const zip = new JSZip();

  // A. background.jpg
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext('2d');
  if (bgCtx) {
    await renderBackground(bgCtx, width, height, bgOptions);
    await renderImageElements(bgCtx, elements);
  }
  const bgBlob = await new Promise<Blob | null>(res => bgCanvas.toBlob(res, 'image/jpeg', 0.95));
  if (bgBlob) zip.file('background.jpg', bgBlob);

  // B. overlay.png — render frame elements then punch out slots
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  const overCtx = overlayCanvas.getContext('2d');
  if (overCtx) {
    await renderAllElements(overCtx, elements);
    punchSlotHoles(overCtx, slots);
  }
  const overBlob = await new Promise<Blob | null>(res => overlayCanvas.toBlob(res, 'image/png'));
  if (overBlob) zip.file('overlay.png', overBlob);

  // C. template.json
  const templateJson = {
    width,
    height,
    background: 'background.jpg',
    overlay: 'overlay.png',
    photos: slots.filter(s => s.visible !== false).map((s, idx) => ({
      id: s.order || (idx + 1),
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
      rotation: s.rotation || 0
    })),
    qrcode: null
  };
  zip.file('template.json', JSON.stringify(templateJson, null, 2));

  // D. template.xml (DSLRbooth compliance format)
  const xmlDate = formatDate();
  const xmlId = generateDslrboothId();
  let xmlStr = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xmlStr += `<Template Name="dslrbooth_${frameName.replace(/\s+/g, '_')}" Width="${width}" Height="${height}" Dimensions="0" Resolution="300" BackgroundColor="#FFFFFFFF" print_2_per_page="False" PrintToSecondaryPrinter="False" LastSavedDate="${xmlDate}" Id="${xmlId}" IsLegacy="False" OriginalDevice="DESKTOP-LUMIBOOTH">\n`;
  xmlStr += `  <Elements>\n`;
  xmlStr += `    <Image Name="Background" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" Width="${width}" Height="${height}" Top="0" Left="0" ImagePath="background.jpg" KeepAspect="True" Thickness="0" StrokeColor="#FF000000" ZIndex="0" Rotation="0" />\n`;

  slots.filter(s => s.visible !== false).forEach((s, idx) => {
    xmlStr += `    <Photo Name="Photo ${s.order || (idx + 1)}" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" Width="${s.width}" Height="${s.height}" Top="${s.y}" Left="${s.x}" ImagePath="" KeepAspect="False" Thickness="0" StrokeColor="#FF000000" PhotoNumber="${s.order || (idx + 1)}" ZIndex="${idx + 1}" />\n`;
  });

  const overlayZIndex = slots.length + 1;
  xmlStr += `    <Image Name="Overlay" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" Width="${width}" Height="${height}" Top="0" Left="0" ImagePath="overlay.png" KeepAspect="True" Thickness="0" StrokeColor="#FF000000" ZIndex="${overlayZIndex}" Rotation="0" />\n`;
  xmlStr += `  </Elements>\n`;
  xmlStr += `</Template>`;
  zip.file('template.xml', xmlStr);

  return await zip.generateAsync({ type: 'blob' });
}
