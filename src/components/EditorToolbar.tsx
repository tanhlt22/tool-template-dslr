import React from 'react';
import { Camera, Type, QrCode, Trash, Undo2, Redo2 } from 'lucide-react';

interface EditorToolbarProps {
  selectedId: string | null;
  onAddSlot: () => void;
  onAddText: () => void;
  onAddQr: () => void;
  onDeleteElement: (id: string) => void;
  onClearCanvas: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  selectedId,
  onAddSlot,
  onAddText,
  onAddQr,
  onDeleteElement,
  onClearCanvas,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => (
  <div className="bg-white/95 backdrop-blur-md border-b border-[#dee8ff] py-2 px-6 flex items-center justify-between shrink-0 z-10 shadow-sm gap-4 flex-wrap">
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">Công cụ</span>

      <button
        onClick={onAddSlot}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-250/30 shadow-xs transition-all duration-200 active:scale-95"
      >
        <Camera className="w-3.5 h-3.5" />
        <span>Thêm Ô Ảnh (Slot)</span>
      </button>

      <button
        onClick={onAddText}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-250/30 shadow-xs transition-all duration-200 active:scale-95"
      >
        <Type className="w-3.5 h-3.5" />
        <span>Thêm Chữ (Text)</span>
      </button>

      <button
        onClick={onAddQr}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-250/30 shadow-xs transition-all duration-200 active:scale-95"
      >
        <QrCode className="w-3.5 h-3.5" />
        <span>Thêm QR Link</span>
      </button>

      {/* Undo / Redo */}
      <div className="flex items-center gap-1 border-l border-[#dee8ff] pl-3 ml-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center justify-center p-2 rounded-xl text-slate-700 hover:bg-[#0058be] hover:text-white border border-[#dee8ff] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-450 transition-all duration-200 active:scale-90"
          title="Quay lại (Undo)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center justify-center p-2 rounded-xl text-slate-700 hover:bg-[#0058be] hover:text-white border border-[#dee8ff] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-450 transition-all duration-200 active:scale-90"
          title="Tiếp tục (Redo)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="flex items-center gap-3 ml-auto">
      {selectedId && (
        <button
          onClick={() => onDeleteElement(selectedId)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-250/30 shadow-xs transition-all duration-200 active:scale-95 animate-fade-in"
        >
          <Trash className="w-3.5 h-3.5" />
          <span>Xóa Đối Tượng</span>
        </button>
      )}

      <button
        onClick={onClearCanvas}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-200 border border-slate-200/50 shadow-xs transition-all duration-200 active:scale-95"
        title="Xóa Sạch Canvas"
      >
        Đặt Lại
      </button>
    </div>
  </div>
);
