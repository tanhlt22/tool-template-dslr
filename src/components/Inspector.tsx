import {
  Layers, MousePointer, Download, RotateCw, FolderOpen, AlignLeft,
  AlignCenter, AlignRight, ChevronUp, ChevronDown, Copy, Trash,
  Camera, Type, Sparkles, QrCode, Image as ImageIcon, X, CheckCircle2, Save
} from 'lucide-react';
import { FrameSlot } from '../types/canvas';
import { GOOGLE_FONTS } from '../constants/templates';

interface InspectorProps {
  selectedId: string | null;
  selectedType: 'slot' | 'text' | 'icon' | 'image' | 'qr' | null;
  activeElement: any;
  onUpdateProp: (key: string, val: any) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onMoveLayerOrder: (id: string, dir: 'up' | 'down') => void;
  onAlignElement: (id: string, alignType: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;

  isExporting: boolean;
  onExportPNG: () => void;
  isExportingZip?: boolean;
  zipExportSuccess?: boolean;
  onExportDslrboothZip?: () => void;
  savedFrames: any[];
  onLoadSavedFrame: (frame: any) => void;
  slotsCount?: number;
  elementsCount?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  onClose?: () => void;

  // DSLRbooth visual design persistence props
  userRole?: string;
  editingTemplateId?: string | null;
  isSavingTemplate?: boolean;
  onUpdateTemplateInDb?: () => void;
  onSaveNewTemplateToDb?: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedId,
  selectedType,
  activeElement,
  onUpdateProp,
  onDeleteElement,
  onDuplicateElement,
  onMoveLayerOrder,
  onAlignElement,
  isExporting,
  onExportPNG,
  isExportingZip = false,
  zipExportSuccess = false,
  onExportDslrboothZip,
  savedFrames,
  onLoadSavedFrame,
  slotsCount = 0,
  elementsCount = 0,
  canvasWidth = 800,
  canvasHeight = 1200,
  onClose,
  userRole = 'user',
  editingTemplateId = null,
  isSavingTemplate = false,
  onUpdateTemplateInDb,
  onSaveNewTemplateToDb
}) => {

  const renderHeaderCard = () => {
    if (!activeElement) return null;

    let IconComp = MousePointer;
    let title = 'Chọn đối tượng';
    let subtitle = 'Lớp Đối Tượng';
    let iconBgClass = 'bg-slate-900 text-indigo-400';

    if (selectedType === 'slot') {
      IconComp = Camera;
      title = `Ô ảnh số ${(activeElement as FrameSlot).order || 1}`;
      subtitle = 'Lớp Khung Ảnh';
      iconBgClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    } else if (selectedType === 'qr') {
      IconComp = QrCode;
      title = 'Mã QR chia sẻ';
      subtitle = 'Lớp Mã QR Code';
      iconBgClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    } else if (selectedType === 'text') {
      IconComp = Type;
      title = activeElement.content ? `"${activeElement.content.substring(0, 15)}"` : 'Văn bản nghệ thuật';
      subtitle = 'Lớp Văn Bản Nghệ Thuật';
      iconBgClass = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    } else if (selectedType === 'icon') {
      IconComp = Sparkles;
      title = 'Sticker Decor';
      subtitle = 'Hình Dán Nhãn Trang Trí';
      iconBgClass = 'bg-pink-500/10 text-pink-400 border border-pink-500/20';
    } else if (selectedType === 'image') {
      IconComp = ImageIcon;
      title = activeElement.fileName ? activeElement.fileName : 'Hình ảnh tải lên';
      subtitle = 'Lớp Ảnh Tải Lên';
      iconBgClass = 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    }

    return (
      <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${iconBgClass}`}>
          <IconComp className="w-5 h-5" />
        </div>
        <div className="truncate flex-1">
          <p className="text-xs font-bold text-slate-200 truncate leading-tight">{title}</p>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-80 shrink-0 border-l border-[#dee8ff] glass-panel flex flex-col p-4 overflow-y-auto gap-5 custom-scrollbar">

      {/* 🛠️ PROPERTIES EDITOR */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black flex items-center gap-2 text-[#0058be] uppercase tracking-wider">
            <Layers className="w-4 h-4 text-[#0058be]" />
            Thuộc Tính Đối Tượng
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-[#0058be] p-1 rounded-lg hover:bg-[#f0f3ff] transition-all active:scale-95"
              title="Đóng bảng thuộc tính"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {activeElement ? (
          <div className="flex flex-col gap-4 animate-fade-in">
            {renderHeaderCard()}

            {/* Căn lề nhanh (Quick Alignment) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Căn lề nhanh (Canvas)</span>
              <div className="grid grid-cols-6 gap-1 bg-[#f0f3ff]/45 p-1 rounded-xl border border-[#dee8ff] shadow-xs">
                <button
                  type="button"
                  onClick={() => onAlignElement(selectedId!, 'left')}
                  className="flex items-center justify-center p-1.5 hover:bg-[#0058be] hover:text-white rounded-lg text-slate-500 transition-all"
                  title="Căn lề trái"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onAlignElement(selectedId!, 'center-h')}
                  className="flex items-center justify-center p-1.5 hover:bg-[#0058be] hover:text-white rounded-lg text-slate-500 transition-all"
                  title="Căn giữa ngang"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onAlignElement(selectedId!, 'right')}
                  className="flex items-center justify-center p-1.5 hover:bg-[#0058be] hover:text-white rounded-lg text-slate-500 transition-all"
                  title="Căn lề phải"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onAlignElement(selectedId!, 'top')}
                  className="flex items-center justify-center p-1.5 hover:bg-[#0058be] hover:text-white rounded-lg text-slate-500 transition-all rotate-90"
                  title="Căn lề trên"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onAlignElement(selectedId!, 'center-v')}
                  className="flex items-center justify-center p-1.5 hover:bg-[#0058be] hover:text-white rounded-lg text-slate-500 transition-all rotate-90"
                  title="Căn giữa dọc"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onAlignElement(selectedId!, 'bottom')}
                  className="flex items-center justify-center p-1.5 hover:bg-[#0058be] hover:text-white rounded-lg text-slate-500 transition-all rotate-90"
                  title="Căn lề dưới"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Actions (Z-Index / Layer order & Duplicate) */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onMoveLayerOrder(selectedId!, 'up')}
                className="flex flex-col items-center justify-center py-1.5 px-1 bg-white hover:bg-[#0058be] text-slate-700 hover:text-white rounded-xl border border-[#dee8ff] hover:border-[#0058be] text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-xs"
                title="Đưa lên trên một lớp"
              >
                <ChevronUp className="w-4 h-4 mb-0.5" />
                <span>Lên trên</span>
              </button>
              <button
                type="button"
                onClick={() => onMoveLayerOrder(selectedId!, 'down')}
                className="flex flex-col items-center justify-center py-1.5 px-1 bg-white hover:bg-[#0058be] text-slate-700 hover:text-white rounded-xl border border-[#dee8ff] hover:border-[#0058be] text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-xs"
                title="Đưa xuống dưới một lớp"
              >
                <ChevronDown className="w-4 h-4 mb-0.5" />
                <span>Xuống dưới</span>
              </button>
              <button
                type="button"
                onClick={() => onDuplicateElement(selectedId!)}
                className="flex flex-col items-center justify-center py-1.5 px-1 bg-white hover:bg-[#0058be] text-slate-700 hover:text-white rounded-xl border border-[#dee8ff] hover:border-[#0058be] text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-xs"
                title="Nhân bản đối tượng"
              >
                <Copy className="w-4 h-4 mb-0.5" />
                <span>Nhân bản</span>
              </button>
            </div>

            {/* exact dimensions */}
            <div className="flex flex-col gap-2 bg-[#f0f3ff]/40 border border-[#dee8ff] p-2.5 rounded-xl">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Tọa độ & Kích thước (px)</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Trục X</span>
                  <input
                    type="number"
                    value={Math.round(activeElement.x)}
                    onChange={(e) => onUpdateProp('x', Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-[#dee8ff] rounded-lg text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Trục Y</span>
                  <input
                    type="number"
                    value={Math.round(activeElement.y)}
                    onChange={(e) => onUpdateProp('y', Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-[#dee8ff] rounded-lg text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Chiều rộng</span>
                  <input
                    type="number"
                    value={Math.round(activeElement.width)}
                    onChange={(e) => onUpdateProp('width', Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-[#dee8ff] rounded-lg text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Chiều cao</span>
                  <input
                    type="number"
                    value={Math.round(activeElement.height)}
                    onChange={(e) => onUpdateProp('height', Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-[#dee8ff] rounded-lg text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]"
                  />
                </div>
              </div>
            </div>

            {/* Custom attributes by type */}
            {selectedType === 'slot' && (
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Góc Xoay Độ (°)</label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={activeElement.rotation || 0}
                    onChange={(e) => onUpdateProp('rotation', Number(e.target.value))}
                    className="w-full cursor-pointer accent-[#0058be]"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold mt-0.5">
                    <span>-180°</span>
                    <span className="text-[#0058be] font-bold">{activeElement.rotation || 0}°</span>
                    <span>180°</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Thứ Tự Ô Ảnh</label>
                  <select
                    value={activeElement.order || 1}
                    onChange={(e) => onUpdateProp('order', Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold focus:outline-none focus:border-[#0058be] text-[#111c2d]"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>Ô ảnh số {num}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedType === 'text' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nội dung text</label>
                  <input
                    type="text"
                    value={activeElement.content}
                    onChange={(e) => onUpdateProp('content', e.target.value)}
                    className="bg-white border border-[#dee8ff] rounded-xl px-3 py-2 w-full focus:outline-none focus:border-[#0058be] text-xs text-[#111c2d] font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Font Chữ Nghệ Thuật</label>
                  <select
                    value={activeElement.style?.fontFamily || 'Outfit'}
                    onChange={(e) => onUpdateProp('fontFamily', e.target.value)}
                    className="bg-white border border-[#dee8ff] rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-[#0058be] text-[#111c2d] font-semibold"
                  >
                    {GOOGLE_FONTS.map(f => (
                      <option key={f.name} value={f.value}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cỡ Chữ (px)</label>
                    <span className="text-[10px] font-mono font-bold text-[#0058be]">{activeElement.style?.fontSize || 24} px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={activeElement.style?.fontSize || 24}
                    onChange={(e) => onUpdateProp('fontSize', parseInt(e.target.value))}
                    className="w-full accent-[#0058be] cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1 bg-[#f0f3ff]/40 border border-[#dee8ff] rounded-xl p-2.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Màu Sắc</label>
                  <div className="flex gap-2.5 items-center">
                    <input
                      type="color"
                      value={activeElement.style?.color || '#ffffff'}
                      onChange={(e) => onUpdateProp('color', e.target.value)}
                      className="bg-white border border-[#dee8ff] w-8 h-8 rounded-lg cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono font-bold text-slate-700 uppercase">{activeElement.style?.color || '#ffffff'}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'icon' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Xoay Nghiêng (°)</label>
                    <span className="text-[10px] font-mono font-bold text-[#0058be]">{activeElement.rotation || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={activeElement.rotation || 0}
                    onChange={(e) => onUpdateProp('rotation', Number(e.target.value))}
                    className="w-full cursor-pointer accent-[#0058be]"
                  />
                </div>
              </div>
            )}

            {selectedType === 'image' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Xoay Nghiêng (°)</label>
                    <span className="text-[10px] font-mono font-bold text-[#0058be]">{activeElement.rotation || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={activeElement.rotation || 0}
                    onChange={(e) => onUpdateProp('rotation', Number(e.target.value))}
                    className="w-full cursor-pointer accent-[#0058be]"
                  />
                </div>

                <div className="flex items-center justify-between bg-[#f0f3ff]/40 p-2.5 rounded-xl border border-[#dee8ff]">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">Khóa Tỉ Lệ Ảnh Gốc</span>
                  <input
                    type="checkbox"
                    checked={activeElement.lockRatio !== false}
                    onChange={(e) => onUpdateProp('lockRatio', e.target.checked)}
                    className="w-4 h-4 rounded border-[#dee8ff] text-[#0058be] focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {selectedType === 'qr' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Link QR / Nội Dung</label>
                  <input
                    type="text"
                    value={activeElement.content}
                    onChange={(e) => onUpdateProp('content', e.target.value)}
                    className="bg-white border border-[#dee8ff] rounded-xl px-3 py-2 w-full focus:outline-none focus:border-[#0058be] text-xs text-[#111c2d] font-medium"
                    placeholder="https://facebook.com/..."
                  />
                </div>
              </div>
            )}

            {/* Delete button */}
            <button
              onClick={() => onDeleteElement(selectedId!)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white rounded-xl border border-rose-200 text-xs font-extrabold transition-all active:scale-95 shadow-xs"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Xóa Layer Đã Chọn</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#f0f3ff]/30 border border-[#dee8ff] rounded-2xl p-4 flex flex-col gap-3.5 shadow-xs animate-fade-in">
            <div className="flex items-center gap-2 text-[#0058be] border-b border-[#dee8ff] pb-2">
              <Layers className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Tổng Quan Bản Vẽ</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-white p-2 rounded-xl border border-[#dee8ff] shadow-xs">
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Kích Thước</p>
                <p className="text-[10px] font-black text-[#111c2d] mt-1 truncate">{canvasWidth}x{canvasHeight}</p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-[#dee8ff] shadow-xs">
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Ô Ảnh (Slots)</p>
                <p className="text-[10px] font-black text-emerald-600 mt-1">{slotsCount} ô</p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-[#dee8ff] shadow-xs">
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Sticker/Chữ</p>
                <p className="text-[10px] font-black text-[#0058be] mt-1">{elementsCount} lớp</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-250/30 rounded-xl p-3 flex items-start gap-2">
              <span className="text-amber-500 font-extrabold text-xs">💡</span>
              <p className="text-[9px] text-amber-800 font-semibold leading-normal">
                Để chỉnh sửa thuộc tính hoặc di chuyển vị trí, bạn hãy nhấp chọn bất kỳ đối tượng nào trên Canvas hoặc bấm vào tab **LAYERS** ở bên trái!
              </p>
            </div>
          </div>
        )}
      </div>

      <hr className="border-[#dee8ff]" />

      {/* 💾 PROJECT EXPORTER */}
      <div className="flex flex-col gap-3.5">
        <button
          onClick={onExportPNG}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-emerald-500/40 disabled:to-teal-600/40 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all"
        >
          {isExporting ? <RotateCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isExporting ? 'Đang xử lý ảnh...' : 'Xuất & Lưu Lên Hệ Thống'}
        </button>

        <button
          onClick={onExportDslrboothZip}
          disabled={isExportingZip}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:from-[#004b9e] hover:to-[#175cc0] disabled:from-[#0058be]/40 disabled:to-[#2170e4]/40 text-white font-extrabold text-xs shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all"
        >
          {isExportingZip ? <RotateCw className="w-4 h-4 animate-spin" /> : zipExportSuccess ? <CheckCircle2 className="w-4 h-4 text-white animate-bounce" /> : <Download className="w-4 h-4" />}
          {isExportingZip ? 'Đang đóng gói ZIP...' : zipExportSuccess ? 'ĐÃ TẢI ZIP DSLRBOOTH!' : 'Tải ZIP DSLRbooth 1-Click'}
        </button>
      </div>

      {userRole === 'admin' && (
        <>
          <hr className="border-[#dee8ff]" />
          
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2 text-emerald-600">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Quản Trị Mẫu DSLRbooth</span>
            </div>
            
            {editingTemplateId && editingTemplateId !== 'new_draft' ? (
              <button
                onClick={onUpdateTemplateInDb}
                disabled={isSavingTemplate}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all"
              >
                {isSavingTemplate ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu Cập Nhật Mẫu
              </button>
            ) : (
              <button
                onClick={onSaveNewTemplateToDb}
                disabled={isSavingTemplate}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all"
              >
                {isSavingTemplate ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu Thành Mẫu Mới
              </button>
            )}
          </div>
        </>
      )}

      <hr className="border-[#dee8ff]" />

      {/* 📂 SAVED CONFIGURATIONS GALLERY */}
      <div className="flex flex-col gap-3.5 flex-1 min-h-[150px]">
        <h2 className="text-xs font-black flex items-center gap-2 text-[#0058be] uppercase tracking-wider">
          <FolderOpen className="w-4 h-4 text-[#0058be]" />
          Thư Viện Layout Đã Lưu ({savedFrames.length})
        </h2>

        {savedFrames.length > 0 ? (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
            {savedFrames.map((frame, idx) => (
              <button
                key={idx}
                onClick={() => onLoadSavedFrame(frame)}
                className="w-full text-left bg-white hover:bg-[#f0f3ff] hover:border-[#0058be]/30 p-2.5 rounded-xl border border-[#dee8ff] transition-all flex items-center justify-between group active:scale-98 shadow-xs"
              >
                <div className="flex items-center gap-2 truncate max-w-[190px]">
                  <div className="w-8 h-8 rounded-lg bg-[#0058be]/5 border border-[#0058be]/10 flex items-center justify-center shrink-0 text-[#0058be] group-hover:bg-[#0058be]/10 transition-colors">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-extrabold text-[#111c2d] group-hover:text-[#0058be] transition-colors truncate">{frame.name}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{frame.width}x{frame.height} | Slots: {frame.slots?.length || 0}</p>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#0058be] bg-[#0058be]/5 group-hover:bg-[#0058be] group-hover:text-white border border-[#0058be]/10 px-2.5 py-1.5 rounded-lg transition-all shrink-0">Sử Dụng</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center text-[10px] font-bold text-slate-400 py-6 border border-dashed border-[#dee8ff] rounded-xl">
            Chưa có frame nào được lưu.
          </div>
        )}
      </div>
    </aside>
  );
};
export default Inspector;
