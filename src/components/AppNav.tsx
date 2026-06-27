import React from 'react';
import { Camera } from 'lucide-react';

export const AppNav: React.FC = () => {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-800 text-white">
        <Camera className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black tracking-tight text-slate-900">Tanh Photobooth</p>
        <p className="truncate text-[10px] font-semibold text-slate-500">Frame designer</p>
      </div>
    </header>
  );
};
