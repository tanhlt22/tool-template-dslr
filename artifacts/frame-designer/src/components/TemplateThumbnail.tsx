import React, { useRef, useState, useLayoutEffect } from 'react';
import { getCloudinaryThumbnailUrl } from '../utils/cloudinary';

export const TemplateThumbnail: React.FC<{ frame: any; scale?: number; fitParent?: boolean }> = ({ 
  frame, 
  scale = 1,
  fitParent = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!fitParent || !containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          w: Math.max(0, rect.width - 32),
          h: Math.max(0, rect.height - 32)
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitParent]);

  const image = getCloudinaryThumbnailUrl(
    frame.background_image_url || frame.backgroundImageUrl, 
    fitParent ? 1200 : Math.round(240 * scale)
  );
  const width = Number(frame.width) || 1200;
  const height = Number(frame.height) || 1800;
  const isLandscape = width > height;

  if (fitParent) {
    const { w: containerW, h: containerH } = containerSize;
    
    // Compute exact fit scale based on measured parent pixel dimensions
    const fitScale = (containerW > 0 && containerH > 0)
      ? Math.min(containerW / width, containerH / height)
      : 0.2;

    const renderWidth = Math.round(width * fitScale);
    const renderHeight = Math.round(height * fitScale);

    return (
      <div ref={containerRef} className="flex items-center justify-center w-full h-full min-h-0 min-w-0 p-4 overflow-hidden">
        {renderWidth > 0 && renderHeight > 0 && (
          <div
            className="relative rounded-lg border border-slate-300 bg-[#f8eee5] shadow-lg overflow-hidden transition-all flex-none"
            style={{
              width: renderWidth,
              height: renderHeight,
              backgroundImage: image ? `url("${image}")` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {frame.slots?.map((slot: any, index: number) => (
              <div
                key={slot.id || index}
                className="absolute flex items-center justify-center rounded-sm border border-slate-400/60 bg-slate-200/80 text-xs md:text-sm font-black text-rose-800 shadow-xs backdrop-blur-[1px]"
                style={{
                  left: `${(slot.x / width) * 100}%`,
                  top: `${(slot.y / height) * 100}%`,
                  width: `${(slot.width / width) * 100}%`,
                  height: `${(slot.height / height) * 100}%`
                }}
              >
                {slot.order || index + 1}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const baseSize = 92 * scale;

  return (
    <div className="flex items-center justify-center rounded-md bg-slate-100 p-2 w-full" style={{ height: 112 * scale }}>
      <div
        className="relative overflow-hidden rounded-sm border border-slate-200 bg-[#f8eee5] shadow-sm"
        style={{
          width: isLandscape ? baseSize : Math.max(42 * scale, Math.round((width / height) * baseSize)),
          height: isLandscape ? Math.max(42 * scale, Math.round((height / width) * baseSize)) : baseSize,
          backgroundImage: image ? `url("${image}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {frame.slots?.map((slot: any, index: number) => (
          <div
            key={slot.id || index}
            className="absolute flex items-center justify-center rounded-[2px] border border-slate-300 bg-slate-200 text-[10px] font-black text-rose-800"
            style={{
              left: `${(slot.x / width) * 100}%`,
              top: `${(slot.y / height) * 100}%`,
              width: `${(slot.width / width) * 100}%`,
              height: `${(slot.height / height) * 100}%`
            }}
          >
            {slot.order || index + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

