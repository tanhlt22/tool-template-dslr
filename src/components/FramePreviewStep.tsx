import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileArchive, Loader2 } from 'lucide-react';
import { FrameElement, FrameSlot } from '../types/canvas';
import { generateClientBase64 } from '../utils/canvasRenderer';

interface FramePreviewStepProps {
  frameName: string;
  width: number;
  height: number;
  slots: FrameSlot[];
  elements: FrameElement[];
  backgroundType: 'color' | 'gradient' | 'ai';
  backgroundColor: string;
  bgGradient: string;
  bgImageUrl: string | null;
  isExporting: boolean;
  isExportingZip: boolean;
  onBack: () => void;
  onExportPNG: () => void;
  onExportZip: () => void;
}

export const FramePreviewStep: React.FC<FramePreviewStepProps> = ({
  frameName,
  width,
  height,
  slots,
  elements,
  backgroundType,
  backgroundColor,
  bgGradient,
  bgImageUrl,
  isExporting,
  isExportingZip,
  onBack,
  onExportPNG,
  onExportZip
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsRendering(true);
    void generateClientBase64(width, height, slots, elements, {
      backgroundType,
      backgroundColor,
      bgGradient,
      bgImageUrl
    }).then((url) => {
      if (!cancelled) {
        setPreviewUrl(url);
        setIsRendering(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [backgroundColor, backgroundType, bgGradient, bgImageUrl, elements, height, slots, width]);

  const isLandscape = width > height;

  const renderMockupCard = (itemIndex: number, isHero: boolean = false) => (
    <div
      className={`relative overflow-hidden rounded-md bg-[#f8eee5] shadow-xl ring-1 ring-slate-900/10 transition-all duration-300 ${
        isHero ? 'shadow-2xl ring-slate-900/15' : 'hover:scale-[1.02]'
      }`}
      style={{
        height: isLandscape ? 'clamp(140px, 22vh, 230px)' : 'clamp(200px, 32vh, 320px)',
        aspectRatio: `${width} / ${height}`,
        maxWidth: '85vw'
      }}
    >
      {isRendering && itemIndex === 1 ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400 p-4">
          <Loader2 className="h-6 w-6 animate-spin text-rose-700" aria-hidden="true" />
          <span className="text-[11px] font-bold text-slate-500">Đang tạo xem trước...</span>
        </div>
      ) : previewUrl ? (
        <img
          src={previewUrl}
          alt={`Xem trước ${frameName}`}
          className="h-full w-full object-contain pointer-events-none select-none"
          style={{
            imageRendering: '-webkit-optimize-contrast',
            transform: 'translateZ(0)'
          }}
          width={width}
          height={height}
        />
      ) : (
        <div className="h-full w-full bg-slate-100 flex items-center justify-center">
          <div className="h-6 w-6 animate-pulse rounded bg-slate-200" />
        </div>
      )}
    </div>
  );

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-y-auto overflow-x-hidden custom-scrollbar">
      {/* Sticky Header with responsive padding */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 sm:px-6 py-2.5 sm:py-3.5 backdrop-blur-md shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 transition-colors shadow-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          <span>Trở về</span>
        </button>

        <div className="text-right min-w-0 max-w-[220px] sm:max-w-md">
          <h1 className="truncate text-xs sm:text-base font-black text-slate-900" title={frameName}>
            {frameName || 'Mẫu thiết kế'}
          </h1>
          <p className="truncate text-[10px] sm:text-xs font-semibold text-slate-500">
            {width} × {height}px • {slots.length} ô ảnh
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 sm:gap-8 px-3 sm:px-6 py-4 sm:py-6 max-w-5xl mx-auto w-full">
        {/* Mockups Showcase */}
        <div className="flex w-full items-center justify-center gap-3 sm:gap-6 md:gap-8 py-2">
          {/* Left tilted card (desktop only) */}
          <div className="hidden md:flex justify-center -rotate-6 opacity-75 hover:opacity-100 hover:rotate-0 transition-all duration-300 flex-none">
            {renderMockupCard(0)}
          </div>

          {/* Center main hero card (always shown) */}
          <div className="flex justify-center z-10 scale-100 sm:scale-105 transition-transform duration-300 flex-none">
            {renderMockupCard(1, true)}
          </div>

          {/* Right tilted card (desktop only) */}
          <div className="hidden md:flex justify-center rotate-6 opacity-75 hover:opacity-100 hover:rotate-0 transition-all duration-300 flex-none">
            {renderMockupCard(2)}
          </div>
        </div>

        {/* Export Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full max-w-2xl pb-8 sm:pb-12">
          {/* PNG Export Card */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-colors">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-rose-800">
                    <Download className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-black">Xuất file PNG</h3>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Ảnh trong suốt
                </span>
              </div>
              <p className="mb-4 text-xs font-medium leading-relaxed text-slate-500">
                Lưu khung hình dưới dạng ảnh nền trong suốt (PNG). Phù hợp gửi cho khách xem trước hoặc thiết kế tiếp ở Photoshop, Canva.
              </p>
            </div>
            <button
              type="button"
              onClick={onExportPNG}
              disabled={isExporting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] disabled:opacity-50 transition-all shadow-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin text-rose-700" aria-hidden="true" /> : <Download className="h-4 w-4 text-rose-700" aria-hidden="true" />}
              <span>{isExporting ? 'Đang xuất PNG...' : 'Tải file PNG'}</span>
            </button>
          </div>

          {/* DSLRBooth Export Card */}
          <div className="flex flex-col justify-between rounded-xl border border-rose-200 bg-rose-50/40 p-4 sm:p-5 shadow-sm hover:border-rose-300 transition-colors">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-rose-950">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                    <FileArchive className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-black">Xuất gói DSLRBooth</h3>
                </div>
                <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                  Trọn gói Kiosk
                </span>
              </div>
              <p className="mb-4 text-xs font-medium leading-relaxed text-rose-900/80">
                Đóng gói thành tệp nén <strong>.zip</strong> chứa đầy đủ file cấu hình XML và lớp phủ. Chỉ cần ném (Import) trực tiếp vào DSLRBooth là chụp ngay.
              </p>
            </div>
            <button
              type="button"
              onClick={onExportZip}
              disabled={isExportingZip}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-700 to-rose-800 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white hover:from-rose-800 hover:to-rose-900 active:scale-[0.99] disabled:opacity-50 transition-all shadow-md shadow-rose-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              {isExportingZip ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileArchive className="h-4 w-4" aria-hidden="true" />}
              <span>{isExportingZip ? 'Đang đóng gói ZIP...' : 'Tải file DSLR (.zip)'}</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};
