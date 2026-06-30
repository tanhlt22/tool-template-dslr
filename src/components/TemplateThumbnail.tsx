import React from 'react';

export const TemplateThumbnail: React.FC<{ frame: any; scale?: number }> = ({ frame, scale = 1 }) => {
  const image = frame.background_image_url || frame.backgroundImageUrl;
  const width = frame.width || 1200;
  const height = frame.height || 1800;
  const isLandscape = width > height;

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
