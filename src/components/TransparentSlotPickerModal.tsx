import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MousePointer2, Sparkles, Trash2, X, Check, Layers } from 'lucide-react';
import { FrameSlot } from '../types/canvas';
import { findTransparentRegionAt, findAllTransparentRegions, TransparentSlotRegion } from '../utils/slotDetection';

interface TransparentSlotPickerModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
  onApply: (slots: FrameSlot[]) => void;
  onClose: () => void;
}

type SelectedRegion = {
  key: string;
  region: TransparentSlotRegion;
};

const CHECKER_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
  backgroundSize: '16px 16px',
  backgroundColor: '#1e293b'
};

const PREVIEW_MAX_EDGE = 900;

export const TransparentSlotPickerModal: React.FC<TransparentSlotPickerModalProps> = ({
  isOpen,
  imageUrl,
  canvasWidth,
  canvasHeight,
  onApply,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<ImageData | null>(null);
  const previewSizeRef = useRef({ width: 0, height: 0, imageWidth: 0, imageHeight: 0 });

  const [selectedRegions, setSelectedRegions] = useState<SelectedRegion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const drawPreview = useCallback((regions: SelectedRegion[]) => {
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    if (!canvas || !source) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.putImageData(source, 0, 0);

    regions.forEach(({ region }, index) => {
      context.save();
      // Semi-transparent overlay for picked slot
      context.fillStyle = 'rgba(225, 29, 72, 0.35)'; // Rose color tint
      context.strokeStyle = '#e11d48';
      context.lineWidth = Math.max(3, canvas.width / 250);
      context.fillRect(region.x, region.y, region.width, region.height);
      context.strokeRect(region.x, region.y, region.width, region.height);

      // Order badge in the center
      const cx = region.x + region.width / 2;
      const cy = region.y + region.height / 2;
      const badgeR = Math.max(16, Math.min(30, Math.round(Math.min(region.width, region.height) * 0.18)));

      context.fillStyle = 'rgba(15, 23, 42, 0.85)';
      context.beginPath();
      context.arc(cx, cy, badgeR, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.stroke();

      context.fillStyle = '#ffffff';
      context.font = `bold ${Math.round(badgeR * 1.25)}px sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(index + 1), cx, cy);
      context.restore();
    });
  }, []);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    let disposed = false;
    setSelectedRegions([]);
    setMessage(null);
    setIsLoading(true);
    sourceRef.current = null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (disposed) return;
      const naturalW = img.naturalWidth || canvasWidth;
      const naturalH = img.naturalHeight || canvasHeight;
      const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(naturalW, naturalH));
      const width = Math.max(1, Math.round(naturalW * scale));
      const height = Math.max(1, Math.round(naturalH * scale));

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, width, height);
      context.drawImage(img, 0, 0, width, height);

      sourceRef.current = context.getImageData(0, 0, width, height);
      previewSizeRef.current = { width, height, imageWidth: naturalW, imageHeight: naturalH };

      // Auto check if image has transparent regions and detect automatically on open
      const autoRegions = findAllTransparentRegions(sourceRef.current);
      if (autoRegions.length > 0) {
        const initial = autoRegions.map((reg) => ({
          key: `${reg.x}:${reg.y}:${reg.width}:${reg.height}`,
          region: reg
        }));
        setSelectedRegions(initial);
        drawPreview(initial);
        setMessage(`Đã tự động nhận diện ${initial.length} ô ảnh trong suốt.`);
      } else {
        drawPreview([]);
      }

      setIsLoading(false);
    };

    img.onerror = () => {
      if (disposed) return;
      setMessage('Không thể tải hình ảnh để nhận diện ô ảnh.');
      setIsLoading(false);
    };

    img.src = imageUrl;
    return () => {
      disposed = true;
    };
  }, [canvasHeight, canvasWidth, drawPreview, imageUrl, isOpen]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    if (!canvas || !source || isLoading) return;

    const bounds = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - bounds.left) * canvas.width) / bounds.width);
    const y = Math.floor(((event.clientY - bounds.top) * canvas.height) / bounds.height);

    const region = findTransparentRegionAt(source, x, y);
    if (!region) {
      setMessage('Vị trí bấm không thuộc vùng rỗng trong suốt của ô ảnh.');
      return;
    }

    const key = `${region.x}:${region.y}:${region.width}:${region.height}`;
    if (selectedRegions.some((item) => item.key === key)) {
      const next = selectedRegions.filter((item) => item.key !== key);
      setSelectedRegions(next);
      drawPreview(next);
      setMessage(null);
      return;
    }

    const unSorted = [...selectedRegions, { key, region }];
    // Sort top-to-bottom, left-to-right
    const next = unSorted.sort((a, b) => {
      if (Math.abs(a.region.y - b.region.y) > 15) return a.region.y - b.region.y;
      return a.region.x - b.region.x;
    });

    setSelectedRegions(next);
    drawPreview(next);
    setMessage(null);
  };

  const handleAutoDetectAll = () => {
    const source = sourceRef.current;
    if (!source) return;

    const autoRegions = findAllTransparentRegions(source);
    if (autoRegions.length === 0) {
      setMessage('Không tìm thấy vùng rỗng trong suốt nào trên ảnh.');
      return;
    }

    const next = autoRegions.map((reg) => ({
      key: `${reg.x}:${reg.y}:${reg.width}:${reg.height}`,
      region: reg
    }));

    setSelectedRegions(next);
    drawPreview(next);
    setMessage(`Đã nhận diện ${next.length} ô ảnh trong suốt.`);
  };

  const handleClear = () => {
    setSelectedRegions([]);
    setMessage(null);
    drawPreview([]);
  };

  const handleApply = () => {
    if (selectedRegions.length === 0) return;
    const sizes = previewSizeRef.current;
    if (!sizes.width || !sizes.height) return;

    const scaleX = canvasWidth / sizes.width;
    const scaleY = canvasHeight / sizes.height;

    // Expand outward 4px to completely clear the inner border edges
    const pad = 4;

    const slots: FrameSlot[] = selectedRegions.map(({ region }, index) => {
      const origX = Math.round(region.x * scaleX);
      const origY = Math.round(region.y * scaleY);
      const origR = Math.round((region.x + region.width) * scaleX);
      const origB = Math.round((region.y + region.height) * scaleY);

      const x = Math.max(0, origX - pad);
      const y = Math.max(0, origY - pad);
      const right = Math.min(canvasWidth, origR + pad);
      const bottom = Math.min(canvasHeight, origB + pad);

      return {
        id: `slot_${Date.now()}_${index + 1}`,
        x,
        y,
        width: Math.max(20, right - x),
        height: Math.max(20, bottom - y),
        rotation: 0,
        order: index + 1,
        visible: true,
        locked: false
      };
    });

    onApply(slots);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Nhận diện ô ảnh tự động"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600/20 text-rose-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Nhận diện ô ảnh tự động</h2>
              <p className="text-xs text-slate-400">
                Bấm vào các vùng rỗng trong suốt để chọn ô ảnh, hoặc bấm Quét tất cả.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-5">
          <div
            className="flex max-h-[58vh] min-h-64 items-center justify-center overflow-auto rounded-lg border border-dashed border-slate-700 p-3"
            style={CHECKER_STYLE}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="max-h-[54vh] max-w-full cursor-crosshair rounded shadow-lg"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <MousePointer2 className="h-4 w-4 text-rose-400" />
              <span>Click để chọn/bỏ chọn từng ô ảnh</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoDetectAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-600/20 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-600/30 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Quét tất cả
              </button>

              {selectedRegions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa chọn
                </button>
              )}

              <span className="inline-flex items-center gap-1 rounded-md bg-rose-950/80 px-2.5 py-1 text-xs font-black text-rose-300 border border-rose-800/50">
                <Layers className="h-3.5 w-3.5" />
                {selectedRegions.length} ô ảnh
              </span>
            </div>
          </div>

          {isLoading && (
            <p className="text-center text-xs font-bold text-rose-400 animate-pulse">
              Đang phân tích hình ảnh...
            </p>
          )}

          {message && (
            <p className="text-center text-xs font-bold text-amber-300">
              {message}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
          <p className="text-[11px] text-slate-400">
            * Các ô ảnh được mở rộng viền tự động thêm 4px để không bị dính mép viền trong.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={selectedRegions.length === 0 || isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-900/30 transition-all active:scale-95"
            >
              <Check className="h-4 w-4" />
              Áp dụng ({selectedRegions.length} ô ảnh)
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
