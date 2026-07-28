import React, { useEffect, useRef, useState } from 'react';
import { Pipette, Scissors, X } from 'lucide-react';

interface ColorPunchModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
  onApply: (dataUrl: string) => void;
}

const CHECKER_SIZE = 8;

function distance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export const ColorPunchModal: React.FC<ColorPunchModalProps> = ({ isOpen, imageUrl, onClose, onApply }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceDataRef = useRef<ImageData | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [pickedColor, setPickedColor] = useState<[number, number, number] | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    setPickedColor(null);
    setMatchCount(0);
    setTolerance(30);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      sourceDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  const redrawPreview = (color: [number, number, number] | null, tol: number) => {
    const canvas = canvasRef.current;
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
          // Highlight selected pixels in translucent red for the live preview
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

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
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
    redrawPreview(color, tolerance);
  };

  const handleToleranceChange = (value: number) => {
    setTolerance(value);
    if (pickedColor) redrawPreview(pickedColor, value);
  };

  const handleApply = () => {
    const source = sourceDataRef.current;
    if (!source || !pickedColor) return;
    setIsProcessing(true);

    const [pr, pg, pb] = pickedColor;
    const threshold = (tolerance / 100) * 441.7;
    const output = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
    const data = output.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (distance(r, g, b, pr, pg, pb) <= threshold) {
        data[i + 3] = 0;
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
    const dataUrl = outCanvas.toDataURL('image/png');
    setIsProcessing(false);
    onApply(dataUrl);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <Pipette className="h-4 w-4 text-rose-700" aria-hidden="true" />
              Chọn màu để đục lỗ
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Bấm vào một điểm màu trên ảnh để chọn, sau đó bấm "Đục lỗ" để xoá tất cả vùng cùng màu đó.
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
          <div
            className="mx-auto flex max-h-[420px] w-full items-center justify-center overflow-auto rounded-md border border-dashed border-slate-300 bg-[length:16px_16px] p-2"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
              backgroundPosition: `0 0, 0 ${CHECKER_SIZE}px, ${CHECKER_SIZE}px -${CHECKER_SIZE}px, -${CHECKER_SIZE}px 0px`
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="max-h-[400px] max-w-full cursor-crosshair"
            />
          </div>

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
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!pickedColor || isProcessing}
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
