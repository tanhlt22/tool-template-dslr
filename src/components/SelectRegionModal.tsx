import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Crop,
  Eraser,
  Lock,
  Maximize2,
  PaintBucket,
  Paintbrush,
  Pipette,
  Redo2,
  RotateCcw,
  Scissors,
  Square,
  Undo2,
  Unlock,
  X
} from 'lucide-react';
import { FrameElement, FrameSlot } from '../types/canvas';

export type RegionModalMode = 'punch_color' | 'punch_slot' | 'crop' | 'recolor';
export type RecolorSubTool = 'brush' | 'eraser' | 'bucket' | 'replace';

export interface SelectRegionModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
  slots: FrameSlot[];
  targetElement: FrameElement | null;
  initialMode?: RegionModalMode;
  onClose: () => void;
  onApply: (
    dataUrl: string,
    resetToCanvasSize: boolean,
    dimensions?: { width: number; height: number }
  ) => void;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CHECKER_SIZE = 8;
const CHECKER_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
  backgroundPosition: `0 0, 0 ${CHECKER_SIZE}px, ${CHECKER_SIZE}px -${CHECKER_SIZE}px, -${CHECKER_SIZE}px 0px`
};

const POPULAR_PALETTE = [
  { name: 'Trắng tinh', hex: '#FFFFFF' },
  { name: 'Đen tuyền', hex: '#111827' },
  { name: 'Vàng Gold', hex: '#D4AF37' },
  { name: 'Hồng Phấn', hex: '#FDA4AF' },
  { name: 'Đỏ Rượu', hex: '#991B1B' },
  { name: 'Xanh Navy', hex: '#1E3A8A' },
  { name: 'Kem Be', hex: '#FEF3C7' },
  { name: 'Bạc Sáng', hex: '#E2E8F0' }
];

function distance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export const SelectRegionModal: React.FC<SelectRegionModalProps> = ({
  isOpen,
  imageUrl,
  canvasWidth,
  canvasHeight,
  slots,
  targetElement,
  initialMode = 'recolor',
  onClose,
  onApply
}) => {
  const [mode, setMode] = useState<RegionModalMode>(initialMode);
  const [isProcessing, setIsProcessing] = useState(false);

  // Natural image dimensions
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Fast in-memory undo/redo snapshot stack
  const canvasSnapshotsRef = useRef<ImageData[]>([]);
  const snapshotIndexRef = useRef<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // --- TAB 1: PUNCH COLOR STATE ---
  const [punchTolerance, setPunchTolerance] = useState(10);
  const [punchPickedColor, setPunchPickedColor] = useState<[number, number, number] | null>(null);
  const [punchMatchCount, setPunchMatchCount] = useState(0);

  // --- TAB 3: CROP STATE ---
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [lockCropRatio, setLockCropRatio] = useState(false);
  const [cropPreset, setCropPreset] = useState<string>('free');
  const [fitToCanvasOnApply, setFitToCanvasOnApply] = useState(true);

  // --- TAB 4: RECOLOR / PAINTING STATE ---
  const [recolorTool, setRecolorTool] = useState<RecolorSubTool>('brush');
  const [brushSize, setBrushSize] = useState(30);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushSoftness, setBrushSoftness] = useState(0);
  const [isSamplingColor, setIsSamplingColor] = useState(false);
  const [isAltSampling, setIsAltSampling] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Painting refs
  const isPaintingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [pickedSourceColor, setPickedSourceColor] = useState<[number, number, number] | null>(null);
  const [pickedTargetColor, setPickedTargetColor] = useState<[number, number, number]>([212, 175, 55]); // Champagne Gold
  const [recolorTolerance, setRecolorTolerance] = useState(15);
  const [activeEyedropper, setActiveEyedropper] = useState<'source' | 'destination' | null>(null);
  // Default to solid (Normal) like Photoshop Brush Tool
  const [recolorBlendMode, setRecolorBlendMode] = useState<'solid' | 'color'>('solid');
  const [recolorMatchCount, setRecolorMatchCount] = useState(0);

  // Save current canvas state to snapshot stack (synchronous, 1ms, zero lag)
  const saveCanvasSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const nextSnapshots = canvasSnapshotsRef.current.slice(0, snapshotIndexRef.current + 1);
    nextSnapshots.push(currentSnapshot);

    // Keep max 30 snapshots in memory
    if (nextSnapshots.length > 30) {
      nextSnapshots.shift();
    }

    canvasSnapshotsRef.current = nextSnapshots;
    snapshotIndexRef.current = nextSnapshots.length - 1;
    setCanUndo(snapshotIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Photoshop-like Undo
  const handleUndo = useCallback(() => {
    if (snapshotIndexRef.current > 0) {
      snapshotIndexRef.current--;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(canvasSnapshotsRef.current[snapshotIndexRef.current], 0, 0);
      setCanUndo(snapshotIndexRef.current > 0);
      setCanRedo(snapshotIndexRef.current < canvasSnapshotsRef.current.length - 1);
    }
  }, []);

  // Photoshop-like Redo
  const handleRedo = useCallback(() => {
    if (snapshotIndexRef.current < canvasSnapshotsRef.current.length - 1) {
      snapshotIndexRef.current++;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(canvasSnapshotsRef.current[snapshotIndexRef.current], 0, 0);
      setCanUndo(true);
      setCanRedo(snapshotIndexRef.current < canvasSnapshotsRef.current.length - 1);
    }
  }, []);

  // Reset to original image
  const handleResetToOriginal = useCallback(() => {
    if (canvasSnapshotsRef.current.length > 0) {
      snapshotIndexRef.current = 0;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(canvasSnapshotsRef.current[0], 0, 0);
      setCanUndo(false);
      setCanRedo(canvasSnapshotsRef.current.length > 1);
    }
  }, []);

  // Keyboard shortcuts like Photoshop (Alt = Eyedropper, [ and ] = Brush size, Ctrl+Z = Undo)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltSampling(true);
      } else if (e.key === '[') {
        setBrushSize((s) => Math.max(2, s - 5));
      } else if (e.key === ']') {
        setBrushSize((s) => Math.min(200, s + 5));
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltSampling(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, handleUndo, handleRedo]);

  // Initialize modal when opened
  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    setMode(initialMode);
    setPunchPickedColor(null);
    setPunchMatchCount(0);
    setPunchTolerance(10);
    setPickedSourceColor(null);
    setPickedTargetColor([212, 175, 55]);
    setActiveEyedropper(null);
    setIsSamplingColor(false);
    setRecolorMatchCount(0);
    setRecolorTool('brush');
    setRecolorBlendMode('solid');
    setBrushOpacity(100);
    setBrushSoftness(0);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      const natW = img.naturalWidth || img.width;
      const natH = img.naturalHeight || img.height;
      setNaturalSize({ width: natW, height: natH });

      // Init crop rect to full bounds
      setCropRect({ x: 0, y: 0, width: natW, height: natH });
      setCropPreset('free');
      setLockCropRatio(false);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = natW;
        canvas.height = natH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, natW, natH);
          ctx.drawImage(img, 0, 0);

          // Save baseline snapshot
          const initialSnapshot = ctx.getImageData(0, 0, natW, natH);
          canvasSnapshotsRef.current = [initialSnapshot];
          snapshotIndexRef.current = 0;
          setCanUndo(false);
          setCanRedo(false);
        }
      }

      // Draw slot preview
      drawSlotPreview(img);
    };
    img.src = imageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, imageUrl, initialMode]);

  // Draw slot overlay preview for punch_slot
  const drawSlotPreview = (img: HTMLImageElement) => {
    const canvas = slotCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (targetElement) {
      ctx.save();
      ctx.translate(targetElement.x, targetElement.y);
      ctx.rotate(((targetElement.rotation || 0) * Math.PI) / 180);
      ctx.drawImage(img, 0, 0, targetElement.width, targetElement.height);
      ctx.restore();
    } else {
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    }

    slots
      .filter((slot) => slot.visible !== false)
      .forEach((slot) => {
        ctx.save();
        ctx.translate(slot.x, slot.y);
        ctx.rotate(((slot.rotation || 0) * Math.PI) / 180);
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = Math.max(2, canvasWidth / 300);
        ctx.setLineDash([8, 6]);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.beginPath();
        ctx.rect(0, 0, slot.width, slot.height);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
  };

  // Redraw preview for Punch Color (red highlight)
  const redrawPunchColorPreview = (color: [number, number, number] | null, tol: number) => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSnapshotsRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use current baseline snapshot
    const baseline = canvasSnapshotsRef.current[snapshotIndexRef.current];
    const preview = ctx.createImageData(baseline.width, baseline.height);
    preview.data.set(baseline.data);

    let matches = 0;
    if (color) {
      const [pr, pg, pb] = color;
      const threshold = (tol / 100) * 441.7;
      const data = preview.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a > 0 && distance(r, g, b, pr, pg, pb) <= threshold) {
          matches += 1;
          data[i] = 239;
          data[i + 1] = 68;
          data[i + 2] = 68;
          data[i + 3] = 180;
        }
      }
    }
    ctx.putImageData(preview, 0, 0);
    setPunchMatchCount(matches);
  };

  // Redraw preview for Replace Color (global replace)
  const redrawGlobalReplacePreview = (
    srcCol: [number, number, number] | null,
    targetCol: [number, number, number],
    tol: number,
    blend: 'color' | 'solid'
  ) => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSnapshotsRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseline = canvasSnapshotsRef.current[snapshotIndexRef.current];
    if (!srcCol) {
      ctx.putImageData(baseline, 0, 0);
      setRecolorMatchCount(0);
      return;
    }

    const preview = ctx.createImageData(baseline.width, baseline.height);
    preview.data.set(baseline.data);
    const data = preview.data;

    const [tr, tg, tb] = srcCol;
    const [nr, ng, nb] = targetCol;
    const [nh, ns] = rgbToHsl(nr, ng, nb);
    const threshold = (tol / 100) * 441.7;

    let recoloredCount = 0;
    const len = data.length;
    for (let i = 0; i < len; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dist = distance(r, g, b, tr, tg, tb);
      if (dist <= threshold) {
        recoloredCount++;
        if (blend === 'color') {
          const [, , l] = rgbToHsl(r, g, b);
          const [cr, cg, cb] = hslToRgb(nh, ns, l);
          data[i] = cr;
          data[i + 1] = cg;
          data[i + 2] = cb;
        } else {
          data[i] = nr;
          data[i + 1] = ng;
          data[i + 2] = nb;
        }
      }
    }

    ctx.putImageData(preview, 0, 0);
    setRecolorMatchCount(recoloredCount);
  };

  // Execute Paint Bucket (Flood fill) at clicked point
  const executeFloodFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = currentImgData.data;
    const width = currentImgData.width;
    const height = currentImgData.height;

    const clickIdx = (startY * width + startX) * 4;
    const tr = data[clickIdx];
    const tg = data[clickIdx + 1];
    const tb = data[clickIdx + 2];
    const ta = data[clickIdx + 3];
    if (ta === 0) return;

    const [nr, ng, nb] = pickedTargetColor;
    const [nh, ns] = rgbToHsl(nr, ng, nb);
    const threshold = (recolorTolerance / 100) * 441.7;

    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    const startIndex = startY * width + startX;
    visited[startIndex] = 1;
    queue[tail++] = startIndex;

    while (head < tail) {
      const idx = queue[head++];
      const px = idx % width;
      const py = Math.floor(idx / width);
      const pi = idx * 4;

      const r = data[pi];
      const g = data[pi + 1];
      const b = data[pi + 2];
      const a = data[pi + 3];

      if (a > 0) {
        if (recolorBlendMode === 'color') {
          const [, , l] = rgbToHsl(r, g, b);
          const [cr, cg, cb] = hslToRgb(nh, ns, l);
          data[pi] = cr;
          data[pi + 1] = cg;
          data[pi + 2] = cb;
        } else {
          data[pi] = nr;
          data[pi + 1] = ng;
          data[pi + 2] = nb;
        }
      }

      const neighbors = [
        px > 0 ? idx - 1 : -1,
        px < width - 1 ? idx + 1 : -1,
        py > 0 ? idx - width : -1,
        py < height - 1 ? idx + width : -1
      ];

      for (let i = 0; i < 4; i++) {
        const nIdx = neighbors[i];
        if (nIdx >= 0 && visited[nIdx] === 0) {
          const nPi = nIdx * 4;
          const nR = data[nPi];
          const nG = data[nPi + 1];
          const nB = data[nPi + 2];
          const nA = data[nPi + 3];
          if (nA > 0 && distance(nR, nG, nB, tr, tg, tb) <= threshold) {
            visited[nIdx] = 1;
            queue[tail++] = nIdx;
          }
        }
      }
    }

    ctx.putImageData(currentImgData, 0, 0);
    saveCanvasSnapshot();
  };

  // Convert client mouse/touch event to natural image coordinates
  const getImageCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    return {
      x: Math.max(0, Math.min(canvas.width - 1, x)),
      y: Math.max(0, Math.min(canvas.height - 1, y))
    };
  };

  // Direct, smooth, continuous brush stroke painting
  const paintStroke = (fromX: number, fromY: number, toX: number, toY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();

    if (recolorTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = brushOpacity / 100;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      // Brush: Normal (Solid) or Photoshop Color blend
      ctx.globalCompositeOperation = recolorBlendMode === 'color' ? 'color' : 'source-over';
      ctx.globalAlpha = brushOpacity / 100;
      const [r, g, b] = pickedTargetColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      if (brushSoftness > 0) {
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.shadowBlur = (brushSoftness / 100) * (brushSize * 0.45);
      }
    }

    // Draw connecting stroke
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw circle cap at destination point
    ctx.beginPath();
    ctx.arc(toX, toY, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // --- CANVAS POINTER EVENTS FOR BRUSHING & COLOR SAMPLING ---
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const coords = getImageCoordinates(e);
    if (!coords) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check if sampling color via Eyedropper button or Alt key
    if (isSamplingColor || isAltSampling || activeEyedropper !== null) {
      const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
      const color: [number, number, number] = [pixel[0], pixel[1], pixel[2]];

      if (activeEyedropper === 'source') {
        setPickedSourceColor(color);
        setActiveEyedropper(null);
        redrawGlobalReplacePreview(color, pickedTargetColor, recolorTolerance, recolorBlendMode);
      } else {
        setPickedTargetColor(color);
        setIsSamplingColor(false);
        setActiveEyedropper(null);
        if (recolorTool === 'replace' && pickedSourceColor) {
          redrawGlobalReplacePreview(pickedSourceColor, color, recolorTolerance, recolorBlendMode);
        }
      }
      return;
    }

    if (mode === 'punch_color') {
      const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
      const color: [number, number, number] = [pixel[0], pixel[1], pixel[2]];
      setPunchPickedColor(color);
      redrawPunchColorPreview(color, punchTolerance);
      return;
    }

    if (mode === 'recolor') {
      if (recolorTool === 'bucket') {
        executeFloodFill(coords.x, coords.y);
        return;
      }

      if (recolorTool === 'replace') {
        const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
        const color: [number, number, number] = [pixel[0], pixel[1], pixel[2]];
        setPickedSourceColor(color);
        redrawGlobalReplacePreview(color, pickedTargetColor, recolorTolerance, recolorBlendMode);
        return;
      }

      if (recolorTool === 'brush' || recolorTool === 'eraser') {
        try {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
        isPaintingRef.current = true;
        lastPointRef.current = coords;
        paintStroke(coords.x, coords.y, coords.x, coords.y);
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (isPaintingRef.current && lastPointRef.current) {
      const coords = getImageCoordinates(e);
      if (!coords) return;
      paintStroke(lastPointRef.current.x, lastPointRef.current.y, coords.x, coords.y);
      lastPointRef.current = coords;
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      lastPointRef.current = null;
      saveCanvasSnapshot();
    }
  };

  const handleCanvasPointerLeave = () => {
    setCursorPos(null);
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      lastPointRef.current = null;
      saveCanvasSnapshot();
    }
  };

  // --- CROP HANDLERS & MATH ---
  const applyCropPreset = (presetKey: string) => {
    setCropPreset(presetKey);
    if (!naturalSize.width || !naturalSize.height) return;

    const natW = naturalSize.width;
    const natH = naturalSize.height;
    const imgRatio = natW / natH;

    let targetRatio: number | null = null;

    if (presetKey === 'canvas') {
      targetRatio = canvasWidth / canvasHeight;
    } else if (presetKey === '4:6') {
      targetRatio = 1200 / 1800;
    } else if (presetKey === '6:4') {
      targetRatio = 1800 / 1200;
    } else if (presetKey === '2:6') {
      targetRatio = 600 / 1800;
    } else if (presetKey === '1:1') {
      targetRatio = 1;
    }

    if (targetRatio) {
      setLockCropRatio(true);
      let w: number, h: number;
      if (imgRatio > targetRatio) {
        h = natH;
        w = Math.round(h * targetRatio);
      } else {
        w = natW;
        h = Math.round(w / targetRatio);
      }
      const x = Math.max(0, Math.round((natW - w) / 2));
      const y = Math.max(0, Math.round((natH - h) / 2));
      setCropRect({ x, y, width: w, height: h });
    } else {
      setLockCropRatio(false);
    }
  };

  const handleCropWidthInput = (val: number) => {
    if (isNaN(val) || val < 20 || !naturalSize.width) return;
    const w = Math.min(naturalSize.width, Math.max(20, Math.round(val)));
    let h = cropRect.height;
    if (lockCropRatio) {
      const ratio = cropRect.width / Math.max(1, cropRect.height);
      h = Math.min(naturalSize.height, Math.max(20, Math.round(w / ratio)));
    }
    const x = Math.min(cropRect.x, naturalSize.width - w);
    const y = Math.min(cropRect.y, naturalSize.height - h);
    setCropRect({ x, y, width: w, height: h });
  };

  const handleCropHeightInput = (val: number) => {
    if (isNaN(val) || val < 20 || !naturalSize.height) return;
    const h = Math.min(naturalSize.height, Math.max(20, Math.round(val)));
    let w = cropRect.width;
    if (lockCropRatio) {
      const ratio = cropRect.width / Math.max(1, cropRect.height);
      w = Math.min(naturalSize.width, Math.max(20, Math.round(h * ratio)));
    }
    const x = Math.min(cropRect.x, naturalSize.width - w);
    const y = Math.min(cropRect.y, naturalSize.height - h);
    setCropRect({ x, y, width: w, height: h });
  };

  const centerCropBox = () => {
    if (!naturalSize.width || !naturalSize.height) return;
    const x = Math.max(0, Math.round((naturalSize.width - cropRect.width) / 2));
    const y = Math.max(0, Math.round((naturalSize.height - cropRect.height) / 2));
    setCropRect((prev) => ({ ...prev, x, y }));
  };

  const fitAllCropBox = () => {
    if (!naturalSize.width || !naturalSize.height) return;
    setCropRect({ x: 0, y: 0, width: naturalSize.width, height: naturalSize.height });
    setLockCropRatio(false);
    setCropPreset('free');
  };

  const handleCropPointerDown = (
    e: React.PointerEvent,
    dragType: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialRect = { ...cropRect };
    const currentRatio = lockCropRatio
      ? initialRect.width / Math.max(1, initialRect.height)
      : null;

    const onPointerMove = (ev: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !naturalSize.width) return;
      const canvasBounds = canvas.getBoundingClientRect();
      const scale = canvasBounds.width / naturalSize.width;
      if (scale <= 0) return;

      const dx = (ev.clientX - startClientX) / scale;
      const dy = (ev.clientY - startClientY) / scale;

      const natW = naturalSize.width;
      const natH = naturalSize.height;

      let next = { ...initialRect };

      if (dragType === 'move') {
        next.x = Math.max(0, Math.min(natW - next.width, Math.round(initialRect.x + dx)));
        next.y = Math.max(0, Math.min(natH - next.height, Math.round(initialRect.y + dy)));
      } else {
        let x1 = initialRect.x;
        let y1 = initialRect.y;
        let x2 = initialRect.x + initialRect.width;
        let y2 = initialRect.y + initialRect.height;

        if (dragType.includes('e')) {
          x2 = Math.min(natW, Math.max(x1 + 30, Math.round(initialRect.x + initialRect.width + dx)));
        }
        if (dragType.includes('w')) {
          x1 = Math.max(0, Math.min(x2 - 30, Math.round(initialRect.x + dx)));
        }
        if (dragType.includes('s')) {
          y2 = Math.min(natH, Math.max(y1 + 30, Math.round(initialRect.y + initialRect.height + dy)));
        }
        if (dragType.includes('n')) {
          y1 = Math.max(0, Math.min(y2 - 30, Math.round(initialRect.y + dy)));
        }

        let w = x2 - x1;
        let h = y2 - y1;

        if (currentRatio) {
          if (dragType === 'e' || dragType === 'w') {
            h = Math.round(w / currentRatio);
            if (y1 + h > natH) {
              h = natH - y1;
              w = Math.round(h * currentRatio);
            }
          } else if (dragType === 'n' || dragType === 's') {
            w = Math.round(h * currentRatio);
            if (x1 + w > natW) {
              w = natW - x1;
              h = Math.round(w / currentRatio);
            }
          } else {
            const targetW = Math.round(h * currentRatio);
            if (targetW <= natW - x1) {
              w = targetW;
            } else {
              w = natW - x1;
              h = Math.round(w / currentRatio);
            }
            if (dragType.includes('w')) {
              x1 = x2 - w;
              if (x1 < 0) {
                x1 = 0;
                w = x2;
                h = Math.round(w / currentRatio);
              }
            }
            if (dragType.includes('n')) {
              y1 = y2 - h;
              if (y1 < 0) {
                y1 = 0;
                h = y2;
                w = Math.round(h * currentRatio);
              }
            }
          }
        }

        next = {
          x: Math.max(0, Math.min(natW - 30, x1)),
          y: Math.max(0, Math.min(natH - 30, y1)),
          width: Math.max(30, Math.min(natW - x1, w)),
          height: Math.max(30, Math.min(natH - y1, h))
        };
      }

      setCropRect(next);
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        (ev.target as HTMLElement).releasePointerCapture(ev.pointerId);
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // --- ACTIONS ---

  // 1. Generate Cropped DataURL
  const generateCroppedDataUrl = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || cropRect.width <= 0 || cropRect.height <= 0) return null;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = cropRect.width;
    outCanvas.height = cropRect.height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return null;

    outCtx.drawImage(
      canvas,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      cropRect.width,
      cropRect.height
    );

    return outCanvas.toDataURL('image/png');
  };

  // 2. Generate Punched Color DataURL
  const generatePunchColorDataUrl = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !punchPickedColor || canvasSnapshotsRef.current.length === 0) return null;

    const baseline = canvasSnapshotsRef.current[snapshotIndexRef.current];
    const [pr, pg, pb] = punchPickedColor;
    const threshold = (punchTolerance / 100) * 441.7;
    const output = new ImageData(new Uint8ClampedArray(baseline.data), baseline.width, baseline.height);
    const data = output.data;
    const w = output.width;
    const h = output.height;

    const matchMask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const pi = i * 4;
      if (data[pi + 3] > 0 && distance(data[pi], data[pi + 1], data[pi + 2], pr, pg, pb) <= threshold) {
        matchMask[i] = 1;
      }
    }

    const dilatedMask = new Uint8Array(matchMask);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (matchMask[i] === 1) {
          dilatedMask[i - 1] = 1;
          dilatedMask[i + 1] = 1;
          dilatedMask[i - w] = 1;
          dilatedMask[i + w] = 1;
        }
      }
    }

    for (let i = 0; i < w * h; i++) {
      if (dilatedMask[i] === 1) {
        data[i * 4 + 3] = 0;
      }
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = output.width;
    outCanvas.height = output.height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return null;
    outCtx.putImageData(output, 0, 0);

    return outCanvas.toDataURL('image/png');
  };

  // 3. Generate Punch Slot DataURL
  const generatePunchSlotDataUrl = (onDone: (dataUrl: string) => void) => {
    const canvas = canvasRef.current;
    if (slots.length === 0 || !canvas) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = canvasWidth;
    outCanvas.height = canvasHeight;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    if (targetElement) {
      ctx.save();
      ctx.translate(targetElement.x, targetElement.y);
      ctx.rotate(((targetElement.rotation || 0) * Math.PI) / 180);
      ctx.drawImage(canvas, 0, 0, targetElement.width, targetElement.height);
      ctx.restore();
    } else {
      ctx.drawImage(canvas, 0, 0, canvasWidth, canvasHeight);
    }

    ctx.globalCompositeOperation = 'destination-out';
    const bleed = 3;
    slots
      .filter((slot) => slot.visible !== false)
      .forEach((slot) => {
        ctx.save();
        ctx.translate(slot.x, slot.y);
        ctx.rotate(((slot.rotation || 0) * Math.PI) / 180);
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.rect(-bleed, -bleed, slot.width + bleed * 2, slot.height + bleed * 2);
        ctx.fill();
        ctx.restore();
      });

    onDone(outCanvas.toDataURL('image/png'));
  };

  // Final apply to canvas and close
  const handleFinalApply = () => {
    setIsProcessing(true);

    if (mode === 'crop') {
      const cropped = generateCroppedDataUrl();
      if (cropped) {
        onApply(cropped, fitToCanvasOnApply, {
          width: cropRect.width,
          height: cropRect.height
        });
      }
      setIsProcessing(false);
    } else if (mode === 'punch_color') {
      const punched = punchPickedColor ? generatePunchColorDataUrl() : canvasRef.current?.toDataURL('image/png');
      if (punched) {
        onApply(punched, false);
      }
      setIsProcessing(false);
    } else if (mode === 'recolor') {
      const result = canvasRef.current?.toDataURL('image/png');
      if (result) {
        onApply(result, false, naturalSize);
      }
      setIsProcessing(false);
    } else if (mode === 'punch_slot') {
      generatePunchSlotDataUrl((dataUrl) => {
        setIsProcessing(false);
        onApply(dataUrl, true);
      });
    }
  };

  if (!isOpen) return null;

  // Scale for overlay positioning
  const canvasEl = canvasRef.current;
  const canvasRect = canvasEl?.getBoundingClientRect();
  const displayScale =
    naturalSize.width > 0 && canvasRect && canvasRect.width > 0
      ? canvasRect.width / naturalSize.width
      : 1;

  const dispX = Math.round(cropRect.x * displayScale);
  const dispY = Math.round(cropRect.y * displayScale);
  const dispW = Math.round(cropRect.width * displayScale);
  const dispH = Math.round(cropRect.height * displayScale);

  const isEyedropperActive = isSamplingColor || isAltSampling || (mode === 'recolor' && activeEyedropper !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl max-h-[94vh] flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <Scissors className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                Chỉnh sửa ảnh & Đục lỗ khung hình
              </h2>
              <p className="text-xs text-slate-500 font-medium line-clamp-1">
                {mode === 'punch_color' && 'Đục lỗ nền theo màu (chấm vào màu cần xóa và khử răng cưa viền).'}
                {mode === 'punch_slot' && 'Đục lỗ các ô ảnh theo khung slot hiện tại (mở rộng 3px tránh lem viền).'}
                {mode === 'crop' && 'Cắt ảnh (Crop) theo kích thước pixel hoặc tỷ lệ chuẩn cho photobooth.'}
                {mode === 'recolor' && recolorTool === 'brush' && 'Cọ tô màu kiểu Photoshop: Hút màu từ ảnh (hoặc giữ phím Alt), rồi giữ chuột tô trực tiếp lên ảnh!'}
                {mode === 'recolor' && recolorTool === 'eraser' && 'Cục tẩy: Nhấn và giữ chuột rê để xóa vùng ảnh.'}
                {mode === 'recolor' && recolorTool === 'bucket' && 'Thùng sơn: Bấm vào một vùng trên ảnh để đổ màu liền kề.'}
                {mode === 'recolor' && recolorTool === 'replace' && 'Thay thế màu: Chọn màu gốc trên ảnh và thay đổi tất cả điểm màu tương đồng.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* History controls */}
            <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Hoàn tác nét vẽ / bước trước (Ctrl+Z)"
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Làm lại nét vẽ / bước sau (Ctrl+Y)"
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Redo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleResetToOriginal}
                disabled={!canUndo && !canRedo}
                title="Khôi phục ảnh gốc ban đầu"
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/60 px-6 py-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setMode('recolor');
                setRecolorTool('brush');
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                mode === 'recolor' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Paintbrush className="h-3.5 w-3.5" />
              Tô màu ảnh (Cọ / Photoshop)
            </button>

            <button
              type="button"
              onClick={() => setMode('crop')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                mode === 'crop' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Crop className="h-3.5 w-3.5" />
              Cắt ảnh (Crop kích thước)
            </button>

            <button
              type="button"
              onClick={() => setMode('punch_color')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                mode === 'punch_color' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Pipette className="h-3.5 w-3.5" />
              Đục lỗ (Màu)
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('punch_slot');
                if (canvasRef.current) {
                  const img = new Image();
                  img.src = canvasRef.current.toDataURL();
                  img.onload = () => drawSlotPreview(img);
                }
              }}
              disabled={slots.length === 0}
              title={slots.length === 0 ? 'Cần ít nhất 1 ô ảnh slot' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === 'punch_slot' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              Đục lỗ (Khung slot)
            </button>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Kích thước: <span className="text-slate-800">{naturalSize.width} × {naturalSize.height} px</span>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="flex-1 overflow-auto bg-slate-900/5 p-4 flex items-center justify-center min-h-[300px]">
          <div
            className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 p-2 shadow-inner"
            style={CHECKER_STYLE}
          >
            {/* Slot Preview Canvas */}
            <canvas
              ref={slotCanvasRef}
              className={`max-h-[380px] w-auto max-w-full rounded shadow-sm ${
                mode === 'punch_slot' ? 'block' : 'hidden'
              }`}
            />

            {/* Main Interactive Canvas & Overlays Wrapper */}
            <div className={`relative select-none ${mode !== 'punch_slot' ? 'inline-block' : 'hidden'}`}>
              <canvas
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerLeave}
                className={`block max-h-[380px] w-auto max-w-full rounded shadow-sm select-none touch-none ${
                  isEyedropperActive || mode === 'punch_color'
                    ? 'cursor-crosshair'
                    : mode === 'recolor' && (recolorTool === 'brush' || recolorTool === 'eraser')
                    ? 'cursor-crosshair'
                    : mode === 'recolor'
                    ? 'cursor-pointer'
                    : 'cursor-default'
                }`}
              />

              {/* Photoshop-style precision brush circle cursor */}
              {mode === 'recolor' && (recolorTool === 'brush' || recolorTool === 'eraser') && !isEyedropperActive && cursorPos && (
                <div
                  className="pointer-events-none absolute rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.8)]"
                  style={{
                    left: `${cursorPos.x}px`,
                    top: `${cursorPos.y}px`,
                    width: `${Math.max(4, brushSize * displayScale)}px`,
                    height: `${Math.max(4, brushSize * displayScale)}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.8)]" />
                </div>
              )}

              {/* Crop Overlay */}
              {mode === 'crop' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded">
                  {/* 4 dark scrim areas */}
                  <div className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none" style={{ height: `${dispY}px` }} />
                  <div className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none" style={{ top: `${dispY + dispH}px` }} />
                  <div className="absolute left-0 bg-black/60 pointer-events-none" style={{ top: `${dispY}px`, width: `${dispX}px`, height: `${dispH}px` }} />
                  <div className="absolute right-0 bg-black/60 pointer-events-none" style={{ top: `${dispY}px`, left: `${dispX + dispW}px`, height: `${dispH}px` }} />

                  {/* Active Crop Box Window */}
                  <div
                    className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] pointer-events-auto"
                    style={{
                      left: `${dispX}px`,
                      top: `${dispY}px`,
                      width: `${dispW}px`,
                      height: `${dispH}px`
                    }}
                  >
                    {/* Draggable center area */}
                    <div
                      className="absolute inset-0 cursor-move"
                      onPointerDown={(e) => handleCropPointerDown(e, 'move')}
                    >
                      {/* Rule of thirds grid lines */}
                      <div className="absolute left-1/3 top-0 bottom-0 w-px border-l border-dashed border-white/50 pointer-events-none" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px border-l border-dashed border-white/50 pointer-events-none" />
                      <div className="absolute top-1/3 left-0 right-0 h-px border-t border-dashed border-white/50 pointer-events-none" />
                      <div className="absolute top-2/3 left-0 right-0 h-px border-t border-dashed border-white/50 pointer-events-none" />
                    </div>

                    {/* Dimension Tag */}
                    <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10.5px] font-mono font-bold text-white shadow pointer-events-none">
                      {cropRect.width} × {cropRect.height} px
                    </div>

                    {/* 8 Drag Handles */}
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, 'nw')}
                      className="absolute -left-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border border-slate-800 bg-white shadow cursor-nwse-resize hover:scale-125 transition-transform"
                    />
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, 'ne')}
                      className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border border-slate-800 bg-white shadow cursor-nesw-resize hover:scale-125 transition-transform"
                    />
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, 'sw')}
                      className="absolute -left-1.5 -bottom-1.5 h-3.5 w-3.5 rounded-full border border-slate-800 bg-white shadow cursor-nesw-resize hover:scale-125 transition-transform"
                    />
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, 'se')}
                      className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 rounded-full border border-slate-800 bg-white shadow cursor-nwse-resize hover:scale-125 transition-transform"
                    />
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, 'n')}
                      className="absolute left-1/2 -top-1.5 -translate-x-1/2 h-2.5 w-6 rounded border border-slate-800 bg-white shadow cursor-ns-resize hover:scale-110 transition-transform"
                    />
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, 's')}
                      className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 h-2.5 w-6 rounded border border-slate-800 bg-white shadow cursor-ns-resize hover:scale-110 transition-transform"
                    />
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, 'w')}
                      className="absolute top-1/2 -left-1.5 -translate-y-1/2 h-6 w-2.5 rounded border border-slate-800 bg-white shadow cursor-ew-resize hover:scale-110 transition-transform"
                    />
                    <div
                      onPointerDown={(e) => handleCropPointerDown(e, 'e')}
                      className="absolute top-1/2 -right-1.5 -translate-y-1/2 h-6 w-2.5 rounded border border-slate-800 bg-white shadow cursor-ew-resize hover:scale-110 transition-transform"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Controls Panel */}
        <div className="border-t border-slate-200 bg-white p-4">
          {/* TAB 4: RECOLOR & BRUSH PAINTING */}
          {mode === 'recolor' && (
            <div className="flex flex-col gap-3">
              {/* Tool sub-mode selector + Color selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                {/* 4 Tools: Brush (Giữ chuột tô), Eraser (Cục tẩy), Bucket (Đổ màu), Replace (Thay thế) */}
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRecolorTool('brush');
                      setIsSamplingColor(false);
                      setActiveEyedropper(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                      recolorTool === 'brush'
                        ? 'bg-rose-700 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <Paintbrush className="h-3.5 w-3.5" />
                    Cọ vẽ (Giữ chuột tô lên ảnh)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecolorTool('eraser');
                      setIsSamplingColor(false);
                      setActiveEyedropper(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                      recolorTool === 'eraser'
                        ? 'bg-rose-700 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Cục tẩy
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecolorTool('bucket');
                      setIsSamplingColor(false);
                      setActiveEyedropper(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                      recolorTool === 'bucket'
                        ? 'bg-rose-700 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <PaintBucket className="h-3.5 w-3.5" />
                    Đổ màu vùng
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecolorTool('replace');
                      setIsSamplingColor(false);
                      setActiveEyedropper(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                      recolorTool === 'replace'
                        ? 'bg-rose-700 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <Pipette className="h-3.5 w-3.5" />
                    Thay thế màu
                  </button>
                </div>

                {/* Color picking for Brush & Bucket */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSamplingColor(!isSamplingColor);
                      setActiveEyedropper(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold transition-all ${
                      isSamplingColor || isAltSampling
                        ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500 animate-pulse'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    title="Bấm nút này rồi bấm vào ảnh để lấy màu, hoặc giữ phím Alt khi rê chuột"
                  >
                    <Pipette className="h-3.5 w-3.5 text-rose-700" />
                    {isSamplingColor || isAltSampling ? '👉 Chấm vào màu trên ảnh...' : 'Hút màu từ ảnh (Alt)'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <label htmlFor="recolor-custom-picker" className="sr-only">
                      Chọn màu
                    </label>
                    <input
                      id="recolor-custom-picker"
                      type="color"
                      value={rgbToHex(pickedTargetColor[0], pickedTargetColor[1], pickedTargetColor[2])}
                      onChange={(e) => {
                        const nextColor = hexToRgb(e.target.value);
                        setPickedTargetColor(nextColor);
                        if (recolorTool === 'replace' && pickedSourceColor) {
                          redrawGlobalReplacePreview(pickedSourceColor, nextColor, recolorTolerance, recolorBlendMode);
                        }
                      }}
                      className="h-7 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                    />
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {rgbToHex(pickedTargetColor[0], pickedTargetColor[1], pickedTargetColor[2])}
                    </span>
                  </div>

                  {/* Palette pills */}
                  <div className="flex items-center gap-1 ml-1">
                    {POPULAR_PALETTE.map((item) => (
                      <button
                        key={item.hex}
                        type="button"
                        onClick={() => {
                          const rgb = hexToRgb(item.hex);
                          setPickedTargetColor(rgb);
                          if (recolorTool === 'replace' && pickedSourceColor) {
                            redrawGlobalReplacePreview(pickedSourceColor, rgb, recolorTolerance, recolorBlendMode);
                          }
                        }}
                        title={item.name}
                        style={{ backgroundColor: item.hex }}
                        className="h-5 w-5 rounded-full border border-slate-300 shadow-sm hover:scale-125 transition-transform"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sub-tool specific options */}
              {(recolorTool === 'brush' || recolorTool === 'eraser') && (
                <div className="flex flex-wrap items-center gap-4">
                  {/* Brush Size */}
                  <div className="flex flex-1 min-w-[170px] items-center gap-2">
                    <label htmlFor="brush-size" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      Cỡ cọ ([ ]):
                    </label>
                    <input
                      id="brush-size"
                      type="range"
                      min={2}
                      max={150}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="flex-1 accent-rose-700"
                    />
                    <span className="w-8 text-right text-xs font-bold text-slate-700">{brushSize}px</span>
                  </div>

                  {/* Brush Opacity */}
                  <div className="flex flex-1 min-w-[170px] items-center gap-2">
                    <label htmlFor="brush-opacity" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      Độ đậm:
                    </label>
                    <input
                      id="brush-opacity"
                      type="range"
                      min={10}
                      max={100}
                      value={brushOpacity}
                      onChange={(e) => setBrushOpacity(Number(e.target.value))}
                      className="flex-1 accent-rose-700"
                    />
                    <span className="w-8 text-right text-xs font-bold text-slate-700">{brushOpacity}%</span>
                  </div>

                  {/* Softness */}
                  <div className="flex flex-1 min-w-[170px] items-center gap-2">
                    <label htmlFor="brush-softness" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      Mềm viền:
                    </label>
                    <input
                      id="brush-softness"
                      type="range"
                      min={0}
                      max={100}
                      value={brushSoftness}
                      onChange={(e) => setBrushSoftness(Number(e.target.value))}
                      className="flex-1 accent-rose-700"
                    />
                    <span className="w-8 text-right text-xs font-bold text-slate-700">{brushSoftness}%</span>
                  </div>

                  {/* Blend Mode for Brush */}
                  {recolorTool === 'brush' && (
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="recolor-blend" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        Chế độ tô:
                      </label>
                      <select
                        id="recolor-blend"
                        value={recolorBlendMode}
                        onChange={(e) => setRecolorBlendMode(e.target.value as 'solid' | 'color')}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 shadow-sm"
                      >
                        <option value="solid">Tô phủ màu (Normal - Mặc định)</option>
                        <option value="color">Đổi tông màu (Photoshop Color)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {recolorTool === 'bucket' && (
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-xs text-slate-600 font-medium">
                    👉 Bấm chuột vào bất kỳ điểm nào trên ảnh để đổ màu toàn bộ vùng liền kề đó.
                  </p>

                  <div className="flex flex-1 min-w-[200px] items-center gap-2">
                    <label htmlFor="bucket-tol" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      Độ nhạy màu
                    </label>
                    <input
                      id="bucket-tol"
                      type="range"
                      min={0}
                      max={100}
                      value={recolorTolerance}
                      onChange={(e) => setRecolorTolerance(Number(e.target.value))}
                      className="flex-1 accent-rose-700"
                    />
                    <span className="w-9 text-right text-xs font-bold text-slate-700">{recolorTolerance}%</span>
                  </div>
                </div>
              )}

              {recolorTool === 'replace' && (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveEyedropper(activeEyedropper === 'source' ? null : 'source')}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold transition-all ${
                        activeEyedropper === 'source'
                          ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Pipette className="h-3.5 w-3.5" />
                      Chấm màu gốc cần đổi
                    </button>

                    <div
                      className="h-7 w-7 rounded-md border border-slate-300 shadow-inner"
                      style={{
                        backgroundColor: pickedSourceColor
                          ? `rgb(${pickedSourceColor.join(',')})`
                          : 'transparent'
                      }}
                    />
                    {pickedSourceColor ? (
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {rgbToHex(pickedSourceColor[0], pickedSourceColor[1], pickedSourceColor[2])}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Chưa chọn</span>
                    )}
                  </div>

                  <div className="flex flex-1 min-w-[200px] items-center gap-2">
                    <label htmlFor="replace-tol" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      Độ nhạy màu
                    </label>
                    <input
                      id="replace-tol"
                      type="range"
                      min={0}
                      max={100}
                      value={recolorTolerance}
                      onChange={(e) => {
                        const tol = Number(e.target.value);
                        setRecolorTolerance(tol);
                        if (pickedSourceColor) {
                          redrawGlobalReplacePreview(pickedSourceColor, pickedTargetColor, tol, recolorBlendMode);
                        }
                      }}
                      className="flex-1 accent-rose-700"
                    />
                    <span className="w-9 text-right text-xs font-bold text-slate-700">{recolorTolerance}%</span>
                  </div>

                  {pickedSourceColor && (
                    <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {recolorMatchCount.toLocaleString()} điểm ảnh khớp màu
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: PUNCH COLOR */}
          {mode === 'punch_color' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Màu cần đục lỗ:</span>
                <div
                  className="h-7 w-7 rounded-md border border-slate-300 shadow-inner"
                  style={{
                    backgroundColor: punchPickedColor
                      ? `rgb(${punchPickedColor.join(',')})`
                      : 'transparent'
                  }}
                />
                {punchPickedColor ? (
                  <span className="text-xs font-mono font-semibold text-slate-700">
                    rgb({punchPickedColor.join(', ')})
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">Bấm vào màu trên ảnh để chọn</span>
                )}
              </div>

              <div className="flex flex-1 min-w-[200px] items-center gap-2">
                <label htmlFor="punch-tolerance" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  Độ nhạy màu
                </label>
                <input
                  id="punch-tolerance"
                  type="range"
                  min={0}
                  max={100}
                  value={punchTolerance}
                  onChange={(e) => {
                    const tol = Number(e.target.value);
                    setPunchTolerance(tol);
                    if (punchPickedColor) redrawPunchColorPreview(punchPickedColor, tol);
                  }}
                  className="flex-1 accent-rose-700"
                />
                <span className="w-10 text-right text-xs font-bold text-slate-700">{punchTolerance}%</span>
              </div>

              {punchPickedColor && (
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  {punchMatchCount.toLocaleString()} điểm ảnh khớp màu
                </span>
              )}
            </div>
          )}

          {/* TAB 2: PUNCH SLOT */}
          {mode === 'punch_slot' && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-rose-700">
                {slots.length} ô ảnh (slot) sẽ được đục lỗ trên khung hình (tự động mở rộng 3px để không dính mép viền trong).
              </p>
            </div>
          )}

          {/* TAB 3: CROP THEO KÍCH THƯỚC */}
          {mode === 'crop' && (
            <div className="flex flex-col gap-3">
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Tỷ lệ mẫu:</span>
                <button
                  type="button"
                  onClick={() => applyCropPreset('canvas')}
                  className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-all ${
                    cropPreset === 'canvas'
                      ? 'border-rose-700 bg-rose-50 text-rose-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Khớp Canvas ({canvasWidth} × {canvasHeight})
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('4:6')}
                  className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-all ${
                    cropPreset === '4:6'
                      ? 'border-rose-700 bg-rose-50 text-rose-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  4 : 6 Đứng (1200×1800)
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('6:4')}
                  className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-all ${
                    cropPreset === '6:4'
                      ? 'border-rose-700 bg-rose-50 text-rose-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  6 : 4 Ngang (1800×1200)
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('2:6')}
                  className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-all ${
                    cropPreset === '2:6'
                      ? 'border-rose-700 bg-rose-50 text-rose-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  2 : 6 Dải ảnh (600×1800)
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('1:1')}
                  className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-all ${
                    cropPreset === '1:1'
                      ? 'border-rose-700 bg-rose-50 text-rose-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  1 : 1 Vuông
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('free')}
                  className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-all ${
                    cropPreset === 'free'
                      ? 'border-rose-700 bg-rose-50 text-rose-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Tự do
                </button>
              </div>

              {/* Precise Dimensions Input */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="crop-w" className="text-xs font-bold text-slate-700">
                    Rộng (px):
                  </label>
                  <input
                    id="crop-w"
                    type="number"
                    min={20}
                    max={naturalSize.width}
                    value={cropRect.width}
                    onChange={(e) => handleCropWidthInput(Number(e.target.value))}
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-800 shadow-sm"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="crop-h" className="text-xs font-bold text-slate-700">
                    Cao (px):
                  </label>
                  <input
                    id="crop-h"
                    type="number"
                    min={20}
                    max={naturalSize.height}
                    value={cropRect.height}
                    onChange={(e) => handleCropHeightInput(Number(e.target.value))}
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-800 shadow-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setLockCropRatio(!lockCropRatio)}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-bold ${
                    lockCropRatio
                      ? 'border-rose-600 bg-rose-50 text-rose-800'
                      : 'border-slate-300 bg-white text-slate-600'
                  }`}
                  title={lockCropRatio ? 'Đang khóa tỷ lệ' : 'Mở khóa tỷ lệ'}
                >
                  {lockCropRatio ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  {lockCropRatio ? 'Khóa tỷ lệ' : 'Tự do'}
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                <button
                  type="button"
                  onClick={centerCropBox}
                  className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Căn giữa
                </button>

                <button
                  type="button"
                  onClick={fitAllCropBox}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Maximize2 className="h-3 w-3" />
                  Khớp toàn ảnh
                </button>

                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    checked={fitToCanvasOnApply}
                    onChange={(e) => setFitToCanvasOnApply(e.target.checked)}
                    className="h-4 w-4 accent-rose-700 rounded"
                  />
                  Tự động căn vừa kích thước Canvas ({canvasWidth} × {canvasHeight}) sau khi cắt
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-6 py-3.5">
          <div className="text-xs text-slate-500">
            {canUndo && <span className="text-slate-700 font-semibold">Đã vẽ nét mới (Ctrl+Z để hoàn tác)</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              Hủy
            </button>

            {/* Final Apply Button */}
            <button
              type="button"
              onClick={handleFinalApply}
              disabled={
                isProcessing ||
                (mode === 'punch_color' && !punchPickedColor && !canUndo) ||
                (mode === 'punch_slot' && slots.length === 0)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800 shadow-sm disabled:opacity-50"
            >
              <Scissors className="h-4 w-4" />
              {isProcessing ? 'Đang xử lý...' : 'Lưu & Áp dụng vào khung hình'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectRegionModal;
