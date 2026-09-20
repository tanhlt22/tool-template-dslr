import React, { useEffect, useRef, useState } from 'react';
import { Pipette, Scissors, Square, X } from 'lucide-react';
import { FrameElement, FrameSlot } from '../types/canvas';

interface SelectRegionModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
  slots: FrameSlot[];
  targetElement: FrameElement | null;
  onClose: () => void;
  onApply: (dataUrl: string, resetToCanvasSize: boolean) => void;
}

type RegionMode = 'color' | 'slot';

const CHECKER_SIZE = 8;
const CHECKER_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
  backgroundPosition: `0 0, 0 ${CHECKER_SIZE}px, ${CHECKER_SIZE}px -${CHECKER_SIZE}px, -${CHECKER_SIZE}px 0px`
};

function distance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export const SelectRegionModal: React.FC<SelectRegionModalProps> = ({
  isOpen,
  imageUrl,
  canvasWidth,
  canvasHeight,
  slots,
  targetElement,
  onClose,
  onApply
}) => {
  const [mode, setMode] = useState<RegionMode>('color');

  // --- Color mode state ---
  const colorCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceDataRef = useRef<ImageData | null>(null);
  const [tolerance, setTolerance] = useState(10);
  const [pickedColor, setPickedColor] = useState<[number, number, number] | null>(null);
  const [matchCount, setMatchCount] = useState(0);

  // --- Slot mode state ---
  const slotCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    setPickedColor(null);
    setMatchCount(0);
    setTolerance(10);
    setMode('color');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = colorCanvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          sourceDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
      }
      drawSlotPreview(img);
    };
    img.src = imageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, imageUrl]);

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

  const redrawColorPreview = (color: [number, number, number] | null, tol: number) => {
    const canvas = colorCanvasRef.current;
    const source = sourceDataRef.current;
    if (!canvas || !source) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const preview = ctx.createImageData(source.width, source.height);
    preview.data.set(source.data);

    let matches = 0;
    if (color) {
      const [pr, pg, pb] = color;
      const threshold = (tol / 100) * 441.7; // max RGB distance ~= sqrt(3*255^2)
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
    setMatchCount(matches);
  };

  const handleColorCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = colorCanvasRef.current;
    const source = sourceDataRef.current;
    if (!canvas || !source) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);
    if (x < 0 || y < 0 || x >= source.width || y >= source.height) return;

    const idx = (y * source.width + x) * 4;
    const color: [number, number, number] = [source.data[idx], source.data[idx + 1], source.data[idx + 2]];
    setPickedColor(color);
    redrawColorPreview(color, tolerance);
  };

  const handleToleranceChange = (value: number) => {
    setTolerance(value);
    if (pickedColor) redrawColorPreview(pickedColor, value);
  };

  const handleApplyColor = () => {
    const source = sourceDataRef.current;
    if (!source || !pickedColor) return;
    setIsProcessing(true);

    const [pr, pg, pb] = pickedColor;
    const threshold = (tolerance / 100) * 441.7;
    const output = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
    const data = output.data;
    const w = source.width;
    const h = source.height;

    // 1. Tạo mask các pixel khớp màu
    const matchMask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const pi = i * 4;
      if (data[pi + 3] > 0 && distance(data[pi], data[pi + 1], data[pi + 2], pr, pg, pb) <= threshold) {
        matchMask[i] = 1;
      }
    }

    // 2. Mở rộng vùng đục lỗ ra ngoài 1-2px (dilation) để khử hoàn toàn viền trong / mép răng cưa
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
    if (!outCtx) {
      setIsProcessing(false);
      return;
    }
    outCtx.putImageData(output, 0, 0);
    setIsProcessing(false);
    onApply(outCanvas.toDataURL('image/png'), false);
  };

  const handleApplySlots = () => {
    if (slots.length === 0 || !imageUrl) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      if (targetElement) {
        ctx.save();
        ctx.translate(targetElement.x, targetElement.y);
        ctx.rotate(((targetElement.rotation || 0) * Math.PI) / 180);
        ctx.drawImage(img, 0, 0, targetElement.width, targetElement.height);
        ctx.restore();
      } else {
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      }

      ctx.globalCompositeOperation = 'destination-out';
      // Mở rộng viền đục lỗ ra ngoài 3px để không dính mép viền trong
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

      setIsProcessing(false);
      onApply(canvas.toDataURL('image/png'), true);
    };
    img.onerror = () => setIsProcessing(false);
    img.src = imageUrl;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <Scissors className="h-4 w-4 text-rose-700" aria-hidden="true" />
              Đục lỗ khung hình
            </h2>
            <p className="text-xs font-medium text-slate-500">
              {mode === 'color'
                ? 'Bấm vào một điểm màu trên ảnh để chọn, sau đó bấm "Đục lỗ" để xóa tất cả vùng cùng màu đó (tự động mở rộng viền khử răng cưa).'
                : 'Xem trước các ô ảnh sẽ được đục lỗ trên khung hình (mở rộng thêm 3px để tránh dính mép viền trong), rồi bấm "Đục lỗ" để áp dụng.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="inline-flex w-fit items-center gap-1 rounded-md border border-slate-300 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setMode('color')}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                mode === 'color' ? 'bg-white text-rose-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pipette className="h-3.5 w-3.5" aria-hidden="true" />
              Theo màu
            </button>
            <button
              type="button"
              onClick={() => setMode('slot')}
              disabled={slots.length === 0}
              title={slots.length === 0 ? 'Cần thêm ít nhất 1 ô ảnh (slot)' : undefined}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                mode === 'slot' ? 'bg-white text-rose-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Square className="h-3.5 w-3.5" aria-hidden="true" />
              Theo khung (slot)
            </button>
          </div>

          <div
            className="mx-auto flex max-h-[420px] w-full items-center justify-center overflow-auto rounded-md border border-dashed border-slate-300 bg-[length:16px_16px] p-2"
            style={CHECKER_STYLE}
          >
            <canvas
              ref={colorCanvasRef}
              onClick={handleColorCanvasClick}
              className={`max-h-[400px] max-w-full ${mode === 'color' ? 'block cursor-crosshair' : 'hidden'}`}
            />
            <canvas ref={slotCanvasRef} className={`max-h-[400px] max-w-full ${mode === 'slot' ? 'block' : 'hidden'}`} />
          </div>

          {mode === 'color' ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Màu đã chọn:</span>
                <div
                  className="h-6 w-6 rounded border border-slate-300"
                  style={{ backgroundColor: pickedColor ? `rgb(${pickedColor.join(',')})` : 'transparent' }}
                />
                {!pickedColor && <span className="text-xs text-slate-400">Chưa chọn</span>}
              </div>

              <div className="flex flex-1 min-w-[180px] items-center gap-2">
                <label htmlFor="color-tolerance" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  Độ nhạy màu
                </label>
                <input
                  id="color-tolerance"
                  type="range"
                  min={0}
                  max={100}
                  value={tolerance}
                  onChange={(event) => handleToleranceChange(Number(event.target.value))}
                  className="flex-1"
                />
                <span className="w-9 text-right text-xs font-bold text-slate-700">{tolerance}%</span>
              </div>

              {pickedColor && (
                <span className="text-xs font-semibold text-rose-700">{matchCount.toLocaleString()} điểm ảnh được chọn</span>
              )}
            </div>
          ) : (
            <p className="text-xs font-semibold text-rose-700">{slots.length} ô ảnh (slot) sẽ được đục lỗ trên khung.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={mode === 'color' ? handleApplyColor : handleApplySlots}
            disabled={isProcessing || (mode === 'color' ? !pickedColor : slots.length === 0)}
            className="inline-flex items-center gap-2 rounded-md bg-rose-800 px-4 py-2 text-sm font-bold text-white hover:bg-rose-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <Scissors className="h-4 w-4" aria-hidden="true" />
            {isProcessing ? 'Đang xử lý...' : 'Đục lỗ'}
          </button>
        </div>
      </div>
    </div>
  );
};
