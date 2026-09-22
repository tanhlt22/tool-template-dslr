import { FrameSlot, FrameElement } from '../types/canvas';
import JSZip from 'jszip';
import { formatDate, generateDslrboothId } from '../components/dslrbooth/utils';
import QRCode from 'qrcode';

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
  },
  elements?: FrameElement[]
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

  // Draw background image if set, ONLY if it is not present in the elements array as a layer
  const hasBgFrameLayer = elements?.some(e => e.id.startsWith('background_frame'));
  if (bgImageUrl && !hasBgFrameLayer) {
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
        const theta = (elem.rotation || 0) * Math.PI / 180;
        const cx = elem.x + (elem.width / 2) * Math.cos(theta) - (elem.height / 2) * Math.sin(theta);
        const cy = elem.y + (elem.width / 2) * Math.sin(theta) + (elem.height / 2) * Math.cos(theta);
        ctx.translate(cx, cy);
        ctx.rotate(theta);
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
    const theta = (elem.rotation || 0) * Math.PI / 180;
    const cx = elem.x + (elem.width / 2) * Math.cos(theta) - (elem.height / 2) * Math.sin(theta);
    const cy = elem.y + (elem.width / 2) * Math.sin(theta) + (elem.height / 2) * Math.cos(theta);
    ctx.translate(cx, cy);
    ctx.rotate(theta);

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
    const theta = (slot.rotation || 0) * Math.PI / 180;
    const cx = slot.x + (slot.width / 2) * Math.cos(theta) - (slot.height / 2) * Math.sin(theta);
    const cy = slot.y + (slot.width / 2) * Math.sin(theta) + (slot.height / 2) * Math.cos(theta);
    ctx.translate(cx, cy);
    ctx.rotate(theta);
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

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  await renderBackground(ctx, width, height, bgOptions, elements);

  // Punch holes in the background so slots are transparent
  punchSlotHoles(ctx, slots, false);

  // Draw elements on top of holes so they are never cut
  ctx.globalCompositeOperation = 'source-over';
  await renderAllElements(ctx, elements);

  return canvas.toDataURL('image/png');
}

/**
 * Generates a DSLRbooth ZIP file (background.jpg + overlay.png + preview.png + template.xml).
 * Tuân thủ format chuẩn DSLRbooth: không có template.json, có preview.png, QrCode element trong XML.
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
  },
  resolution = 300
): Promise<Blob> {
  const zip = new JSZip();
  const exportScale = Math.max(resolution, 1) / 300;
  const exportWidth = Math.round(width * exportScale);
  const exportHeight = Math.round(height * exportScale);
  const scaled = (value: number) => Math.round(value * exportScale);

  // A. background.jpg
  const hasBackground = bgOptions.backgroundType !== 'color' || elements.some(e => e.id.startsWith('background_frame'));
  let bgBlob: Blob | null = null;
  if (hasBackground) {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = exportWidth;
    bgCanvas.height = exportHeight;
    const bgCtx = bgCanvas.getContext('2d');
    if (bgCtx) {
      bgCtx.imageSmoothingEnabled = true;
      bgCtx.imageSmoothingQuality = 'high';
      await renderBackground(bgCtx, exportWidth, exportHeight, bgOptions, elements);
    }
    bgBlob = await new Promise<Blob | null>(res => bgCanvas.toBlob(res, 'image/jpeg', 0.98));
    if (bgBlob) zip.file('background.jpg', bgBlob);
  }

  // B. overlay.png — decoration elements (text, sticker). QR không vào overlay.
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = exportWidth;
  overlayCanvas.height = exportHeight;
  const overCtx = overlayCanvas.getContext('2d');
  if (overCtx) {
    overCtx.imageSmoothingEnabled = true;
    overCtx.imageSmoothingQuality = 'high';
    const nonQrElements = elements.filter(e => e.type !== 'qr');
    overCtx.save();
    overCtx.scale(exportScale, exportScale);
    await renderAllElements(overCtx, nonQrElements);
    overCtx.restore();
  }
  const overBlob = await new Promise<Blob | null>(res => overlayCanvas.toBlob(res, 'image/png'));
  if (overBlob) zip.file('overlay.png', overBlob);

  // C. preview.png — ảnh xem trước tổng hợp (như bản gốc DSLRbooth)
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = exportWidth;
  previewCanvas.height = exportHeight;
  const prevCtx = previewCanvas.getContext('2d');
  if (prevCtx) {
    prevCtx.imageSmoothingEnabled = true;
    prevCtx.imageSmoothingQuality = 'high';
    await renderBackground(prevCtx, exportWidth, exportHeight, bgOptions, elements);
    prevCtx.save();
    prevCtx.scale(exportScale, exportScale);
    // Draw slot placeholders
    prevCtx.globalCompositeOperation = 'source-over';
    for (const s of slots.filter(sl => sl.visible !== false)) {
      prevCtx.save();
      const theta = (s.rotation || 0) * Math.PI / 180;
      const cx = s.x + (s.width / 2) * Math.cos(theta) - (s.height / 2) * Math.sin(theta);
      const cy = s.y + (s.width / 2) * Math.sin(theta) + (s.height / 2) * Math.cos(theta);
      
      prevCtx.translate(cx, cy);
      prevCtx.rotate(theta);

      prevCtx.globalAlpha = 0.20;
      prevCtx.fillStyle = '#1e293b';
      prevCtx.fillRect(-s.width / 2, -s.height / 2, s.width, s.height);
      prevCtx.globalAlpha = 1.0;
      prevCtx.strokeStyle = 'rgba(255,255,255,0.12)';
      prevCtx.lineWidth = 2;
      prevCtx.strokeRect(-s.width / 2, -s.height / 2, s.width, s.height);
      prevCtx.restore();
    }
    // Draw elements on top
    await renderAllElements(prevCtx, elements);
    prevCtx.restore();
  }
  const prevBlob = await new Promise<Blob | null>(res => previewCanvas.toBlob(res, 'image/png'));
  if (prevBlob) zip.file('preview.png', prevBlob);

  // D. template.xml — chuẩn DSLRbooth (UTF-8 BOM, CRLF, blank lines, đúng thứ tự ZIndex)
  const xmlDate = formatDate();
  const xmlId = generateDslrboothId();
  const visibleSlots = slots.filter(s => s.visible !== false);
  const qrElements = elements.filter(e => e.type === 'qr' && e.visible !== false);
  
  // ZIndex chuẩn DSLRbooth: Duy nhất và tăng dần từ dưới lên trên
  let currentZIndex = 0;
  const bgZIndex = hasBackground ? currentZIndex++ : -1;
  
  // Photos nhận ZIndex tăng dần từ currentZIndex
  const photoZIndices: { [id: string]: number } = {};
  visibleSlots.forEach(s => {
    photoZIndices[s.id] = currentZIndex++;
  });
  
  const overlayZIndex = currentZIndex++;
  const qrBaseZIndex = currentZIndex;

  // Xử lý BackgroundColor (chuyển #RRGGBB sang #AARRGGBB)
  let argbBackground = '#FFFFFFFF';
  if (bgOptions.backgroundColor && bgOptions.backgroundColor.startsWith('#')) {
    const hex = bgOptions.backgroundColor.replace('#', '');
    if (hex.length === 6) {
      argbBackground = `#FF${hex.toUpperCase()}`;
    } else if (hex.length === 8) {
      argbBackground = `#${hex.toUpperCase()}`;
    }
  }

  // BOM (EF BB BF) bắt buộc cho .NET XML parser của DSLRbooth
  let xmlStr = `\uFEFF<?xml version="1.0" encoding="UTF-8"?>\r\n`;
  xmlStr += `<Template Name="dslrbooth_${frameName.replace(/\s+/g, '_')}" Width="${exportWidth}" Height="${exportHeight}" Dimensions="0" Resolution="${Math.round(resolution)}" BackgroundColor="${argbBackground}" print_2_per_page="False" PrintToSecondaryPrinter="False" LastSavedDate="${xmlDate}" Id="${xmlId}" IsLegacy="False" OriginalDevice="DESKTOP-PICADESIGN">\r\n`;
  xmlStr += `  <Elements>\r\n`;

  // Ghi XML theo thứ tự ZIndex giảm dần (cao nhất ghi trước)

  // 1. QrCode elements (trên cùng)
  qrElements.forEach((qr, idx) => {
    const qrZIndex = qrBaseZIndex + idx;
    const qrTheta = (qr.rotation || 0) * Math.PI / 180;
    const qcx = qr.x + (qr.width / 2) * Math.cos(qrTheta) - (qr.height / 2) * Math.sin(qrTheta);
    const qcy = qr.y + (qr.width / 2) * Math.sin(qrTheta) + (qr.height / 2) * Math.cos(qrTheta);
    const qrLeft = qcx - qr.width / 2;
    const qrTop = qcy - qr.height / 2;
    const qrRotation = Math.round(((qr.rotation || 0) % 360 + 360) % 360);
    xmlStr += `    <QrCode Name="QR Code ${idx + 1}" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" UseUploadUrl="True" Width="${scaled(qr.width)}" Height="${scaled(qr.height)}" BackgroundColor="#00FFFFFF" ZIndex="${qrZIndex}" Left="${scaled(qrLeft)}" Top="${scaled(qrTop)}" Rotation="${qrRotation}" />\r\n`;
  });

  // 2. Overlay
  xmlStr += `    <Image Name="overlay" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" Width="${exportWidth}" Height="${exportHeight}" Top="0" Left="0" ImagePath="overlay.png" KeepAspect="True" Thickness="0" StrokeColor="#FF000000" ZIndex="${overlayZIndex}" Rotation="0" />\r\n`;

  // 3. Photos (ZIndex giảm dần)
  // Xếp visibleSlots theo ZIndex giảm dần để in ra XML
  const sortedSlots = [...visibleSlots].sort((a, b) => photoZIndices[b.id] - photoZIndices[a.id]);
  sortedSlots.forEach((s, index) => {
    // PhotoNumber vẫn giữ nguyên logic gốc của người dùng (slot.order hoặc index+1), cho phép trùng nhau (như dải 2x6)
    const value = Number(s.order);
    const photoNum = Number.isFinite(value) && value > 0 ? Math.round(value) : index + 1;
    
    const theta = (s.rotation || 0) * Math.PI / 180;
    const cx = s.x + (s.width / 2) * Math.cos(theta) - (s.height / 2) * Math.sin(theta);
    const cy = s.y + (s.width / 2) * Math.sin(theta) + (s.height / 2) * Math.cos(theta);
    
    const dslrWidth = s.width;
    const dslrHeight = s.height;
    const dslrLeft = cx - dslrWidth / 2;
    const dslrTop = cy - dslrHeight / 2;
    const dslrRotation = Math.round(((s.rotation || 0) % 360 + 360) % 360);
    
    const zIndex = photoZIndices[s.id];

    xmlStr += `    <Photo Name="Photo ${photoNum}" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" Width="${scaled(dslrWidth)}" Height="${scaled(dslrHeight)}" Top="${scaled(dslrTop)}" Left="${scaled(dslrLeft)}" ImagePath="" KeepAspect="False" Thickness="0" StrokeColor="#FF000000" PhotoNumber="${photoNum}" ZIndex="${zIndex}" Rotation="${dslrRotation}" />\r\n`;
  });

  // 4. Background (nếu có, dưới cùng)
  if (hasBackground) {
    xmlStr += `    <Image Name="Background" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" Width="${exportWidth}" Height="${exportHeight}" Top="0" Left="0" ImagePath="background.jpg" KeepAspect="True" Thickness="0" StrokeColor="#FF000000" ZIndex="${bgZIndex}" Rotation="0" />\r\n`;
  }

  xmlStr += `  </Elements>\r\n`;
  xmlStr += `</Template>\r\n`;
  zip.file('template.xml', xmlStr);

  // DEFLATE compression (method=8) — bắt buộc theo format DSLRbooth
  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
