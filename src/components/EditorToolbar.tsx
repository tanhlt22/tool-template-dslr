import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
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
  Scissors,
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
  Edit3,
  X,
  Eye,
  Search
} from 'lucide-react';
import { TemplateThumbnail } from './TemplateThumbnail';
import { apiService } from '../services/api';

const FRAME_CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: '✨' },
  { id: 'wedding', label: 'Đám cưới', icon: '💍' },
  { id: 'birthday', label: 'Sinh nhật', icon: '🎂' },
  { id: 'event', label: 'Sự kiện', icon: '🎉' },
  { id: 'graduation', label: 'Kỷ yếu', icon: '🎓' },
  { id: 'couple', label: 'Cặp đôi', icon: '❤️' },
  { id: 'y2k', label: 'Y2K', icon: '✨' },
  { id: 'holiday', label: 'Lễ hội', icon: '🎄' },
  { id: 'general', label: 'Khác', icon: '🖼️' }
];

interface EditorToolbarProps {
  selectedId: string | null;
  onAddSlot: () => void;
  onAddText: (text?: string, style?: any) => void;
  onAddSticker: (url: string) => void;
  onAddImage: (file: File) => void;
  onAddQr: () => void;
  onAddBackgroundFrame: (file: File) => void;
  onDeleteElement: (ids?: string[] | string) => void;
  onDuplicateElement?: (ids?: string[] | string) => void;
  onClearCanvas: () => void;

  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  userRole: string;
  isAdmin?: boolean;
  editingTemplateId: string | null;
  isSavingTemplate: boolean;
  onUpdateTemplateInDb: () => void;
  onSaveNewTemplateToDb?: () => void;
  isExporting: boolean;
  onExportPNG: () => void;
  isExportingZip: boolean;
  zipExportSuccess: boolean;
  onExportDslrboothZip: () => void;
  onNewFrame?: () => void;
  onOpenPreview?: () => void;
  frameName: string;
  onEditFrameName: () => void;
  savedFrames: any[];
  isLoadingFrames?: boolean;
  onLoadSavedFrame: (frame: any) => void | Promise<void>;
  onSelectRegion?: () => void;
  onOpenTransparentSlotPicker?: () => void;
  isUsingSystemTemplate?: boolean;
}

const textPresets = [
  { label: 'Chữ ký Brittany', value: 'Brittany & Alexander', category: 'wedding', style: { fontFamily: 'Brittany Signature', fontSize: 46, color: '#be123c' } },
  { label: 'Amsterdam Script', value: 'Together With Our Families', category: 'wedding', style: { fontFamily: 'Amsterdam Four', fontSize: 42, color: '#9f1239' } },
  { label: 'Bickham Luxury', value: 'Save The Date', category: 'wedding', style: { fontFamily: 'Bickham Script Pro', fontSize: 48, color: '#881337' } },
  { label: 'Allura Modern', value: 'Forever & Always', category: 'wedding', style: { fontFamily: 'Allura', fontSize: 50, color: '#e11d48' } },
  { label: 'Cô dâu & Chú rể', value: 'Cô Dâu & Chú Rể', category: 'wedding', style: { fontFamily: 'Great Vibes', fontSize: 44, color: '#e11d48' } },
  { label: 'Lễ Thành Hôn', value: 'LỄ THÀNH HÔN', category: 'wedding', style: { fontFamily: 'Cinzel', fontSize: 38, color: '#b91c1c' } },
  { label: 'Lễ Vu Quy', value: 'LỄ VU QUY', category: 'wedding', style: { fontFamily: 'Playfair Display', fontSize: 38, color: '#dc2626' } },
  { label: 'Happy Wedding', value: 'Happy Wedding', category: 'wedding', style: { fontFamily: 'Great Vibes', fontSize: 48, color: '#e11d48' } },
  { label: 'Save The Date', value: 'SAVE THE DATE', category: 'wedding', style: { fontFamily: 'Outfit', fontSize: 38, color: '#1e293b' } },
  { label: 'Just Married', value: 'Just Married', category: 'wedding', style: { fontFamily: 'Pacifico', fontSize: 42, color: '#db2777' } },
  { label: 'Together Forever', value: 'Together Forever', category: 'wedding', style: { fontFamily: 'Pacifico', fontSize: 42, color: '#0284c7' } },
  { label: 'Chúc mừng sinh nhật', value: 'Chúc Mừng Sinh Nhật', category: 'party', style: { fontFamily: 'Dancing Script', fontSize: 40, color: '#7c3aed' } },
  { label: 'Happy Birthday', value: 'HAPPY BIRTHDAY', category: 'party', style: { fontFamily: 'Bungee', fontSize: 38, color: '#8b5cf6' } },
  { label: 'Best Day Ever', value: 'BEST DAY EVER', category: 'party', style: { fontFamily: 'Bungee', fontSize: 38, color: '#eab308' } },
  { label: "Let's Party", value: "LET'S PARTY", category: 'party', style: { fontFamily: 'Lobster', fontSize: 42, color: '#ea580c' } },
  { label: 'Kỷ niệm đáng nhớ', value: 'Kỷ Niệm Đáng Nhớ', category: 'general', style: { fontFamily: 'Playfair Display', fontSize: 36, color: '#334155' } },
  { label: 'Sweet Memories', value: 'Sweet Memories', category: 'general', style: { fontFamily: 'Great Vibes', fontSize: 44, color: '#0f766e' } },
  { label: 'Say Cheese', value: 'SAY CHEESE!', category: 'general', style: { fontFamily: 'Lobster', fontSize: 40, color: '#2563eb' } },
  { label: 'Bạn tìm gì?', value: 'Bạn tìm gì?', category: 'general', style: { fontFamily: 'Pacifico', fontSize: 46, color: '#d04f5f' } },
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
  onDuplicateElement,
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
  frameName,
  onEditFrameName,
  savedFrames,
  isLoadingFrames,
  onLoadSavedFrame,
  onSelectRegion,
  onOpenTransparentSlotPicker,
  isUsingSystemTemplate = false,
  isAdmin = false
}) => {
  const canUpdateTemplate = Boolean(isAdmin || userRole === 'admin');
  const [showShapes, setShowShapes] = useState(false);
  const [showSlotMenu, setShowSlotMenu] = useState(false);
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [selectedFrameCategory, setSelectedFrameCategory] = useState<string>('all');
  const [frameSearch, setFrameSearch] = useState<string>('');
  const [previewFrame, setPreviewFrame] = useState<any>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isApplyingFrame, setIsApplyingFrame] = useState(false);
  const [showTextPresetMenu, setShowTextPresetMenu] = useState(false);
  const [showIconMenu, setShowIconMenu] = useState(false);
  const [textCategory, setTextCategory] = useState<'all' | 'wedding' | 'party' | 'general'>('all');
  const [customText, setCustomText] = useState('');
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const filteredTextPresets = textPresets.filter((preset) => textCategory === 'all' || preset.category === textCategory);

  const filteredSavedFrames = savedFrames.filter((f) => {
    const frameCat = f.category || 'general';
    const matchCategory = selectedFrameCategory === 'all' || frameCat === selectedFrameCategory;
    const matchSearch = !frameSearch.trim() || f.name.toLowerCase().includes(frameSearch.toLowerCase().trim());
    return matchCategory && matchSearch;
  });

  const handleAddCustomText = () => {
    if (!customText.trim()) return;
    onAddText(customText.trim());
    setCustomText('');
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 relative">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setShowFrameModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 hover:border-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 transition-colors shadow-sm"
        >
          <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
          <span>{editingTemplateId ? savedFrames.find((f) => f.id === editingTemplateId)?.name || 'Chọn Khung Mẫu' : 'Chọn Khung Mẫu'}</span>
        </button>
        {isUsingSystemTemplate && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-200">
            Khung mẫu có sẵn
          </span>
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
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSlotMenu((val) => !val)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 shadow-sm"
          >
            <Camera className="h-4 w-4 text-rose-700" aria-hidden="true" />
            Ảnh chụp
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          </button>

          {showSlotMenu && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 px-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Thêm ô ảnh chụp</span>
                <span className="text-[10px] font-semibold text-slate-400">Chọn chế độ</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowSlotMenu(false);
                    onOpenTransparentSlotPicker?.();
                  }}
                  className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-2 text-left hover:bg-rose-100/70 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-600 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-rose-900">Tự động (Quét ô rỗng)</span>
                    <span className="block text-[10.5px] font-medium text-rose-700/80">Quét & click chọn vùng trong suốt</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSlotMenu(false);
                    onAddSlot();
                  }}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-2 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800 text-white">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800">Thủ công</span>
                    <span className="block text-[10.5px] font-medium text-slate-500">Thêm 1 ô ảnh chữ nhật tuỳ chỉnh</span>
                  </div>
                </button>
              </div>
            </div>
          )}

        </div>

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

        {onSelectRegion && (
          <button
            type="button"
            onClick={onSelectRegion}
            title="Đục lỗ trên ảnh (theo màu hoặc theo khung slot)"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <Scissors className="h-4 w-4 text-rose-700" aria-hidden="true" />
            Đục lỗ
          </button>
        )}

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
          aria-label="Hoàn tác"
          className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Làm lại"
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
            title="Xóa đối tượng đang chọn (Delete)"
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 shadow-sm"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Xóa chọn</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClearCanvas}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          Đặt lại
        </button>

        {/* Save / Update buttons - Chỉ admin mới có quyền cập nhật đè mẫu có sẵn */}
        {editingTemplateId && canUpdateTemplate ? (
          <div className="inline-flex items-center rounded-md shadow-sm">
            <button
              type="button"
              onClick={onUpdateTemplateInDb}
              disabled={isSavingTemplate}
              title="Cập nhật trực tiếp các thay đổi vào mẫu này (Chỉ dành cho Admin)"
              className="inline-flex items-center gap-1.5 rounded-l-md border border-rose-600 bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSavingTemplate ? 'Đang cập nhật...' : 'Cập nhật mẫu'}
            </button>
            {onSaveNewTemplateToDb && (
              <button
                type="button"
                onClick={onSaveNewTemplateToDb}
                disabled={isSavingTemplate}
                title="Lưu bản sao thành một mẫu mới hoàn toàn"
                className="inline-flex items-center rounded-r-md border border-l-0 border-rose-600 bg-rose-800 px-2.5 py-2 text-[11px] font-bold text-white hover:bg-rose-900 disabled:opacity-50 transition-colors"
              >
                + Lưu bản sao
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onSaveNewTemplateToDb || onUpdateTemplateInDb}
            disabled={isSavingTemplate}
            title={editingTemplateId ? "Lưu bản sao thành mẫu mới vào thư viện" : "Lưu thiết kế mới vào thư viện"}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSavingTemplate ? 'Đang lưu...' : (editingTemplateId ? 'Lưu bản sao mới' : 'Lưu mẫu mới')}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenPreview}
          className="inline-flex items-center gap-1.5 rounded-md bg-rose-800 px-4 py-2 text-xs font-bold text-white hover:bg-rose-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Xuất file
        </button>
      </div>

      {showFrameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Chọn khung hình mẫu ({filteredSavedFrames.length} mẫu)</h2>
                  <p className="text-[11px] font-medium text-slate-500">Phân loại theo chủ đề và chọn khung để áp dụng vào bản vẽ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowFrameModal(false);
                  setFrameSearch('');
                  setSelectedFrameCategory('all');
                }}
                aria-label="Đóng"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter Bar: Categories + Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3">
              {/* Category pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {FRAME_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedFrameCategory(cat.id)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      selectedFrameCategory === cat.id
                        ? 'bg-rose-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search box */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={frameSearch}
                  onChange={(e) => setFrameSearch(e.target.value)}
                  placeholder="Tìm tên khung..."
                  className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-200"
                />
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
              {isLoadingFrames ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-200 border-t-rose-700 mb-4"></div>
                  <p className="text-sm font-bold">Đang tải danh sách khung hình...</p>
                </div>
              ) : filteredSavedFrames.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredSavedFrames.map((frame) => {
                    const slotCount = (Array.isArray(frame.slots) && frame.slots.length > 0)
                      ? frame.slots.length
                      : (frame.name?.match(/#(\d+)\s*ảnh/i)?.[1]
                        ? parseInt(frame.name.match(/#(\d+)\s*ảnh/i)[1], 10)
                        : (frame.layout?.match(/(\d+)x(\d+)/)
                          ? parseInt(RegExp.$1, 10) * parseInt(RegExp.$2, 10)
                          : 0));

                    return (
                      <div
                        key={frame.id}
                        onClick={async () => {
                          setPreviewFrame(frame);
                          setIsZoomed(false);
                          try {
                            const full = await apiService.getFrame(frame.id);
                            if (full) {
                              setPreviewFrame((current: any) => (current?.id === frame.id ? { ...frame, ...full } : current));
                            }
                          } catch {}
                        }}
                        className={`group relative flex cursor-pointer flex-col rounded-xl border p-3 text-left transition-all shadow-sm ${
                          editingTemplateId === frame.id
                            ? 'border-rose-700 bg-white ring-2 ring-rose-700'
                            : 'border-slate-200 bg-white hover:border-rose-300 hover:shadow-md'
                        }`}
                      >
                        <div className="relative w-full flex justify-center overflow-hidden rounded-lg bg-slate-100 p-1">
                          <TemplateThumbnail frame={frame} scale={1.8} />
                          {frame.category && (
                            <span className="absolute top-1.5 right-1.5 rounded-md bg-slate-900/80 backdrop-blur-sm px-1.5 py-0.5 text-[9.5px] font-bold text-white shadow-sm">
                              {FRAME_CATEGORIES.find((c) => c.id === frame.category)?.label || frame.category}
                            </span>
                          )}
                        </div>
                        <div className="mt-2.5 min-w-0">
                          <span className="block truncate text-xs font-bold text-slate-900 group-hover:text-rose-700">
                            {frame.name}
                          </span>
                          <div className="mt-1 flex items-center justify-between text-[10.5px] font-medium text-slate-500">
                            <span>{frame.width} × {frame.height}</span>
                            <span>{slotCount > 0 ? `${slotCount} ô ảnh` : '0 ô ảnh'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-sm font-medium text-slate-500">
                  Không tìm thấy khung hình mẫu nào trong phân loại này.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Frame Preview Modal */}
      {previewFrame && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 p-3 md:p-6 backdrop-blur-sm"
          onClick={() => setPreviewFrame(null)}
        >
          <div 
            className="relative flex w-full max-w-7xl h-[90vh] flex-col md:flex-row bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              type="button"
              onClick={() => setPreviewFrame(null)}
              className="absolute top-4 right-4 z-10 p-2.5 bg-slate-100/90 hover:bg-rose-100 rounded-full text-slate-500 hover:text-rose-600 transition-colors backdrop-blur-sm shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left side - Responsive Preview Area */}
            <div className="flex-1 w-full h-full min-h-0 min-w-0 bg-[#f8f9fa] p-4 md:p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 overflow-hidden">
              <TemplateThumbnail frame={previewFrame} fitParent={true} />
            </div>

            {/* Right side - Info and Actions */}
            <div className="w-full md:w-[360px] lg:w-[420px] flex-none bg-white p-6 md:p-8 flex flex-col justify-between">
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                <h3 className="text-2xl font-black text-slate-900 mb-6 pr-8 leading-tight">
                  {previewFrame.name}
                </h3>
                <div className="space-y-4 text-sm text-slate-600 font-medium">
                  <div className="flex items-center gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="w-24 text-slate-400">Kích thước:</span>
                    <span className="text-slate-900 font-bold">{previewFrame.width} x {previewFrame.height} px</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="w-24 text-slate-400">Số ô ảnh:</span>
                    <span className="text-slate-900 font-bold">{previewFrame.slots?.length || 0} ô</span>
                  </div>
                  {previewFrame.background_prompt && (
                    <div className="flex flex-col gap-2 mt-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400">Prompt nền (AI):</span>
                      <p className="text-slate-700 italic text-xs leading-relaxed max-h-36 overflow-y-auto custom-scrollbar pr-1">
                        {previewFrame.background_prompt}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - Horizontal side by side */}
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-row items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setPreviewFrame(null)}
                  className="w-1/3 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors text-center"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isApplyingFrame}
                  onClick={async () => {
                    setIsApplyingFrame(true);
                    try {
                      await onLoadSavedFrame(previewFrame);
                      setPreviewFrame(null);
                      setShowFrameModal(false);
                    } finally {
                      setIsApplyingFrame(false);
                    }
                  }}
                  className="w-2/3 px-4 py-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-sm md:text-base font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{isApplyingFrame ? 'Đang áp dụng...' : 'Áp dụng mẫu này'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorToolbar;
