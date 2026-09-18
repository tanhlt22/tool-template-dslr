import React, { useState } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Lock,
  Trash2,
  Unlock,
  UploadCloud,
  Type,
  QrCode,
  ChevronUp,
  ChevronDown,
  Copy
} from 'lucide-react';
import { PAPER_SIZES } from '../constants/templates';
import { FrameConfig, FrameElement, FrameSlot } from '../types/canvas';
import { PersonalizationData } from '../utils/personalization';

interface TemplateRecord extends FrameConfig {
  id: string;
  created_at?: string;
  background_prompt?: string;
  background_image_url?: string | null;
}

interface SidebarProps {
  onAddSticker: (url: string) => void;
  onAddImage: (file: File) => void;
  onOpenAISettings: () => void;
  slots: FrameSlot[];
  elements: FrameElement[];
  onSlotsChange: (slots: FrameSlot[]) => void;
  onElementsChange: (elements: FrameElement[]) => void;
  selectedId: string | null;
  onSelectElement: (id: string | null, type: 'slot' | 'text' | 'icon' | 'image' | 'qr' | null) => void;
  onDeleteElement: (id: string) => void;
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
  bgImageUrl: string | null;
  onBgImageUrlChange: (url: string | null) => void;
  activeTab: 'workflow' | 'canvas' | 'stickers' | 'layers';
  onActiveTabChange: (tab: 'workflow' | 'canvas' | 'stickers' | 'layers') => void;
  personalization: PersonalizationData;
  onPersonalizationChange: (data: PersonalizationData) => void;
  onApplyPersonalization: () => void;
  isExporting: boolean;
  onExportPNG: () => void;
  isExportingZip: boolean;
  zipExportSuccess: boolean;
  onExportDslrboothZip: () => void;
  userRole: string;
  editingTemplateId: string | null;
  isSavingTemplate: boolean;
  onUpdateTemplateInDb: () => void;
  onSaveNewTemplateToDb?: () => void;
  savedFrames?: any[];
  isLoadingFrames?: boolean;
  onLoadSavedFrame?: (frame: any) => void;
}

type LayerItem = {
  id: string;
  name: string;
  type: 'slot' | 'text' | 'icon' | 'image' | 'qr';
  visible: boolean;
  locked: boolean;
  content?: string;
  order?: number;
};

export const Sidebar: React.FC<SidebarProps> = ({
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
  onAddImage,
  bgImageUrl,
  onBgImageUrlChange,
  editingTemplateId
}) => {
  const layers: LayerItem[] = [
    ...slots.map((slot, index) => ({
      id: slot.id,
      name: `Photo ${slot.order || index + 1}`,
      type: 'slot' as const,
      visible: slot.visible !== false,
      locked: slot.locked === true,
      order: slot.order || index + 1
    })),
    ...elements.map((element) => ({
      id: element.id,
      name:
        element.type === 'text'
          ? `Text: ${String(element.content || '').slice(0, 18)}`
          : element.type === 'qr'
            ? 'QR Code'
            : element.type === 'image'
              ? element.fileName || 'Image'
              : 'Sticker',
      type: element.type,
      visible: element.visible !== false,
      locked: element.locked === true,
      content: element.content
    }))
  ];

  const toggleVisible = (layer: LayerItem) => {
    if (layer.type === 'slot') {
      onSlotsChange(slots.map(s => s.id === layer.id ? { ...s, visible: s.visible === false ? true : false } : s));
    } else {
      onElementsChange(elements.map(e => e.id === layer.id ? { ...e, visible: e.visible === false ? true : false } : e));
    }
  };

  const moveLayerUp = (layer: LayerItem) => {
    if (layer.type === 'slot') {
      const idx = slots.findIndex(s => s.id === layer.id);
      if (idx < slots.length - 1) {
        const newSlots = [...slots];
        [newSlots[idx], newSlots[idx + 1]] = [newSlots[idx + 1], newSlots[idx]];
        onSlotsChange(newSlots);
      }
    } else {
      const idx = elements.findIndex(e => e.id === layer.id);
      if (idx < elements.length - 1) {
        const newElements = [...elements];
        [newElements[idx], newElements[idx + 1]] = [newElements[idx + 1], newElements[idx]];
        onElementsChange(newElements);
      }
    }
  };

  const moveLayerDown = (layer: LayerItem) => {
    if (layer.type === 'slot') {
      const idx = slots.findIndex(s => s.id === layer.id);
      if (idx > 0) {
        const newSlots = [...slots];
        [newSlots[idx], newSlots[idx - 1]] = [newSlots[idx - 1], newSlots[idx]];
        onSlotsChange(newSlots);
      }
    } else {
      const idx = elements.findIndex(e => e.id === layer.id);
      if (idx > 0) {
        const newElements = [...elements];
        [newElements[idx], newElements[idx - 1]] = [newElements[idx - 1], newElements[idx]];
        onElementsChange(newElements);
      }
    }
  };

  const duplicateLayer = (layer: LayerItem) => {
    const newId = Date.now().toString() + Math.random().toString(36).substring(7);
    if (layer.type === 'slot') {
      const slot = slots.find(s => s.id === layer.id);
      if (slot) {
        onSlotsChange([...slots, { ...slot, id: newId, x: (slot.x || 0) + 20, y: (slot.y || 0) + 20 }]);
      }
    } else {
      const element = elements.find(e => e.id === layer.id);
      if (element) {
        onElementsChange([...elements, { ...element, id: newId, x: (element.x || 0) + 20, y: (element.y || 0) + 20 }]);
      }
    }
  };

  const toggleLock = (layer: LayerItem) => {
    if (layer.type === 'slot') {
      onSlotsChange(slots.map((slot) => (slot.id === layer.id ? { ...slot, locked: !layer.locked } : slot)));
      return;
    }
    onElementsChange(elements.map((element) => (element.id === layer.id ? { ...element, locked: !layer.locked } : element)));
  };

  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3">
        <section className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                <Layers className="h-4 w-4" aria-hidden="true" />
                Lớp hiển thị
              </h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{layers.length}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const layer = layers.find(l => l.id === selectedId);
                  if (layer) moveLayerUp(layer);
                }}
                disabled={!selectedId}
                className="flex flex-col items-center justify-center w-8 h-8 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition-colors"
                title="Lên"
              >
                <ChevronUp className="w-3 h-3" />
                <span className="text-[8px] font-bold leading-none mt-0.5">Lên</span>
              </button>
              <button
                onClick={() => {
                  const layer = layers.find(l => l.id === selectedId);
                  if (layer) moveLayerDown(layer);
                }}
                disabled={!selectedId}
                className="flex flex-col items-center justify-center w-8 h-8 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition-colors"
                title="Xuống"
              >
                <ChevronDown className="w-3 h-3" />
                <span className="text-[8px] font-bold leading-none mt-0.5">Xuống</span>
              </button>
              <button
                onClick={() => {
                  const layer = layers.find(l => l.id === selectedId);
                  if (layer) duplicateLayer(layer);
                }}
                disabled={!selectedId}
                className="flex flex-col items-center justify-center w-8 h-8 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition-colors"
                title="Sao chép"
              >
                <Copy className="w-3 h-3 mb-0.5" />
                <span className="text-[8px] font-bold leading-none">Sao chép</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {[...layers].reverse().map((layer) => {
              const isSelected = selectedId === layer.id;
              return (
                <div
                  key={layer.id}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                    isSelected ? 'border-rose-700 bg-rose-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectElement(layer.id, layer.type)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-50 border border-slate-200">
                      {layer.type === 'slot' && (
                        <span className="text-sm font-black text-rose-800">{layer.order}</span>
                      )}
                      {layer.type === 'image' && layer.content && (
                        <img src={layer.content} alt="" className="h-full w-full object-cover" />
                      )}
                      {layer.type === 'text' && <Type className="h-4 w-4 text-slate-400" />}
                      {layer.type === 'icon' && layer.content && (
                        <img src={layer.content} alt="" className="h-full w-full object-contain p-1" />
                      )}
                      {layer.type === 'qr' && <QrCode className="h-4 w-4 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-slate-900">{layer.name}</span>
                      <span className="block text-[10px] font-semibold uppercase text-slate-500">{layer.type}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLock(layer)}
                    aria-label={layer.locked ? 'Mở khóa lớp' : 'Khóa lớp'}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    {layer.locked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Unlock className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVisible(layer)}
                    aria-label={layer.visible ? 'Ẩn lớp' : 'Hiện lớp'}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    {layer.visible ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteElement(layer.id)}
                    aria-label="Xóa lớp"
                    title="Xóa lớp"
                    className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })}

            {layers.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs font-semibold text-slate-500">
                Chưa có lớp nào trên khung vẽ.
              </div>
            )}
          </div>
        </section>

        <section className="mb-4 rounded-md border border-slate-200 p-3">
          <h2 className="mb-3 text-xs font-black text-slate-900">Kích thước khung</h2>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Mẫu kích thước
              <select
                name="paperSize"
                value={paperSize}
                onChange={(event) => onPaperSizeChange(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:border-rose-700 focus:outline-none"
              >
                {PAPER_SIZES.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Hướng
              <select
                name="orientation"
                value={orientation}
                onChange={(event) => onOrientationChange(event.target.value as 'vertical' | 'horizontal')}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:border-rose-700 focus:outline-none"
              >
                <option value="vertical">Dọc</option>
                <option value="horizontal">Ngang</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-slate-700">
                Rộng
                <input
                  name="canvasWidth"
                  type="number"
                  inputMode="numeric"
                  value={width}
                  onChange={(event) => {
                    onPaperSizeChange('custom');
                    onWidthChange(Number(event.target.value));
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:border-rose-700 focus:outline-none"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Cao
                <input
                  name="canvasHeight"
                  type="number"
                  inputMode="numeric"
                  value={height}
                  onChange={(event) => {
                    onPaperSizeChange('custom');
                    onHeightChange(Number(event.target.value));
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:border-rose-700 focus:outline-none"
                />
              </label>
            </div>

            <label className="block text-xs font-bold text-slate-700">
              DPI
              <select
                name="resolution"
                value={resolution}
                onChange={(event) => onResolutionChange(Number(event.target.value))}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:border-rose-700 focus:outline-none"
              >
                <option value={150}>150</option>
                <option value={300}>300</option>
                <option value={600}>600</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 p-3">
          <h2 className="mb-3 text-xs font-black text-slate-900">Nền và hình ảnh</h2>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:border-rose-300 hover:bg-rose-50">
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Tải ảnh / sticker lên
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onAddImage(file);
                  event.target.value = '';
                }}
              />
            </label>

            <div className="flex items-center gap-2">
              <input
                aria-label="Màu nền"
                type="color"
                value={backgroundColor}
                onChange={(event) => onBackgroundColorChange(event.target.value)}
                className="h-9 w-12 rounded border border-slate-300 bg-white"
              />
              <span className="text-xs font-mono font-bold uppercase text-slate-700">{backgroundColor}</span>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
};

export default Sidebar;
