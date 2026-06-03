import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Type, QrCode, Trash, Undo2, Redo2,
  Save, Download, CheckCircle2, RotateCw, Image as ImageIcon,
  Smile, Upload, X
} from 'lucide-react';
import { STICKER_TEMPLATES } from '../constants/templates';

interface EditorToolbarProps {
  selectedId: string | null;
  onAddSlot: () => void;
  onAddText: (text?: string, style?: any) => void;
  onAddSticker: (url: string) => void;
  onAddImage: (file: File) => void;
  onAddQr: () => void;
  onAddBackgroundFrame: (file: File) => void;
  onDeleteElement: (id: string) => void;
  onClearCanvas: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Save and Export props
  userRole: string;
  editingTemplateId: string | null;
  isSavingTemplate: boolean;
  onUpdateTemplateInDb: () => void;
  onSaveNewTemplateToDb: () => void;
  isExporting: boolean;
  onExportPNG: () => void;
  isExportingZip: boolean;
  zipExportSuccess: boolean;
  onExportDslrboothZip: () => void;
}

const TEXT_PRESETS = [
  {
    name: 'Happy Wedding',
    text: 'Happy Wedding',
    style: {
      fontFamily: 'Great Vibes',
      fontSize: 36,
      fontWeight: 'bold',
      color: '#e11d48'
    }
  },
  {
    name: 'Save The Date',
    text: 'SAVE THE DATE',
    style: {
      fontFamily: 'Outfit',
      fontSize: 36,
      fontWeight: 'bold',
      color: '#1e293b'
    }
  },
  {
    name: 'Best Day Ever',
    text: 'BEST DAY EVER',
    style: {
      fontFamily: 'Bungee',
      fontSize: 36,
      fontWeight: 'bold',
      color: '#eab308'
    }
  },
  {
    name: 'Our Love Story',
    text: 'Our Love Story',
    style: {
      fontFamily: 'Playfair Display',
      fontSize: 36,
      fontWeight: 'bold',
      fontStyle: 'italic',
      color: '#ba1a1a'
    }
  },
  {
    name: 'Just Married',
    text: 'Just Married',
    style: {
      fontFamily: 'Pacifico',
      fontSize: 36,
      fontWeight: 'bold',
      color: '#db2777'
    }
  },
  {
    name: 'Sweet Memories',
    text: 'Sweet Memories',
    style: {
      fontFamily: 'Great Vibes',
      fontSize: 36,
      fontWeight: 'bold',
      color: '#0f766e'
    }
  },
  {
    name: 'Happy Birthday',
    text: 'HAPPY BIRTHDAY',
    style: {
      fontFamily: 'Bungee',
      fontSize: 36,
      fontWeight: 'bold',
      color: '#8b5cf6'
    }
  },
  {
    name: 'Together Forever',
    text: 'Together Forever',
    style: {
      fontFamily: 'Pacifico',
      fontSize: 36,
      fontWeight: 'bold',
      color: '#0284c7'
    }
  }
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  selectedId,
  onAddSlot,
  onAddText,
  onAddSticker,
  onAddImage,
  onAddQr,
  onAddBackgroundFrame,
  onDeleteElement,
  onClearCanvas,
  onUndo,
  onRedo,
  canUndo,
  canRedo,

  userRole,
  editingTemplateId,
  isSavingTemplate,
  onUpdateTemplateInDb,
  onSaveNewTemplateToDb,
  isExporting,
  onExportPNG,
  isExportingZip,
  zipExportSuccess,
  onExportDslrboothZip
}) => {
  const [showTextMenu, setShowTextMenu] = useState(false);
  const [showStickerMenu, setShowStickerMenu] = useState(false);
  const [customText, setCustomText] = useState('');
  const [stickerTab, setStickerTab] = useState<'all' | 'y2k' | 'wedding' | 'party' | 'frames'>('all');

  const textMenuRef = useRef<HTMLDivElement>(null);
  const stickerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check text menu
      if (showTextMenu && textMenuRef.current && !textMenuRef.current.contains(event.target as Node)) {
        const toggleButton = textMenuRef.current.parentElement?.querySelector('button');
        if (toggleButton && toggleButton.contains(event.target as Node)) {
          return;
        }
        setShowTextMenu(false);
      }
      // Check sticker menu
      if (showStickerMenu && stickerMenuRef.current && !stickerMenuRef.current.contains(event.target as Node)) {
        const toggleButton = stickerMenuRef.current.parentElement?.querySelector('button');
        if (toggleButton && toggleButton.contains(event.target as Node)) {
          return;
        }
        setShowStickerMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTextMenu, showStickerMenu]);

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-[#dee8ff] py-1.5 px-4 flex items-center justify-between shrink-0 z-20 shadow-sm gap-2 flex-wrap">
        {/* LEFT: Creation & History Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onAddSlot}
            className="flex items-center justify-center p-2 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200/50 shadow-xs transition-all duration-150 active:scale-95"
            title="Thêm Ô Ảnh (Slot)"
          >
            <Camera className="w-4 h-4" />
          </button>

          <label 
            className="flex items-center justify-center p-2 rounded-lg text-sky-700 bg-sky-50 hover:bg-sky-600 hover:text-white border border-sky-200/50 shadow-xs transition-all duration-150 active:scale-95 cursor-pointer"
            title="Thêm Khung Nền"
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onAddBackgroundFrame(file);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            <ImageIcon className="w-4 h-4" />
          </label>

          {/* TEXT TOOL WITH POPPING MENUS */}
          <div className="relative">
            <button
              onClick={() => {
                setShowTextMenu(!showTextMenu);
                setShowStickerMenu(false);
              }}
              className={`flex items-center justify-center p-2 rounded-lg transition-all duration-150 active:scale-95 border ${
                showTextMenu
                  ? 'text-white bg-indigo-650 border-indigo-650 shadow-md'
                  : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white border-indigo-200/50 shadow-xs'
              }`}
              title="Thêm Chữ (Text)"
            >
              <Type className="w-4 h-4" />
            </button>
            
            {showTextMenu && (
              <div ref={textMenuRef} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white border border-[#dee8ff] rounded-2xl p-4 shadow-xl w-80 flex flex-col gap-3 font-sans">
                <div className="flex items-center justify-between border-b border-[#f0f3ff] pb-2">
                  <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">
                    Chữ Mẫu & Tùy Chọn
                  </span>
                  <button onClick={() => setShowTextMenu(false)} className="text-slate-400 hover:text-slate-650">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Custom text uploader */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Chữ tùy chọn</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập nội dung chữ..."
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-[#dee8ff] rounded-xl focus:outline-none focus:border-indigo-500 font-bold bg-slate-50/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customText.trim()) {
                          onAddText(customText.trim());
                          setCustomText('');
                          setShowTextMenu(false);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (customText.trim()) {
                          onAddText(customText.trim());
                          setCustomText('');
                          setShowTextMenu(false);
                        }
                      }}
                      className="shrink-0 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black transition-all active:scale-95 shadow-xs"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                {/* Sample styles list */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Chữ mẫu thiết kế</span>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5 custom-scrollbar">
                    {TEXT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onAddText(preset.text, preset.style);
                          setShowTextMenu(false);
                        }}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200/60 bg-slate-50/30 hover:bg-indigo-50/20 transition-all flex flex-col gap-1 active:scale-98"
                      >
                        <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">{preset.name}</span>
                        <span 
                          className="text-xs truncate font-bold" 
                          style={{ 
                            fontFamily: preset.style.fontFamily, 
                            color: preset.style.color === '#ffffff' ? '#1e293b' : preset.style.color 
                          }}
                        >
                          {preset.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STICKER TOOL WITH POPPING MENUS */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStickerMenu(!showStickerMenu);
                setShowTextMenu(false);
              }}
              className={`flex items-center justify-center p-2 rounded-lg transition-all duration-150 active:scale-95 border ${
                showStickerMenu
                  ? 'text-white bg-amber-650 border-amber-650 shadow-md'
                  : 'text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white border-amber-200/50 shadow-xs'
              }`}
              title="Thêm Sticker"
            >
              <Smile className="w-4 h-4" />
            </button>
            
            {showStickerMenu && (
              <div ref={stickerMenuRef} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white border border-[#dee8ff] rounded-2xl p-4 shadow-xl w-80 flex flex-col gap-3 font-sans">
                <div className="flex items-center justify-between border-b border-[#f0f3ff] pb-2">
                  <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider">
                    Stickers & Hình Ảnh
                  </span>
                  <button onClick={() => setShowStickerMenu(false)} className="text-slate-400 hover:text-slate-650">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Custom image uploader */}
                <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-dashed border-[#dee8ff] rounded-xl hover:border-amber-500 hover:bg-amber-50/10 transition-all cursor-pointer text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tự tải Sticker / Ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onAddImage(file);
                        setShowStickerMenu(false);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {/* Categories tab */}
                <div className="flex flex-wrap gap-1 bg-[#f0f3ff]/65 p-1 rounded-xl border border-[#dee8ff]">
                  {[
                    { id: 'all', name: 'Tất cả' },
                    { id: 'y2k', name: 'Y2K' },
                    { id: 'wedding', name: 'Đám cưới' },
                    { id: 'party', name: 'Tiệc tùng' },
                    { id: 'frames', name: 'Khung/Sao' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setStickerTab(t.id as any)}
                      className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                        stickerTab === t.id
                          ? 'bg-white text-amber-800 border-amber-250 shadow-xs'
                          : 'bg-transparent text-slate-500 border-transparent hover:bg-white/40 hover:text-amber-700'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>

                {/* Grid of sample stickers */}
                <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
                  {STICKER_TEMPLATES.filter((st) => stickerTab === 'all' || st.category === stickerTab).map((st, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onAddSticker(st.url);
                        setShowStickerMenu(false);
                      }}
                      className="aspect-square p-2 border border-slate-100 hover:border-amber-250 bg-slate-50/50 hover:bg-amber-50/10 rounded-xl flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95"
                      title={st.name}
                    >
                      <img
                        src={st.url}
                        alt={st.name}
                        className="max-w-full max-h-full object-contain pointer-events-none"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onAddQr}
            className="flex items-center justify-center p-2 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200/50 shadow-xs transition-all duration-150 active:scale-95"
            title="Thêm QR Link"
          >
            <QrCode className="w-4 h-4" />
          </button>

        {/* History Group */}
        <div className="flex items-center gap-1 border-l border-[#dee8ff] pl-2 ml-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center justify-center p-1.5 rounded-lg text-slate-650 hover:bg-[#0058be] hover:text-white border border-[#dee8ff] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all duration-150 active:scale-90"
            title="Quay lại (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center justify-center p-1.5 rounded-lg text-slate-650 hover:bg-[#0058be] hover:text-white border border-[#dee8ff] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all duration-150 active:scale-90"
            title="Tiếp tục (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* RIGHT: Actions, Saves & Exports */}
      <div className="flex items-center gap-2 ml-auto flex-wrap">
        {/* Delete button (contextual) */}
        {selectedId && (
          <button
            onClick={() => onDeleteElement(selectedId)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200/50 shadow-xs transition-all duration-150 active:scale-95 animate-fade-in"
          >
            <Trash className="w-3.5 h-3.5" />
            <span>Xóa Chọn</span>
          </button>
        )}

        {/* Reset button */}
        <button
          onClick={onClearCanvas}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-200 border border-slate-200 shadow-xs transition-all duration-150 active:scale-95"
          title="Đặt lại Canvas"
        >
          Đặt Lại
        </button>

        {/* Save Template (Admin only) */}
        {userRole === 'admin' && (
          <div className="flex items-center border-l border-[#dee8ff] pl-2 ml-1 gap-2">
            {editingTemplateId && editingTemplateId !== 'new_draft' ? (
              <button
                onClick={onUpdateTemplateInDb}
                disabled={isSavingTemplate}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all duration-150 active:scale-95"
              >
                {isSavingTemplate ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Cập Nhật Mẫu</span>
              </button>
            ) : (
              <button
                onClick={onSaveNewTemplateToDb}
                disabled={isSavingTemplate}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all duration-150 active:scale-95"
              >
                {isSavingTemplate ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Lưu Mẫu Mới</span>
              </button>
            )}
          </div>
        )}

        {/* Export Buttons */}
        <div className="flex items-center border-l border-[#dee8ff] pl-2 ml-1 gap-2">
          {/* Export PNG */}
          <button
            onClick={onExportPNG}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all duration-150 active:scale-95"
          >
            {isExporting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Xuất PNG</span>
          </button>

          {/* Export DSLRbooth ZIP */}
          <button
            onClick={onExportDslrboothZip}
            disabled={isExportingZip}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:from-[#004b9e] hover:to-[#175cc0] disabled:opacity-50 transition-all duration-150 active:scale-95"
          >
            {isExportingZip ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : zipExportSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-white animate-bounce" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{zipExportSuccess ? 'Đã Tải ZIP' : 'Tải ZIP DSLR'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;
