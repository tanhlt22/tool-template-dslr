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

  const bgElements = frame.elements?.filter((el: any) => el.id === 'background_frame' || (el.style?.order !== undefined && el.style?.order < 0)) || [];
  const fgElements = frame.elements?.filter((el: any) => el.id !== 'background_frame' && (el.style?.order === undefined || el.style?.order >= 0)) || [];

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
            {/* 1. Background elements */}
            {bgElements.map((el: any, index: number) => {
              if (el.visible === false) return null;
              return (
                <img
                  key={el.id || `bg_${index}`}
                  src={el.content}
                  alt={el.fileName || 'bg'}
                  className="absolute object-cover pointer-events-none"
                  style={{
                    left: `${(el.x / width) * 100}%`,
                    top: `${(el.y / height) * 100}%`,
                    width: `${(el.width / width) * 100}%`,
                    height: `${(el.height / height) * 100}%`,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    transformOrigin: 'center center'
                  }}
                />
              );
            })}

            {/* 2. Slot Placeholder Boxes */}
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

            {/* 3. Foreground elements (stickers, overlay frames, text) */}
            {fgElements.map((el: any, index: number) => {
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
                return (
                  <img
                    key={el.id || `fg_${index}`}
                    src={el.content}
                    alt={el.fileName || 'element'}
                    className="absolute object-contain pointer-events-none"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      transform: rotation ? `rotate(${rotation}deg)` : undefined,
                      transformOrigin: 'center center'
                    }}
                  />
                );
              }

              return null;
            })}

            {/* 4. Slot Number Labels (ALWAYS ON TOP of all layers) */}
            {frame.slots?.map((slot: any, index: number) => (
              <div
                key={slot.id || `slot_label_${index}`}
                className="absolute pointer-events-none flex items-center justify-center text-xs md:text-sm font-black text-rose-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"
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

  const bgElements = frame.elements?.filter((el: any) => el.id === 'background_frame' || (el.style?.order !== undefined && el.style?.order < 0)) || [];
  const fgElements = frame.elements?.filter((el: any) => el.id !== 'background_frame' && (el.style?.order === undefined || el.style?.order >= 0)) || [];

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
            {/* 1. Background elements */}
            {bgElements.map((el: any, index: number) => {
              if (el.visible === false) return null;
              return (
                <img
                  key={el.id || `bg_${index}`}
                  src={el.content}
                  alt={el.fileName || 'bg'}
                  className="absolute object-cover pointer-events-none"
                  style={{
                    left: `${(el.x / width) * 100}%`,
                    top: `${(el.y / height) * 100}%`,
                    width: `${(el.width / width) * 100}%`,
                    height: `${(el.height / height) * 100}%`,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    transformOrigin: 'center center'
                  }}
                />
              );
            })}

            {/* 2. Slot Placeholder Boxes */}
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

            {/* 3. Foreground elements (stickers, overlay frames, text) */}
            {fgElements.map((el: any, index: number) => {
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
                return (
                  <img
                    key={el.id || `fg_${index}`}
                    src={el.content}
                    alt={el.fileName || 'element'}
                    className="absolute object-contain pointer-events-none"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      transform: rotation ? `rotate(${rotation}deg)` : undefined,
                      transformOrigin: 'center center'
                    }}
                  />
                );
              }

              return null;
            })}

            {/* 4. Slot Number Labels (ALWAYS ON TOP of all layers) */}
            {frame.slots?.map((slot: any, index: number) => (
              <div
                key={slot.id || `slot_label_${index}`}
                className="absolute pointer-events-none flex items-center justify-center text-xs md:text-sm font-black text-rose-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"
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
  const thumbW = isLandscape ? baseSize : Math.max(42 * scale, Math.round((width / height) * baseSize));
  const thumbH = isLandscape ? Math.max(42 * scale, Math.round((height / width) * baseSize)) : baseSize;

  return (
    <div className="flex items-center justify-center rounded-md bg-slate-100 p-2 w-full" style={{ height: 112 * scale }}>
      <div
        className="relative overflow-hidden rounded-sm border border-slate-200 bg-[#f8eee5] shadow-sm flex-none"
        style={{
          width: thumbW,
          height: thumbH,
          backgroundImage: image ? `url("${image}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* 1. Background elements */}
        {bgElements.map((el: any, index: number) => {
          if (el.visible === false) return null;
          return (
            <img
              key={el.id || `bg_${index}`}
              src={el.content}
              alt={el.fileName || 'bg'}
              className="absolute object-cover pointer-events-none"
              style={{
                left: `${(el.x / width) * 100}%`,
                top: `${(el.y / height) * 100}%`,
                width: `${(el.width / width) * 100}%`,
                height: `${(el.height / height) * 100}%`,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                transformOrigin: 'center center'
              }}
            />
          );
        })}

        {/* 2. Foreground elements (stickers, overlay frames, text) - ONLY image design, NO slots */}
        {fgElements.map((el: any, index: number) => {
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
            return (
              <img
                key={el.id || `fg_${index}`}
                src={el.content}
                alt={el.fileName || 'element'}
                className="absolute object-contain pointer-events-none"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  transform: rotation ? `rotate(${rotation}deg)` : undefined,
                  transformOrigin: 'center center'
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
