import { FrameElement, FrameSlot } from '../types/canvas';

export type DetectType = 'transparency' | 'solid-green' | 'solid-white';

interface DetectedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Composites all visible image elements onto a single canvas.
 * Falls back to bgImageUrl if no image elements exist.
 */
export async function createCompositeCanvas(
  imageElements: FrameElement[],
  bgImageUrl: string | null,
  canvasWidth: number,
  canvasHeight: number
): Promise<HTMLCanvasElement> {
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = canvasWidth;
  compositeCanvas.height = canvasHeight;
  const compCtx = compositeCanvas.getContext('2d');
  if (!compCtx) throw new Error('Không thể tạo composite context.');

  // Draw each image element at its position/size
  for (const el of imageElements) {
    const elImg = new Image();
    elImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      elImg.onload = () => {
        compCtx.drawImage(elImg, el.x, el.y, el.width, el.height);
        resolve();
      };
      elImg.onerror = () => resolve();
      elImg.src = el.content;
    });
  }

  // Fallback: if no image elements but bgImageUrl exists, draw it
  if (imageElements.length === 0 && bgImageUrl) {
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      bgImg.onload = () => {
        compCtx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
        resolve();
      };
      bgImg.onerror = () => resolve();
      bgImg.src = bgImageUrl;
    });
  }

  return compositeCanvas;
}

/**
 * Creates a coverage mask — marks which pixels are within image element bounds.
 * Prevents empty canvas areas from being falsely detected as transparent slots.
 */
function buildCoverageMask(
  imageElements: FrameElement[],
  targetW: number,
  targetH: number,
  canvasWidth: number,
  canvasHeight: number
): Uint8Array {
  const totalPixels = targetW * targetH;
  const coverage = new Uint8Array(totalPixels);

  for (const el of imageElements) {
    const elX1 = Math.max(0, Math.floor(el.x * targetW / canvasWidth));
    const elY1 = Math.max(0, Math.floor(el.y * targetH / canvasHeight));
    const elX2 = Math.min(targetW, Math.ceil((el.x + el.width) * targetW / canvasWidth));
    const elY2 = Math.min(targetH, Math.ceil((el.y + el.height) * targetH / canvasHeight));
    for (let cy = elY1; cy < elY2; cy++) {
      for (let cx = elX1; cx < elX2; cx++) {
        coverage[cy * targetW + cx] = 1;
      }
    }
  }

  // Fallback: if no image elements, mark entire canvas as covered
  if (imageElements.length === 0) {
    for (let i = 0; i < totalPixels; i++) coverage[i] = 1;
  }

  return coverage;
}

/**
 * Creates a binary transparency mask from pixel data using the given detection mode.
 */
function buildBinaryMask(
  data: Uint8ClampedArray,
  coverage: Uint8Array,
  totalPixels: number,
  detectType: DetectType
): { mask: Uint8Array; maskCount: number } {
  const mask = new Uint8Array(totalPixels);
  let maskCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    if (coverage[i] === 0) continue;
    const pi = i * 4;
    const r = data[pi], g = data[pi + 1], b = data[pi + 2], a = data[pi + 3];

    if (detectType === 'transparency') {
      mask[i] = a < 200 ? 1 : 0;
    } else if (detectType === 'solid-green') {
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      mask[i] = (g > 40 && g === maxC && sat > 0.15 && g > r * 1.15 && g > b * 1.15) ? 1 : 0;
    } else {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      mask[i] = gray > 220 ? 1 : 0;
    }
    if (mask[i] === 1) maskCount++;
  }

  return { mask, maskCount };
}

/**
 * Find farthest transparent pixels within a cell, then expand outward in 4 directions.
 */
function refineAndExpand(
  mask: Uint8Array,
  targetW: number,
  targetH: number,
  origW: number,
  origH: number,
  bStart: number,
  bEnd: number,
  sStart: number,
  sEnd: number,
  scaleX: number,
  scaleY: number,
  pad: number
): DetectedRect | null {
  let realMinX = sEnd, realMaxX = sStart;
  let realMinY = bEnd, realMaxY = bStart;
  for (let ry = bStart; ry <= bEnd; ry++) {
    for (let rx = sStart; rx <= sEnd; rx++) {
      if (mask[ry * targetW + rx] === 1) {
        if (rx < realMinX) realMinX = rx;
        if (rx > realMaxX) realMaxX = rx;
        if (ry < realMinY) realMinY = ry;
        if (ry > realMaxY) realMaxY = ry;
      }
    }
  }
  if (realMaxX < realMinX) return null;

  // Expand UP
  for (let ry = realMinY - 1; ry >= 0; ry--) {
    let hasTransparent = false;
    for (let rx = realMinX; rx <= realMaxX; rx++) {
      if (mask[ry * targetW + rx] === 1) { hasTransparent = true; break; }
    }
    if (hasTransparent) realMinY = ry; else break;
  }
  // Expand DOWN
  for (let ry = realMaxY + 1; ry < targetH; ry++) {
    let hasTransparent = false;
    for (let rx = realMinX; rx <= realMaxX; rx++) {
      if (mask[ry * targetW + rx] === 1) { hasTransparent = true; break; }
    }
    if (hasTransparent) realMaxY = ry; else break;
  }
  // Expand LEFT
  for (let rx = realMinX - 1; rx >= 0; rx--) {
    let hasTransparent = false;
    for (let ry = realMinY; ry <= realMaxY; ry++) {
      if (mask[ry * targetW + rx] === 1) { hasTransparent = true; break; }
    }
    if (hasTransparent) realMinX = rx; else break;
  }
  // Expand RIGHT
  for (let rx = realMaxX + 1; rx < targetW; rx++) {
    let hasTransparent = false;
    for (let ry = realMinY; ry <= realMaxY; ry++) {
      if (mask[ry * targetW + rx] === 1) { hasTransparent = true; break; }
    }
    if (hasTransparent) realMaxX = rx; else break;
  }

  const sx = Math.max(0, Math.round(realMinX * scaleX) - pad);
  const sy = Math.max(0, Math.round(realMinY * scaleY) - pad);
  const sx2 = Math.min(origW, Math.round(realMaxX * scaleX) + pad);
  const sy2 = Math.min(origH, Math.round(realMaxY * scaleY) + pad);
  console.log(`[SlotDetect] Slot: cell=[${sStart},${bStart}]-[${sEnd},${bEnd}] → expanded=[${realMinX},${realMinY}]-[${realMaxX},${realMaxY}] → canvas=[${sx},${sy}]-[${sx2},${sy2}]`);
  return { x: sx, y: sy, w: sx2 - sx, h: sy2 - sy };
}

/**
 * Projection-based slot detection algorithm.
 * Scans rows to find horizontal bands, then columns within each band to find slots.
 * Robust to icons/decorations inside slots.
 */
function projectionDetect(
  mask: Uint8Array,
  targetW: number,
  targetH: number,
  origW: number,
  origH: number
): DetectedRect[] {
  // Row histogram
  const rowCounts = new Float32Array(targetH);
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      if (mask[y * targetW + x] === 1) rowCounts[y]++;
    }
  }

  // Find row bands
  const ROW_THRESH = targetW * 0.10;
  const MIN_BAND_H = Math.max(10, Math.round(targetH * 0.03));
  const MAX_ROW_GAP = 0;
  const rawRowBands: Array<{ start: number; end: number }> = [];
  let bandStart = -1;
  let gapCount = 0;

  for (let y = 0; y < targetH; y++) {
    if (rowCounts[y] >= ROW_THRESH) {
      if (bandStart === -1) bandStart = y;
      gapCount = 0;
    } else {
      if (bandStart !== -1) {
        gapCount++;
        if (gapCount > MAX_ROW_GAP) {
          const bandEnd = y - gapCount;
          if (bandEnd - bandStart >= MIN_BAND_H) {
            rawRowBands.push({ start: bandStart, end: bandEnd });
          }
          bandStart = -1;
          gapCount = 0;
        }
      }
    }
  }
  if (bandStart !== -1) {
    const bandEnd = targetH - 1 - gapCount;
    if (bandEnd - bandStart >= MIN_BAND_H) {
      rawRowBands.push({ start: bandStart, end: bandEnd });
    }
  }
  console.log(`[SlotDetect] Found ${rawRowBands.length} row bands:`, rawRowBands.map(b => `[${b.start}-${b.end}] h=${b.end - b.start}`));

  // Column analysis per band
  const MIN_SPAN_W = Math.max(10, Math.round(targetW * 0.03));
  const MAX_COL_GAP = 0;
  const detected: DetectedRect[] = [];
  const scaleX = origW / targetW;
  const scaleY = origH / targetH;
  const PAD = 1;

  for (const band of rawRowBands) {
    const bandH = band.end - band.start + 1;
    const colCounts = new Float32Array(targetW);
    for (let y = band.start; y <= band.end; y++) {
      for (let x = 0; x < targetW; x++) {
        if (mask[y * targetW + x] === 1) colCounts[x]++;
      }
    }

    const COL_THRESH = bandH * 0.10;
    let spanStart = -1;
    let colGap = 0;
    for (let x = 0; x < targetW; x++) {
      if (colCounts[x] >= COL_THRESH) {
        if (spanStart === -1) spanStart = x;
        colGap = 0;
      } else {
        if (spanStart !== -1) {
          colGap++;
          if (colGap > MAX_COL_GAP) {
            const spanEnd = x - colGap;
            if (spanEnd - spanStart >= MIN_SPAN_W) {
              const slot = refineAndExpand(mask, targetW, targetH, origW, origH, band.start, band.end, spanStart, spanEnd, scaleX, scaleY, PAD);
              if (slot) detected.push(slot);
            }
            spanStart = -1;
            colGap = 0;
          }
        }
      }
    }
    if (spanStart !== -1) {
      const spanEnd = targetW - 1 - colGap;
      if (spanEnd - spanStart >= MIN_SPAN_W) {
        const slot = refineAndExpand(mask, targetW, targetH, origW, origH, band.start, band.end, spanStart, spanEnd, scaleX, scaleY, PAD);
        if (slot) detected.push(slot);
      }
    }
  }

  return detected;
}

/**
 * Sorts detected rectangles top-to-bottom, left-to-right with row grouping.
 */
function sortDetected(detected: DetectedRect[]): DetectedRect[] {
  detected.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));

  const rows: Array<DetectedRect[]> = [];
  let currentRow = [detected[0]];
  for (let i = 1; i < detected.length; i++) {
    const cur = detected[i];
    const prev = currentRow[currentRow.length - 1];
    const cy1 = prev.y + prev.h / 2;
    const cy2 = cur.y + cur.h / 2;
    const avgH = (prev.h + cur.h) / 2;
    if (Math.abs(cy1 - cy2) < avgH * 0.5) {
      currentRow.push(cur);
    } else {
      rows.push(currentRow);
      currentRow = [cur];
    }
  }
  rows.push(currentRow);

  const sorted: DetectedRect[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    sorted.push(...row);
  }
  return sorted;
}

/**
 * Main detection entry point. Takes a composite canvas and returns sorted FrameSlot[].
 */
export async function detectSlots(
  compositeCanvas: HTMLCanvasElement,
  imageElements: FrameElement[],
  detectType: DetectType,
  canvasWidth: number,
  canvasHeight: number
): Promise<FrameSlot[]> {
  const origW = canvasWidth;
  const origH = canvasHeight;

  // Scale down to max 600px for performance
  const MAX_DIM = 600;
  let targetW = origW;
  let targetH = origH;
  if (targetW > MAX_DIM || targetH > MAX_DIM) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * MAX_DIM) / targetW);
      targetW = MAX_DIM;
    } else {
      targetW = Math.round((targetW * MAX_DIM) / targetH);
      targetH = MAX_DIM;
    }
  }

  const cvs = document.createElement('canvas');
  cvs.width = targetW;
  cvs.height = targetH;
  const ctx = cvs.getContext('2d');
  if (!ctx) throw new Error('Không thể tạo 2D context.');

  ctx.drawImage(compositeCanvas, 0, 0, targetW, targetH);
  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imageData.data;

  const coverage = buildCoverageMask(imageElements, targetW, targetH, canvasWidth, canvasHeight);
  const { mask, maskCount } = buildBinaryMask(data, coverage, targetW * targetH, detectType);
  const totalPixels = targetW * targetH;
  console.log(`[SlotDetect] mask: ${maskCount}/${totalPixels} pixels (${(maskCount / totalPixels * 100).toFixed(1)}%), mode=${detectType}, targetSize=${targetW}x${targetH}`);

  const detected = projectionDetect(mask, targetW, targetH, origW, origH);
  if (detected.length === 0) return [];

  const sorted = sortDetected(detected);

  return sorted.map((s, index) => ({
    id: `slot_auto_${index + 1}_${Date.now()}`,
    x: s.x,
    y: s.y,
    width: s.w,
    height: s.h,
    rotation: 0,
    order: index + 1
  }));
}
