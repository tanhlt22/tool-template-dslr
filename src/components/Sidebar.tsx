import React, { useState } from 'react';
import {
  Sparkles, Image as ImageIcon, Layers,
  Eye, EyeOff, Lock, Unlock, GripVertical, Printer, Trash,
  X, Camera, Type, FolderOpen, Download, RotateCw, CheckCircle2, Save, User
} from 'lucide-react';
import { STICKER_TEMPLATES, PAPER_SIZES, BACKGROUND_PRESETS } from '../constants/templates';
import { FrameConfig, FrameSlot, FrameElement } from '../types/canvas';
import { PersonalizationData } from '../utils/personalization';

interface TemplateRecord extends FrameConfig {
  id: string;
  created_at?: string;
  background_prompt?: string;
  background_image_url?: string | null;
}

interface SidebarProps {
  // Add operations
  onAddSticker: (url: string) => void;
  onAddImage: (file: File) => void;
  onOpenAISettings: () => void;

  // State elements
  slots: FrameSlot[];
  elements: FrameElement[];
  onSlotsChange: (slots: FrameSlot[]) => void;
  onElementsChange: (elements: FrameElement[]) => void;

  // Selection
  selectedId: string | null;
  onSelectElement: (id: string | null, type: 'slot' | 'text' | 'icon' | 'image' | 'qr' | null) => void;
  onDeleteElement: (id: string) => void;

  // Settings
  paperSize: string;
  onPaperSizeChange: (v: string) => void;
  orientation: 'vertical' | 'horizontal';
  onOrientationChange: (v: 'vertical' | 'horizontal') => void;
  width: number;
  onWidthChange: (v: number) => void;
  height: number;
  onHeightChange: (v: number) => void;
  resolution: number;
  onResolutionChange: (v: number) => void;

  backgroundType: 'color' | 'gradient' | 'ai';
  onBackgroundTypeChange: (v: 'color' | 'gradient' | 'ai') => void;
  backgroundColor: string;
  onBackgroundColorChange: (v: string) => void;
  onBgGradientChange: (v: string) => void;

  // Background Image Upload & Slot Detection props
  bgImageUrl: string | null;
  onBgImageUrlChange: (url: string | null) => void;

  // Active Tab state elevation
  activeTab: 'workflow' | 'canvas' | 'stickers' | 'layers';
  onActiveTabChange: (tab: 'workflow' | 'canvas' | 'stickers' | 'layers') => void;

  // Unified workflow
  personalization: PersonalizationData;
  onPersonalizationChange: (data: PersonalizationData) => void;
  onApplyPersonalization: () => void;
  savedFrames: TemplateRecord[];
  onLoadSavedFrame: (frame: TemplateRecord) => void;
  isExporting: boolean;
  onExportPNG: () => void;
  isExportingZip: boolean;
  zipExportSuccess: boolean;
  onExportDslrboothZip: () => void;
  userRole: string;
  editingTemplateId: string | null;
  isSavingTemplate: boolean;
  onUpdateTemplateInDb: () => void;
  onSaveNewTemplateToDb: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onActiveTabChange,
  onAddSticker,
  onAddImage,
  onOpenAISettings,

  slots,
  elements,
  onSlotsChange,
  onElementsChange,

  selectedId,
  onSelectElement,
  onDeleteElement,

  paperSize,
  onPaperSizeChange,
  orientation,
  onOrientationChange,
  width,
  onWidthChange,
  height,
  onHeightChange,
  resolution,
  onResolutionChange,

  backgroundType,
  onBackgroundTypeChange,
  backgroundColor,
  onBackgroundColorChange,
  onBgGradientChange,
  bgImageUrl,
  onBgImageUrlChange,
  personalization,
  onPersonalizationChange,
  onApplyPersonalization,
  savedFrames,
  onLoadSavedFrame,
  isExporting,
  onExportPNG,
  isExportingZip,
  zipExportSuccess,
  onExportDslrboothZip,
  userRole,
  editingTemplateId,
  isSavingTemplate,
  onUpdateTemplateInDb,
  onSaveNewTemplateToDb
}) => {
  const [selectedStickerCat, setSelectedStickerCat] = useState<string>('all');

  // Identify which personalization fields are needed based on elements present
  const neededFields = {
    brideGroom: elements.some(e => {
      if (e.type !== 'text') return false;
      const c = (e.content || '').toUpperCase();
      return c.includes('{BRIDE}') || c.includes('{GROOM}') || c.includes('{COUPLE}') ||
        c.includes('MINH & LAN') || c.includes('TEN CO DAU') || c.includes('CO DAU & CHU RE') || c.includes('TEN CO DAU & CHU RE');
    }),
    weddingDate: elements.some(e => {
      if (e.type !== 'text') return false;
      const c = (e.content || '').toUpperCase();
      return c.includes('{DATE}') || c.includes('30.05.2026') || c.includes('30.12.2026') || c.includes('00.00.0000') || c.includes('NGAY TO CHUC');
    }),
    eventName: elements.some(e => {
      if (e.type !== 'text') return false;
      const c = (e.content || '').toUpperCase();
      return c.includes('{EVENT}') || c.includes('HAPPY WEDDING') || c.includes('HAPPY WEDDING DAY');
    }),
    galleryUrl: elements.some(e => {
      if (e.type === 'qr') return true;
      if (e.type === 'text') {
        const c = (e.content || '').toUpperCase();
        return c.includes('{GALLERYURL}');
      }
      return false;
    })
  };

  const hasAnyNeededField = neededFields.brideGroom || neededFields.weddingDate || neededFields.eventName || neededFields.galleryUrl;

  // Unified list of all layers (ordered by rendering stack)
  // Slots are drawn first, then elements
  const allLayers = [
    ...slots.map((s, idx) => ({
      id: s.id,
      name: `Ô ảnh (Slot) ${s.order || (idx + 1)}`,
      type: 'slot' as const,
      visible: s.visible !== false,
      locked: s.locked === true
    })),
    ...elements.map(e => ({
      id: e.id,
      name: e.type === 'text' ? `Chữ: "${typeof e.content === 'string' ? e.content.substring(0, 10) : ''}..."` : e.type === 'qr' ? 'Mã QR chia sẻ' : e.type === 'image' ? `Ảnh: ${e.fileName || 'Layer'}` : 'Sticker',
      type: e.type,
      visible: e.visible !== false,
      locked: e.locked === true
    }))
  ];

  const handleToggleVisible = (id: string, type: string) => {
    if (type === 'slot') {
      onSlotsChange(slots.map(s => s.id === id ? { ...s, visible: !(s.visible !== false) } : s));
    } else {
      onElementsChange(elements.map(e => e.id === id ? { ...e, visible: !(e.visible !== false) } : e));
    }
  };

  const handleToggleLock = (id: string, type: string) => {
    if (type === 'slot') {
      onSlotsChange(slots.map(s => s.id === id ? { ...s, locked: !s.locked } : s));
    } else {
      onElementsChange(elements.map(e => e.id === id ? { ...e, locked: !e.locked } : e));
    }
  };

  return (
    <aside className="w-80 shrink-0 border-r border-[#dee8ff] bg-white/95 backdrop-blur-md flex flex-col overflow-hidden shadow-lg">

      {/* Tab Selector */}
      <div className="flex border-b border-[#dee8ff] shrink-0 bg-[#f0f3ff]">
        <button
          onClick={() => onActiveTabChange('workflow')}
          className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border-b-2 transition-all ${activeTab === 'workflow' ? 'border-[#0058be] text-[#0058be] bg-white font-extrabold' : 'border-transparent text-slate-500 hover:text-[#0058be] hover:bg-white/40'
            }`}
        >
          <User className="w-3 h-3 text-[#0058be]" />
          Mẫu Frame
        </button>
        <button
          onClick={() => onActiveTabChange('canvas')}
          className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border-b-2 transition-all ${activeTab === 'canvas' ? 'border-[#0058be] text-[#0058be] bg-white font-extrabold' : 'border-transparent text-slate-500 hover:text-[#0058be] hover:bg-white/40'
            }`}
        >
          <Sparkles className="w-3 h-3 text-[#0058be]" />
          KHỔ GIẤY
        </button>
        <button
          onClick={() => onActiveTabChange('layers')}
          className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border-b-2 transition-all ${activeTab === 'layers' ? 'border-[#0058be] text-[#0058be] bg-white font-extrabold' : 'border-transparent text-slate-500 hover:text-[#0058be] hover:bg-white/40'
            }`}
        >
          <Layers className="w-3 h-3 text-[#0058be]" />
          LỚP BẢN VẼ
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 custom-scrollbar">
        {/* ================= UNIFIED WORKFLOW TAB ================= */}
        {activeTab === 'workflow' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-black text-[#0058be] uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-[#0058be]" />
                MẪU THIẾT KẾ
              </h3>

              {savedFrames.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[230px] overflow-y-auto pr-1 custom-scrollbar">
                  {savedFrames.map((frame, idx) => (
                    <button
                      key={frame.id || idx}
                      onClick={() => onLoadSavedFrame(frame)}
                      className="w-full text-left bg-white hover:bg-[#f0f3ff] hover:border-[#0058be]/30 p-2.5 rounded-xl border border-[#dee8ff] transition-all flex items-center justify-between group active:scale-98 shadow-xs"
                    >
                      <div className="truncate">
                        <p className="text-xs font-extrabold text-[#111c2d] group-hover:text-[#0058be] transition-colors truncate">{frame.name}</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{frame.width}x{frame.height} | Số ảnh: {frame.slots?.length || 0}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#0058be] bg-[#0058be]/5 group-hover:bg-[#0058be] group-hover:text-white border border-[#0058be]/10 px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-sans">Dùng</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-[10px] font-bold text-slate-400 py-6 border border-dashed border-[#dee8ff] rounded-xl font-sans">
                  Không có mẫu thiết kế nào được lưu.
                </div>
              )}
            </div>

            <hr className="border-[#dee8ff]" />

            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-black text-[#0058be] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#0058be]" />
                Thông tin sự kiện
              </h3>

              {hasAnyNeededField ? (
                <>
                  {neededFields.brideGroom && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tên cô dâu</label>
                        <input
                          type="text"
                          value={personalization.brideName}
                          onChange={(e) => onPersonalizationChange({ ...personalization, brideName: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]/50 transition-colors shadow-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tên chú rể</label>
                        <input
                          type="text"
                          value={personalization.groomName}
                          onChange={(e) => onPersonalizationChange({ ...personalization, groomName: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]/50 transition-colors shadow-xs"
                        />
                      </div>
                    </>
                  )}

                  {neededFields.weddingDate && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ngày sự kiện</label>
                      <input
                        type="text"
                        value={personalization.weddingDate}
                        onChange={(e) => onPersonalizationChange({ ...personalization, weddingDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]/50 transition-colors shadow-xs"
                      />
                    </div>
                  )}

                  {neededFields.eventName && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tên sự kiện</label>
                      <input
                        type="text"
                        value={personalization.eventName}
                        onChange={(e) => onPersonalizationChange({ ...personalization, eventName: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]/50 transition-colors shadow-xs"
                      />
                    </div>
                  )}

                  {neededFields.galleryUrl && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Đường dẫn thư viện / QR</label>
                      <input
                        type="text"
                        value={personalization.galleryUrl}
                        onChange={(e) => onPersonalizationChange({ ...personalization, galleryUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]/50 transition-colors shadow-xs"
                      />
                    </div>
                  )}

                  <button
                    onClick={onApplyPersonalization}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white hover:bg-[#f0f3ff] text-[#0058be] border border-[#dee8ff] hover:border-[#0058be]/30 font-extrabold text-xs shadow-xs active:scale-[0.98] transition-all font-sans"
                  >
                    <Sparkles className="w-4 h-4 text-[#0058be]" />
                    Áp Dụng Cho Chữ Trên Canvas
                  </button>
                </>
              ) : (
                <div className="bg-[#f0f3ff]/40 border border-[#dee8ff] rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal text-center">
                    Mẫu thiết kế này đã được hoàn thiện hoặc không chứa thông tin cần thay đổi nhanh.
                  </p>
                </div>
              )}
            </div>

            {userRole === 'admin' && (
              <>
                <hr className="border-[#dee8ff]" />
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-black text-[#0058be] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0058be]" />
                    CÀI ĐẶT ADMIN
                  </h3>
                  <button
                    onClick={onOpenAISettings}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white hover:bg-[#f0f3ff] text-[#0058be] border border-[#dee8ff] hover:border-[#0058be]/30 font-extrabold text-xs shadow-xs active:scale-[0.98] transition-all font-sans"
                  >
                    <Sparkles className="w-4 h-4 text-[#0058be]" />
                    Cấu Hình AI Background
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= SETTINGS TAB ================= */}
        {activeTab === 'canvas' && (
          <div className="flex flex-col gap-4 animate-fade-in">

            {/* 1. Paper and print settings */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-black text-[#0058be] uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#0058be]" /> Khổ Giấy & Cấu Hình In
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Khổ Giấy</label>
                  <select
                    value={paperSize}
                    onChange={(e) => onPaperSizeChange(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]/50 transition-colors shadow-xs"
                  >
                    {PAPER_SIZES.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Hướng Xoay</label>
                  <select
                    value={orientation}
                    onChange={(e) => onOrientationChange(e.target.value as 'vertical' | 'horizontal')}
                    disabled={paperSize === 'custom'}
                    className="w-full px-2.5 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]/50 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    <option value="vertical">Dọc (Portrait)</option>
                    <option value="horizontal">Ngang (Landscape)</option>
                  </select>
                </div>
              </div>

              {/* Exact dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rộng (W px)</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => {
                      onPaperSizeChange('custom');
                      onWidthChange(Number(e.target.value));
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]/50 transition-colors shadow-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cao (H px)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => {
                      onPaperSizeChange('custom');
                      onHeightChange(Number(e.target.value));
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]/50 transition-colors shadow-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Độ Phân Giải In (DPI)</label>
                <select
                  value={resolution}
                  onChange={(e) => onResolutionChange(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-white border border-[#dee8ff] rounded-xl text-xs font-bold text-[#111c2d] focus:outline-none focus:border-[#0058be]/50 transition-colors shadow-xs"
                >
                  <option value={150}>150 DPI (Bản xem nhẹ)</option>
                  <option value={300}>300 DPI (Bản chuẩn in sắc nét)</option>
                  <option value={600}>600 DPI (Bản cao cấp)</option>
                </select>
              </div>
            </div>



            {/* 3. Canvas background style picker */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-[#0058be] uppercase tracking-wider">
                  Nền Canvas Thiết Kế
                </h3>
                <div className="flex bg-[#f0f3ff] p-0.5 rounded-lg border border-[#dee8ff] shrink-0">
                  {(['ai', 'color', 'gradient'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => onBackgroundTypeChange(type)}
                      className={`px-2 py-1 text-[9px] font-black uppercase rounded-md transition-all ${backgroundType === type
                        ? 'bg-white text-[#0058be] border border-[#dee8ff] shadow-xs font-bold'
                        : 'text-slate-500 hover:text-[#0058be]'
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI generator placeholder */}
              {backgroundType === 'ai' && (
                <div className="flex flex-col items-center justify-center gap-3 bg-amber-50/50 border border-amber-200/50 p-6 rounded-2xl animate-fade-in text-center">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shadow-sm shadow-amber-500/10">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide">
                      Sinh Ảnh Nền Bằng AI
                    </h4>
                    <p className="text-[11px] font-bold text-amber-600/90 leading-relaxed px-1 font-sans">
                      Tính năng đang được phát triển & nâng cấp hệ thống. Vui lòng quay lại sau!
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200/40 text-amber-800 border border-amber-200 font-sans">
                    Đang phát triển
                  </span>
                </div>
              )}

              {/* Solid Color Picker */}
              {backgroundType === 'color' && (
                <div className="flex items-center gap-2.5 bg-[#f0f3ff]/40 border border-[#dee8ff] rounded-xl p-3 animate-fade-in">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => onBackgroundColorChange(e.target.value)}
                    className="w-9 h-9 cursor-pointer rounded-lg border border-[#dee8ff] p-0.5 bg-white shrink-0"
                  />
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase">{backgroundColor}</span>

                  <div className="flex gap-1.5 ml-auto">
                    {BACKGROUND_PRESETS.filter(p => p.type === 'color').slice(0, 4).map(p => (
                      <button
                        key={p.name}
                        onClick={() => onBackgroundColorChange(p.value)}
                        className="w-5 h-5 rounded-full border border-[#dee8ff] cursor-pointer transition-transform hover:scale-110 active:scale-90"
                        style={{ backgroundColor: p.value }}
                        title={p.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Gradients grid */}
              {backgroundType === 'gradient' && (
                <div className="grid grid-cols-3 gap-1.5 bg-[#f0f3ff]/40 border border-[#dee8ff] rounded-xl p-3 animate-fade-in">
                  {BACKGROUND_PRESETS.filter(p => p.type === 'gradient').map(p => (
                    <button
                      key={p.name}
                      onClick={() => onBgGradientChange(p.value)}
                      className="h-7 rounded-lg border border-[#dee8ff] cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-xs"
                      style={{ backgroundImage: p.value }}
                      title={p.name}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}



        {/* ================= LAYERS TAB ================= */}
        {activeTab === 'layers' && (
          <div className="flex flex-col gap-3.5 bg-[#f0f3ff]/30 border border-[#dee8ff] rounded-2xl p-4 shadow-xs animate-fade-in">
            <h3 className="text-xs font-black flex items-center gap-2 text-[#0058be] uppercase tracking-wider">
              <Layers className="w-4 h-4 text-[#0058be]" />
              Lớp Bản Vẽ ({allLayers.length})
            </h3>

            {allLayers.length === 0 ? (
              <div className="text-center text-[10px] text-slate-400 py-6 font-bold flex flex-col items-center justify-center gap-1.5 bg-white border border-dashed border-[#dee8ff] rounded-xl">
                <Layers className="w-6 h-6 opacity-30 text-slate-400" />
                Chưa có layer nào trên canvas
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                {[...allLayers].reverse().map((layer) => {
                  const isSelected = selectedId === layer.id;

                  let typeColorClass = 'bg-white border-[#dee8ff] text-slate-700 hover:bg-[#0058be]/5 hover:text-[#0058be] hover:border-[#0058be]/20';
                  if (isSelected) {
                    typeColorClass = 'bg-[#0058be] border-[#0058be] text-white font-extrabold shadow-md shadow-[#0058be]/10 scale-[1.01]';
                  } else {
                    if (layer.type === 'slot') {
                      typeColorClass = 'bg-emerald-50/60 border-emerald-100/50 text-emerald-700 hover:bg-emerald-100/40';
                    } else if (layer.type === 'text') {
                      typeColorClass = 'bg-indigo-50/60 border-indigo-100/50 text-indigo-700 hover:bg-indigo-100/40';
                    } else if (layer.type === 'qr') {
                      typeColorClass = 'bg-amber-50/60 border-amber-100/50 text-amber-700 hover:bg-amber-100/40';
                    } else if (layer.type === 'icon') {
                      typeColorClass = 'bg-pink-50/60 border-pink-100/50 text-pink-700 hover:bg-pink-100/40';
                    } else if (layer.type === 'image') {
                      typeColorClass = 'bg-purple-50/60 border-purple-100/50 text-purple-700 hover:bg-purple-100/40';
                    }
                  }

                  return (
                    <div
                      key={layer.id}
                      onClick={() => onSelectElement && onSelectElement(layer.id, layer.type)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${typeColorClass}`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1">
                        <GripVertical className={`w-3.5 h-3.5 ${isSelected ? 'text-white/60' : 'text-slate-400'}`} />
                        <span className="text-[11px] truncate font-bold">{layer.name}</span>
                      </div>

                      <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleVisible(layer.id, layer.type)}
                          className={`p-1 rounded-lg hover:bg-slate-100/50 transition-colors ${isSelected ? 'hover:bg-white/20 hover:text-white' : 'text-slate-500'}`}
                          title={layer.visible ? 'Ẩn layer' : 'Hiện layer'}
                        >
                          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-500 font-bold" />}
                        </button>

                        <button
                          onClick={() => handleToggleLock(layer.id, layer.type)}
                          className={`p-1 rounded-lg hover:bg-slate-100/50 transition-colors ${isSelected ? 'hover:bg-white/20 hover:text-white' : 'text-slate-500'}`}
                          title={layer.locked ? 'Mở khóa' : 'Khóa di chuyển'}
                        >
                          {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 opacity-40" />}
                        </button>

                        <button
                          onClick={() => onDeleteElement(layer.id)}
                          className={`p-1 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-colors ${isSelected ? 'hover:bg-rose-600 hover:text-white' : ''}`}
                          title="Xóa layer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </aside>
  );
};

export default Sidebar;
