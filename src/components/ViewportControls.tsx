import React from 'react';
import { Grid, Magnet } from 'lucide-react';

interface ViewportControlsProps {
  showGrid: boolean;
  snapToGrid: boolean;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  showGrid, snapToGrid, onToggleGrid, onToggleSnap
}) => (
  <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-xl border border-[#dee8ff] p-1.5 rounded-2xl shadow-lg">
    <button
      onClick={onToggleGrid}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-95 ${showGrid
        ? 'bg-[#0058be] text-white shadow-md shadow-[#0058be]/10 border border-[#0058be]'
        : 'bg-[#f0f3ff]/55 text-slate-650 hover:text-[#0058be] hover:bg-[#0058be]/5 border border-[#dee8ff]/50'
        }`}
      title="Bật/Tắt Lưới Căn Chỉnh"
    >
      <Grid className="w-3.5 h-3.5" />
      <span>Hiện Lưới</span>
    </button>

    <button
      onClick={onToggleSnap}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-95 ${snapToGrid
        ? 'bg-[#0058be] text-white shadow-md shadow-[#0058be]/10 border border-[#0058be]'
        : 'bg-[#f0f3ff]/55 text-slate-650 hover:text-[#0058be] hover:bg-[#0058be]/5 border border-[#dee8ff]/50'
        }`}
      title="Hút Bám Vào Lưới Khi Di Chuyển"
    >
      <Magnet className="w-3.5 h-3.5" />
      <span>Hút Bám</span>
    </button>
  </div>
);
