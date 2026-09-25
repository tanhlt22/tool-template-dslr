import React, { useRef, useState, useLayoutEffect } from 'react';
import { getAssetUrl } from '../utils/storage';

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

  const rawBg = frame.background_image_url || frame.backgroundImageUrl || frame.thumbnail_url || frame.thumbnailUrl;
  const image = getAssetUrl(rawBg) || rawBg;
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
            }}
          >
            {/* Crisp background image using native img tag */}
            {image && (
              <img
                src={image}
                alt={frame.name || 'Frame'}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              />
            )}

            {/* 1. Slot Placeholder Boxes */}
            {frame.slots?.map((slot: any, index: number) => (
              <div
                key={slot.id || `slot_box_${index}`}
                className="absolute rounded-sm border border-slate-400/60 bg-slate-200/80 shadow-xs backdrop-blur-[1px]"
                style={{
                  left: `${(slot.x / width) * 100}%`,
                  top: `${(slot.y / height) * 100}%`,
                  width: `${(slot.width / width) * 100}%`,
                  height: `${(slot.height / height) * 100}%`
                }}
              />
            ))}

            {/* 2. All Elements in exact array order */}
            {frame.elements?.map((el: any, index: number) => {
              if (el.visible === false) return null;
              const leftPct = (el.x / width) * 100;
              const topPct = (el.y / height) * 100;
              const widthPct = (el.width / width) * 100;
              const heightPct = (el.height / height) * 100;
              const rotation = el.rotation || 0;

              if (el.type === 'text') {
                return (
                  <div
                    key={el.id || `text_${index}`}
                    className="absolute pointer-events-none flex items-center justify-center overflow-hidden whitespace-nowrap"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      transform: rotation ? `rotate(${rotation}deg)` : undefined,
                      transformOrigin: 'center center',
                      color: el.style?.color || '#ffffff',
                      fontFamily: el.style?.fontFamily || 'Outfit',
                      fontSize: `${(el.style?.fontSize || 24) * (renderHeight / height)}px`,
                      fontWeight: el.style?.fontWeight || 'bold'
                    }}
                  >
                    {el.content}
                  </div>
                );
              }

              if (el.content) {
                const elSrc = getAssetUrl(el.content) || el.content;
                return (
                  <img
                    key={el.id || `el_${index}`}
                    src={elSrc}
                    alt={el.fileName || 'element'}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      transform: rotation ? `rotate(${rotation}deg)` : undefined,
                      transformOrigin: 'center center',
                      objectFit: el.id === 'background_frame' ? 'cover' : 'fill',
                      imageRendering: '-webkit-optimize-contrast'
                    }}
                  />
                );
              }

              return null;
            })}

            {/* 3. Slot Number Labels */}
            {frame.slots?.map((slot: any, index: number) => (
              <div
                key={slot.id || `slot_label_${index}`}
                className="absolute pointer-events-none flex items-center justify-center text-xs md:text-sm font-black text-rose-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]"
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

  const containerH = Math.round(112 * scale);
  const maxThumbH = containerH - 12;
  const maxThumbW = Math.round(120 * scale);

  let thumbW: number;
  let thumbH: number;
  if (isLandscape) {
    thumbW = Math.min(maxThumbW, Math.round((width / height) * maxThumbH));
    thumbH = Math.round((height / width) * thumbW);
    if (thumbH > maxThumbH) {
      thumbH = maxThumbH;
      thumbW = Math.round((width / height) * thumbH);
    }
  } else {
    thumbH = maxThumbH;
    thumbW = Math.round((width / height) * thumbH);
    if (thumbW > maxThumbW) {
      thumbW = maxThumbW;
      thumbH = Math.round((height / width) * thumbW);
    }
  }

  return (
    <div className="flex items-center justify-center rounded-md bg-slate-100 p-2 w-full" style={{ height: containerH }}>
      <div
        className="relative overflow-hidden rounded-sm border border-slate-200 bg-[#f8eee5] shadow-sm flex-none"
        style={{
          width: thumbW,
          height: thumbH,
        }}
      >
        {/* Crisp background image via img tag */}
        {image && (
          <img
            src={image}
            alt={frame.name || 'Frame'}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            style={{
              imageRendering: '-webkit-optimize-contrast',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
            loading="lazy"
          />
        )}
        {/* ONLY Render Elements in exact array order - NO slots, NO slot labels! */}
        {frame.elements?.map((el: any, index: number) => {
          if (el.visible === false) return null;
          const leftPct = (el.x / width) * 100;
          const topPct = (el.y / height) * 100;
          const widthPct = (el.width / width) * 100;
          const heightPct = (el.height / height) * 100;
          const rotation = el.rotation || 0;

          if (el.type === 'text') {
            return (
              <div
                key={el.id || `text_${index}`}
                className="absolute pointer-events-none flex items-center justify-center overflow-hidden whitespace-nowrap"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  transform: rotation ? `rotate(${rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                  color: el.style?.color || '#ffffff',
                  fontFamily: el.style?.fontFamily || 'Outfit',
                  fontSize: `${(el.style?.fontSize || 24) * (thumbH / height)}px`,
                  fontWeight: el.style?.fontWeight || 'bold'
                }}
              >
                {el.content}
              </div>
            );
          }

          if (el.content) {
            const elSrc = getAssetUrl(el.content) || el.content;
            return (
              <img
                key={el.id || `el_${index}`}
                src={elSrc}
                alt={el.fileName || 'element'}
                className="absolute pointer-events-none"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  transform: rotation ? `rotate(${rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                  objectFit: el.id === 'background_frame' ? 'cover' : 'fill'
                }}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
