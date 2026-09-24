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

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-rose-900 px-4 py-2 text-sm font-bold text-rose-900 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Trở về
        </button>
        <div className="hidden text-right sm:block">
          <h1 className="text-base font-black text-slate-950">{frameName}</h1>
          <p className="text-xs font-semibold text-slate-500">
            {width} x {height}px | {slots.length} ô ảnh
          </p>
        </div>
      </div>

      <section className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-10">
        <div className="grid w-full max-w-5xl items-end gap-10 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className={`flex justify-center ${item === 0 ? '-rotate-12 opacity-80' : item === 2 ? 'rotate-12 opacity-80' : ''}`}
            >
              <div
                className="relative overflow-hidden rounded-sm bg-slate-100 shadow-2xl ring-1 ring-slate-200"
                style={{
                  width: isLandscape ? 340 : Math.max(140, Math.round((width / height) * 360)),
                  height: isLandscape ? Math.max(140, Math.round((height / width) * 340)) : 360
                }}
              >
                {isRendering && item === 1 ? (
                  <div className="flex h-full w-full items-center justify-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={`Xem trước ${frameName}`}
                    className="h-full w-full object-contain shadow-inner"
                    width={width}
                    height={height}
                  />
                ) : (
                  <div className="h-full w-full bg-slate-100" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <div className="mb-2 flex items-center gap-2 text-slate-900">
                <Download className="h-5 w-5 text-rose-800" />
                <h3 className="text-sm font-black">Xuất file PNG</h3>
              </div>
              <p className="mb-6 text-xs font-medium leading-relaxed text-slate-500">
                Lưu khung hình dưới dạng ảnh có nền trong suốt (PNG). Phù hợp để gửi cho khách hàng xem trước mẫu, hoặc mang sang thiết kế tiếp ở Photoshop, Canva.
              </p>
            </div>
            <button
              type="button"
              onClick={onExportPNG}
              disabled={isExporting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              Tải file PNG
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-between rounded-xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm">
            <div>
              <div className="mb-2 flex items-center gap-2 text-rose-900">
                <FileArchive className="h-5 w-5" />
                <h3 className="text-sm font-black">Xuất file DSLRBooth</h3>
              </div>
              <p className="mb-6 text-xs font-medium leading-relaxed text-rose-700/80">
                Đóng gói thành tệp nén <strong>.zip</strong> chứa đầy đủ file cấu hình XML (kích thước, tọa độ ảnh) và lớp phủ. Chỉ cần ném (Import) trực tiếp vào phần mềm DSLRBooth là dùng được ngay.
              </p>
            </div>
            <button
              type="button"
              onClick={onExportZip}
              disabled={isExportingZip}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-rose-800 px-5 py-3 text-sm font-black text-white hover:bg-rose-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              {isExportingZip ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileArchive className="h-4 w-4" aria-hidden="true" />}
              Tải file DSLR (.zip)
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};
