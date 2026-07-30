import React from 'react';
import { getCloudinaryThumbnailUrl } from '../utils/cloudinary';

export const TemplateThumbnail: React.FC<{ frame: any; scale?: number; fitParent?: boolean }> = ({ 
  frame, 
  scale = 1,
  fitParent = false
}) => {
  const image = getCloudinaryThumbnailUrl(
    frame.background_image_url || frame.backgroundImageUrl, 
    fitParent ? 1200 : Math.round(240 * scale)
  );
  const width = Number(frame.width) || 1200;
  const height = Number(frame.height) || 1800;
  const isLandscape = width > height;

  if (fitParent) {
    // Generate a transparent SVG with viewBox to force the browser to maintain aspect ratio flawlessly
    const svgDataUri = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' width='${width}' height='${height}'%3E%3C/svg%3E`;

    return (
      <div className="flex items-center justify-center w-full h-full min-h-0 min-w-0 p-2 md:p-4 overflow-hidden">
        <div className="relative flex max-w-full max-h-full rounded-lg border border-slate-300 bg-[#f8eee5] shadow-lg overflow-hidden transition-all">
          
          {/* Spacer Image ensures perfect scaling */}
          <img 
            src={svgDataUri} 
            alt="spacer" 
            className="block max-w-full max-h-full w-auto h-auto opacity-0 pointer-events-none" 
          />

          {/* Absolute content container */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
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
        </div>
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
          backgroundImage: image ? `url(${image})` : undefined,
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

