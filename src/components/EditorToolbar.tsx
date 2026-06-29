import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Circle,
  Crown,
  Gift,
  Heart,
  Download,
  FileArchive,
  FilePlus2,
  Flower2,
  Image as ImageIcon,
  Music,
  PartyPopper,
  QrCode,
  Redo2,
  RotateCw,
  Save,
  LayoutTemplate,
  Shapes,
  Smile,
  Sparkles,
  Square,
  Star,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Upload,
  Edit3
} from 'lucide-react';

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
  onNewFrame?: () => void;
  onOpenPreview?: () => void;
  onOpenLibrary?: () => void;
  frameName: string;
  onEditFrameName: () => void;
}

const textPresets = [
  { label: 'Co dau & Chu re', value: 'Co Dau & Chu Re', category: 'wedding', style: { fontFamily: 'Great Vibes', fontSize: 44, color: '#e11d48' } },
  { label: 'Le Thanh Hon', value: 'LE THANH HON', category: 'wedding', style: { fontFamily: 'Cinzel', fontSize: 38, color: '#b91c1c' } },
  { label: 'Le Vu Quy', value: 'LE VU QUY', category: 'wedding', style: { fontFamily: 'Playfair Display', fontSize: 38, color: '#dc2626' } },
  { label: 'Happy Wedding', value: 'Happy Wedding', category: 'wedding', style: { fontFamily: 'Great Vibes', fontSize: 48, color: '#e11d48' } },
  { label: 'Save The Date', value: 'SAVE THE DATE', category: 'wedding', style: { fontFamily: 'Outfit', fontSize: 38, color: '#1e293b' } },
  { label: 'Just Married', value: 'Just Married', category: 'wedding', style: { fontFamily: 'Pacifico', fontSize: 42, color: '#db2777' } },
  { label: 'Together Forever', value: 'Together Forever', category: 'wedding', style: { fontFamily: 'Pacifico', fontSize: 42, color: '#0284c7' } },
  { label: 'Chuc mung sinh nhat', value: 'Chuc Mung Sinh Nhat', category: 'party', style: { fontFamily: 'Dancing Script', fontSize: 40, color: '#7c3aed' } },
  { label: 'Happy Birthday', value: 'HAPPY BIRTHDAY', category: 'party', style: { fontFamily: 'Bungee', fontSize: 38, color: '#8b5cf6' } },
  { label: 'Best Day Ever', value: 'BEST DAY EVER', category: 'party', style: { fontFamily: 'Bungee', fontSize: 38, color: '#eab308' } },
  { label: "Let's Party", value: "LET'S PARTY", category: 'party', style: { fontFamily: 'Lobster', fontSize: 42, color: '#ea580c' } },
  { label: 'Ky niem dang nho', value: 'Ky Niem Dang Nho', category: 'general', style: { fontFamily: 'Playfair Display', fontSize: 36, color: '#334155' } },
  { label: 'Sweet Memories', value: 'Sweet Memories', category: 'general', style: { fontFamily: 'Great Vibes', fontSize: 44, color: '#0f766e' } },
  { label: 'Say Cheese', value: 'SAY CHEESE!', category: 'general', style: { fontFamily: 'Lobster', fontSize: 40, color: '#2563eb' } },
  { label: 'Ban tim gi?', value: 'Ban tim gi?', category: 'general', style: { fontFamily: 'Pacifico', fontSize: 46, color: '#d04f5f' } },
  { label: 'Welcome Party', value: 'Welcome to our Party', category: 'general', style: { fontFamily: 'Sacramento', fontSize: 44, color: '#0f172a' } }
];

const makeSvgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const iconPresets = [
  {
    label: 'Heart',
    icon: Heart,
    color: '#e11d48',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#e11d48" d="M64 113S17 86 17 47c0-15 12-27 27-27 9 0 16 4 20 11 4-7 11-11 20-11 15 0 27 12 27 27 0 39-47 66-47 66Z"/></svg>'
  },
  {
    label: 'Star',
    icon: Star,
    color: '#f59e0b',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#f59e0b" d="m64 10 15 36 39 3-30 25 10 38-34-21-34 21 10-38-30-25 39-3 15-36Z"/></svg>'
  },
  {
    label: 'Sparkles',
    icon: Sparkles,
    color: '#8b5cf6',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#8b5cf6" d="M58 9h12l8 31 31 8v12l-31 8-8 31H58l-8-31-31-8V48l31-8 8-31Zm-30 73h8l5 18 18 5v8l-18 5-5 18h-8l-5-18-18-5v-8l18-5 5-18Zm69-67h7l4 15 15 4v7l-15 4-4 15h-7l-4-15-15-4v-7l15-4 4-15Z"/></svg>'
  },
  {
    label: 'Crown',
    icon: Crown,
    color: '#eab308',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#eab308" d="M19 99h90l8-61-28 20-25-35-25 35-28-20 8 61Zm5 11h80v10H24v-10Z"/></svg>'
  },
  {
    label: 'Flower',
    icon: Flower2,
    color: '#ec4899',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="15" fill="#f472b6"/><circle cx="64" cy="26" r="22" fill="#ec4899"/><circle cx="64" cy="102" r="22" fill="#ec4899"/><circle cx="26" cy="64" r="22" fill="#ec4899"/><circle cx="102" cy="64" r="22" fill="#ec4899"/><circle cx="37" cy="37" r="18" fill="#f9a8d4"/><circle cx="91" cy="37" r="18" fill="#f9a8d4"/><circle cx="37" cy="91" r="18" fill="#f9a8d4"/><circle cx="91" cy="91" r="18" fill="#f9a8d4"/></svg>'
  },
  {
    label: 'Gift',
    icon: Gift,
    color: '#16a34a',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#16a34a" d="M18 55h92v59H18V55Z"/><path fill="#22c55e" d="M12 38h104v24H12V38Z"/><path fill="#fef3c7" d="M57 38h14v76H57z"/><path fill="#fde68a" d="M32 22c17-13 29 1 32 16-20 3-34-1-32-16Zm64 0C79 9 67 23 64 38c20 3 34-1 32-16Z"/></svg>'
  },
  {
    label: 'Party',
    icon: PartyPopper,
    color: '#f97316',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#f97316" d="M22 110 53 37l38 38-69 35Z"/><path fill="#fde047" d="m38 73 18 18-34 19 16-37Z"/><path fill="#ec4899" d="M81 17h12v24H81z"/><path fill="#22c55e" d="m103 38 9 9-18 18-9-9 18-18Z"/><path fill="#3b82f6" d="M49 13h12v18H49z"/><circle cx="108" cy="22" r="7" fill="#e11d48"/><circle cx="72" cy="27" r="6" fill="#14b8a6"/></svg>'
  },
  {
    label: 'Music',
    icon: Music,
    color: '#2563eb',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#2563eb" d="M84 15v72a20 20 0 1 1-12-18V31l38-8v50a20 20 0 1 1-12-18V13L84 15Z"/></svg>'
  },
  {
    label: 'Smile',
    icon: Smile,
    color: '#facc15',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="54" fill="#facc15"/><circle cx="44" cy="50" r="7" fill="#422006"/><circle cx="84" cy="50" r="7" fill="#422006"/><path fill="none" stroke="#422006" stroke-linecap="round" stroke-width="9" d="M38 76c11 18 41 18 52 0"/></svg>'
  },
  {
    label: 'Circle',
    icon: Circle,
    color: '#06b6d4',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="50" fill="#06b6d4"/></svg>'
  },
  {
    label: 'Square',
    icon: Square,
    color: '#0f766e',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect x="18" y="18" width="92" height="92" rx="14" fill="#0f766e"/></svg>'
  },
  {
    label: 'Triangle',
    icon: Triangle,
    color: '#7c3aed',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#7c3aed" d="M64 13 119 110H9L64 13Z"/></svg>'
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
  onExportDslrboothZip,
  onNewFrame,
  onOpenPreview,
  onOpenLibrary,
  frameName,
  onEditFrameName
}) => {
  const [showShapes, setShowShapes] = useState(false);
  const [showTextPresetMenu, setShowTextPresetMenu] = useState(false);
  const [showIconMenu, setShowIconMenu] = useState(false);
  const [textCategory, setTextCategory] = useState<'all' | 'wedding' | 'party' | 'general'>('all');
  const [customText, setCustomText] = useState('');
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const filteredTextPresets = textPresets.filter((preset) => textCategory === 'all' || preset.category === textCategory);

  const handleAddCustomText = () => {
    if (!customText.trim()) return;
    onAddText(customText.trim());
    setCustomText('');
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {onOpenLibrary && (
          <button
            type="button"
            onClick={onOpenLibrary}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
            Thư viện Frame
          </button>
        )}
        {onNewFrame && (
          <button
            type="button"
            onClick={onNewFrame}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            Tạo mới
          </button>
        )}
      </div>

      <div className="mx-1 h-7 w-px bg-slate-200" />

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onAddSlot}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          Ảnh chụp
        </button>

        <button
          type="button"
          onClick={() => backgroundInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Ảnh nền
        </button>
        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onAddBackgroundFrame(file);
            event.target.value = '';
          }}
        />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTextPresetMenu((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <Type className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Thêm chữ
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          </button>

          {showTextPresetMenu && (
            <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-md border border-slate-200 bg-white p-3 shadow-xl">
              <div className="mb-4 flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 p-1 focus-within:border-slate-400 focus-within:bg-white focus-within:shadow-sm">
                <label htmlFor="quick-text" className="sr-only">
                  Nội dung chữ
                </label>
                <input
                  id="quick-text"
                  name="quickText"
                  type="text"
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleAddCustomText();
                      setShowTextPresetMenu(false);
                    }
                  }}
                  placeholder="Nhập chữ..."
                  autoComplete="off"
                  className="w-full min-w-0 flex-1 bg-transparent px-2 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleAddCustomText();
                    setShowTextPresetMenu(false);
                  }}
                  className="shrink-0 rounded bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-200 transition-colors"
                >
                  Thêm
                </button>
              </div>
              <div className="mb-3 flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'wedding', label: 'Đám cưới' },
                  { id: 'party', label: 'Sinh nhật' },
                  { id: 'general', label: 'Thông dụng' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTextCategory(item.id as typeof textCategory)}
                    className={`rounded px-2 py-1 text-[11px] font-black ${
                      textCategory === item.id ? 'bg-white text-rose-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {filteredTextPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      onAddText(preset.value, preset.style);
                      setShowTextPresetMenu(false);
                    }}
                    className="flex w-full flex-col rounded-md border border-slate-100 px-3 py-2 text-left hover:border-rose-200 hover:bg-rose-50"
                  >
                    <span className="text-[11px] font-black uppercase text-slate-500">{preset.label}</span>
                    <span className="truncate text-sm font-bold" style={{ fontFamily: preset.style.fontFamily, color: preset.style.color }}>
                      {preset.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onAddQr}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <QrCode className="h-4 w-4" aria-hidden="true" />
          QR
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowIconMenu((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <Shapes className="h-4 w-4" aria-hidden="true" />
            Icon
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {showIconMenu && (
            <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-md border border-slate-200 bg-white p-3 shadow-xl">
              <div className="grid grid-cols-4 gap-2">
                {iconPresets.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      title={preset.label}
                      onClick={() => {
                        onAddSticker(makeSvgDataUrl(preset.svg));
                        setShowIconMenu(false);
                      }}
                      className="flex h-16 flex-col items-center justify-center gap-1 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-rose-300 hover:bg-rose-50"
                    >
                      <Icon className="h-5 w-5" style={{ color: preset.color }} aria-hidden="true" />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center gap-1.5 px-4">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <Redo2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {selectedId && (
          <button
            type="button"
            onClick={() => onDeleteElement(selectedId)}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Xóa chọn
          </button>
        )}

        <button
          type="button"
          onClick={onClearCanvas}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          Đặt lại
        </button>

        <button
          type="button"
          onClick={onUpdateTemplateInDb}
          disabled={isSavingTemplate}
          className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Lưu Frame
        </button>

        <button
          type="button"
          onClick={onOpenPreview}
          className="inline-flex items-center gap-1.5 rounded-md bg-rose-800 px-4 py-2 text-xs font-bold text-white hover:bg-rose-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Xuất file
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;
