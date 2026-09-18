import { FrameElement, FrameSlot } from '../types/canvas';

export type DetectType = 'transparency' | 'solid-green' | 'solid-white' | 'photo-placeholder';

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
    } else if (detectType === 'solid-white') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      mask[i] = gray > 220 ? 1 : 0;
    } else {
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      const skyBlue = b > 145 && g > 145 && r > 95 && b >= r + 18 && g >= r + 8 && sat < 0.45;
      const photoGreen = g > 120 && g === maxC && g > r * 1.12 && g > b * 1.08 && sat > 0.18;
      mask[i] = skyBlue || photoGreen ? 1 : 0;
    }
    if (mask[i] === 1) maskCount++;
  }

  return { mask, maskCount };
}

/**
 * Find farthest transparent pixels within a cell, then expand outward in 4 directions.
 * Constrains width and enforces density check to prevent leaking into adjacent columns.
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

  const maxAllowedWidth = Math.round(targetW * 0.96);

  // Expand UP - requires at least 40% transparent pixels in the candidate row
  for (let ry = realMinY - 1; ry >= 0; ry--) {
    let transparentCount = 0;
    const widthSpan = realMaxX - realMinX + 1;
    for (let rx = realMinX; rx <= realMaxX; rx++) {
      if (mask[ry * targetW + rx] === 1) transparentCount++;
    }
    if (transparentCount / widthSpan >= 0.40) realMinY = ry; else break;
  }

  // Expand DOWN - requires at least 40% transparent pixels in the candidate row
  for (let ry = realMaxY + 1; ry < targetH; ry++) {
    let transparentCount = 0;
    const widthSpan = realMaxX - realMinX + 1;
    for (let rx = realMinX; rx <= realMaxX; rx++) {
      if (mask[ry * targetW + rx] === 1) transparentCount++;
    }
    if (transparentCount / widthSpan >= 0.40) realMaxY = ry; else break;
  }

  // Expand LEFT - requires at least 45% transparent pixels in candidate col and respects maxAllowedWidth
  for (let rx = realMinX - 1; rx >= 0; rx--) {
    const candidateWidth = realMaxX - rx + 1;
    if (candidateWidth > maxAllowedWidth) break;

    let transparentCount = 0;
    const heightSpan = realMaxY - realMinY + 1;
    for (let ry = realMinY; ry <= realMaxY; ry++) {
      if (mask[ry * targetW + rx] === 1) transparentCount++;
    }
    if (transparentCount / heightSpan >= 0.45) realMinX = rx; else break;
  }

  // Expand RIGHT - requires at least 45% transparent pixels in candidate col and respects maxAllowedWidth
  for (let rx = realMaxX + 1; rx < targetW; rx++) {
    const candidateWidth = rx - realMinX + 1;
    if (candidateWidth > maxAllowedWidth) break;

    let transparentCount = 0;
    const heightSpan = realMaxY - realMinY + 1;
    for (let ry = realMinY; ry <= realMaxY; ry++) {
      if (mask[ry * targetW + rx] === 1) transparentCount++;
    }
    if (transparentCount / heightSpan >= 0.45) realMaxX = rx; else break;
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
  const ROW_THRESH = targetW * 0.12;
  const MIN_BAND_H = Math.max(10, Math.round(targetH * 0.04));
  const MAX_ROW_GAP = 1;
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
  const MIN_SPAN_W = Math.max(10, Math.round(targetW * 0.04));
  const MAX_COL_GAP = 1;
  const detected: DetectedRect[] = [];
  const scaleX = origW / targetW;
  const scaleY = origH / targetH;
  const PAD = 4; // Mở rộng ra ngoài 4px để tránh dính mép viền trong của khung

  for (const band of rawRowBands) {
    const bandH = band.end - band.start + 1;
    const colCounts = new Float32Array(targetW);
    for (let y = band.start; y <= band.end; y++) {
      for (let x = 0; x < targetW; x++) {
        if (mask[y * targetW + x] === 1) colCounts[x]++;
      }
    }

    // Increased COL_THRESH to prevent leaking into low-density areas
    const COL_THRESH = bandH * 0.30;
    let spanStart = -1;
    let colGap = 0;
    const bandSpans: Array<{ start: number; end: number }> = [];

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
              bandSpans.push({ start: spanStart, end: spanEnd });
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
        bandSpans.push({ start: spanStart, end: spanEnd });
      }
    }

    for (const span of bandSpans) {
      const slot = refineAndExpand(mask, targetW, targetH, origW, origH, band.start, band.end, span.start, span.end, scaleX, scaleY, PAD);
      if (slot) detected.push(slot);
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
  const origW = compositeCanvas.width;
  const origH = compositeCanvas.height;

  const targetW = 600;
  const targetH = Math.round(origH * (600 / origW));

  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = targetW;
  smallCanvas.height = targetH;
  const sCtx = smallCanvas.getContext('2d');
  if (!sCtx) return [];

  sCtx.drawImage(compositeCanvas, 0, 0, targetW, targetH);
  const imgData = sCtx.getImageData(0, 0, targetW, targetH);

  // If scanning transparency, use accurate 2D flood fill connected components
  if (detectType === 'transparency') {
    const transparentRegions = findAllTransparentRegions(imgData);
    if (transparentRegions.length > 0) {
      const scaleX = origW / targetW;
      const scaleY = origH / targetH;
      const pad = 4;
      return transparentRegions.map((reg, index) => {
        const sx = Math.max(0, Math.round(reg.x * scaleX) - pad);
        const sy = Math.max(0, Math.round(reg.y * scaleY) - pad);
        const sw = Math.min(origW - sx, Math.round(reg.width * scaleX) + pad * 2);
        const sh = Math.min(origH - sy, Math.round(reg.height * scaleY) + pad * 2);
        return {
          id: `slot_auto_${index + 1}_${Date.now()}`,
          x: sx,
          y: sy,
          width: sw,
          height: sh,
          rotation: 0,
          order: index + 1,
          visible: true,
          locked: false
        };
      });
    }
  }

  const data = imgData.data;
  const coverage = buildCoverageMask(imageElements, targetW, targetH, canvasWidth, canvasHeight);
  const { mask, maskCount } = buildBinaryMask(data, coverage, targetW * targetH, detectType);
  const totalPixels = targetW * targetH;
  console.log(`[SlotDetect] mask: ${maskCount}/${totalPixels} pixels (${(maskCount / totalPixels * 100).toFixed(1)}%), mode=${detectType}, targetSize=${targetW}x${targetH}`);

  const detected = projectionDetect(mask, targetW, targetH, origW, origH);
  if (detected.length === 0) return [];

  const sorted = sortDetected(detected);

  return sorted.map((s, index) => {
    const pad = 4;
    const newX = Math.max(0, s.x - pad);
    const newY = Math.max(0, s.y - pad);
    const newW = Math.min(origW - newX, s.w + pad * 2);
    const newH = Math.min(origH - newY, s.h + pad * 2);

    return {
      id: `slot_auto_${index + 1}_${Date.now()}`,
      x: newX,
      y: newY,
      width: newW,
      height: newH,
      rotation: 0,
      order: index + 1,
      visible: true,
      locked: false
    };
  });
}

export interface TransparentSlotRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelCount: number;
}

/**
 * Finds exactly one connected transparent region from a user click.
 * If the transparent area touches the image boundary, it is rejected (it is outer background, not an inner slot).
 */
export function findTransparentRegionAt(
  imageData: ImageData,
  startX: number,
  startY: number,
  alphaThreshold = 200
): TransparentSlotRegion | null {
  const { width, height, data } = imageData;
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return null;

  const threshold = Math.max(1, Math.min(255, alphaThreshold));
  const startIndex = startY * width + startX;
  if (data[startIndex * 4 + 3] >= threshold) return null;

  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let stackSize = 0;
  let pixelCount = 0;
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;
  let touchesBoundary = false;
  stack[stackSize++] = startIndex;
  visited[startIndex] = 1;

  const dx = [-1, 1, 0, 0];
  const dy = [0, 0, -1, 1];
  while (stackSize > 0) {
    const index = stack[--stackSize];
    const x = index % width;
    const y = Math.floor(index / width);
    pixelCount += 1;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBoundary = true;

    for (let direction = 0; direction < 4; direction++) {
      const nextX = x + dx[direction];
      const nextY = y + dy[direction];
      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
      const nextIndex = nextY * width + nextX;
      if (visited[nextIndex] || data[nextIndex * 4 + 3] >= threshold) continue;
      visited[nextIndex] = 1;
      stack[stackSize++] = nextIndex;
    }
  }

  const regionWidth = maxX - minX + 1;
  const regionHeight = maxY - minY + 1;
  if (touchesBoundary || regionWidth < 10 || regionHeight < 10 || pixelCount < 64) return null;

  return { x: minX, y: minY, width: regionWidth, height: regionHeight, pixelCount };
}

/**
 * Scans the entire image and returns all non-boundary connected transparent slot regions.
 */
export function findAllTransparentRegions(
  imageData: ImageData,
  alphaThreshold = 200
): TransparentSlotRegion[] {
  const { width, height, data } = imageData;
  const threshold = Math.max(1, Math.min(255, alphaThreshold));
  const visited = new Uint8Array(width * height);
  const regions: TransparentSlotRegion[] = [];
  const minArea = Math.round((width * height) * 0.004); // At least 0.4% of total frame

  // Mark all boundary pixels and connected boundary transparency as visited so they don't form slots
  const stack = new Int32Array(width * height);
  let stackSize = 0;

  for (let x = 0; x < width; x++) {
    if (data[(0 * width + x) * 4 + 3] < threshold && !visited[0 * width + x]) {
      stack[stackSize++] = 0 * width + x;
      visited[0 * width + x] = 1;
    }
    const btm = (height - 1) * width + x;
    if (data[btm * 4 + 3] < threshold && !visited[btm]) {
      stack[stackSize++] = btm;
      visited[btm] = 1;
    }
  }
  for (let y = 0; y < height; y++) {
    const left = y * width + 0;
    if (data[left * 4 + 3] < threshold && !visited[left]) {
      stack[stackSize++] = left;
      visited[left] = 1;
    }
    const right = y * width + (width - 1);
    if (data[right * 4 + 3] < threshold && !visited[right]) {
      stack[stackSize++] = right;
      visited[right] = 1;
    }
  }

  const dx = [-1, 1, 0, 0];
  const dy = [0, 0, -1, 1];
  while (stackSize > 0) {
    const index = stack[--stackSize];
    const x = index % width;
    const y = Math.floor(index / width);
    for (let d = 0; d < 4; d++) {
      const nx = x + dx[d];
      const ny = y + dy[d];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (visited[ni] || data[ni * 4 + 3] >= threshold) continue;
      visited[ni] = 1;
      stack[stackSize++] = ni;
    }
  }

  // Now find internal transparent components
  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      const idx = y * width + x;
      if (visited[idx] || data[idx * 4 + 3] >= threshold) continue;

      let minX = x, maxX = x, minY = y, maxY = y;
      let count = 0;
      stack[stackSize++] = idx;
      visited[idx] = 1;

      while (stackSize > 0) {
        const ci = stack[--stackSize];
        const cx = ci % width;
        const cy = Math.floor(ci / width);
        count++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let d = 0; d < 4; d++) {
          const nx = cx + dx[d];
          const ny = cy + dy[d];
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (visited[ni] || data[ni * 4 + 3] >= threshold) continue;
          visited[ni] = 1;
          stack[stackSize++] = ni;
        }
      }

      const rw = maxX - minX + 1;
      const rh = maxY - minY + 1;
      if (rw >= 20 && rh >= 20 && count >= Math.max(64, minArea)) {
        regions.push({ x: minX, y: minY, width: rw, height: rh, pixelCount: count });
      }
    }
  }

  // Sort top-to-bottom, left-to-right
  return regions.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 20) return a.y - b.y;
    return a.x - b.x;
  });
}
