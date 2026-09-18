import React, { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Copy, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { NewFrameConfig } from './CreateFrameModal';

export interface AiFrameSlotConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AiFrameConfig extends NewFrameConfig {
  photoCount: number;
  slotColor: string;
  prompt: string;
  slots: AiFrameSlotConfig[];
}

interface CreateAiFrameModalProps {
  isOpen: boolean;
  isGenerating: boolean;
  onClose: () => void;
  onCreate: (config: AiFrameConfig) => void;
}

type SlotDragMode = 'move' | 'resize';

interface SlotDragState {
  mode: SlotDragMode;
  index: number;
  startClientX: number;
  startClientY: number;
  startSlot: AiFrameSlotConfig;
  target: HTMLElement;
}

const presets = [
  { id: '4x6-v', name: '4x6 dọc', description: 'Khung in ảnh dọc', width: 1200, height: 1800, paperSize: '4x6', orientation: 'vertical' as const },
  { id: '4x6-h', name: '4x6 ngang', description: 'Khung ảnh ngang cho booth', width: 1800, height: 1200, paperSize: '4x6', orientation: 'horizontal' as const },
  { id: '2x6-v', name: '2x6 dọc', description: 'Dải ảnh dọc nhiều ảnh', width: 600, height: 1800, paperSize: '2x6', orientation: 'vertical' as const },
  { id: '2x6-h', name: '2x6 ngang', description: 'Dải ảnh ngang nhiều ảnh', width: 1800, height: 600, paperSize: '2x6', orientation: 'horizontal' as const },
  { id: 'custom', name: 'Tùy chỉnh', description: 'Nhập kích thước riêng', width: 1200, height: 1800, paperSize: 'custom', orientation: 'vertical' as const }
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toSafeSize = (value: number) => Math.max(100, Math.round(Number(value) || 100));
const toPhotoCount = (value: number) => clamp(Math.round(Number(value) || 1), 1, 6);

function createDefaultSlots(frameWidth: number, frameHeight: number, count: number): AiFrameSlotConfig[] {
  const safeCount = toPhotoCount(count);
  const cols = frameWidth >= frameHeight ? Math.min(safeCount, safeCount <= 2 ? safeCount : 3) : safeCount <= 2 ? 1 : 2;
  const rows = Math.ceil(safeCount / cols);
  const marginX = Math.max(36, Math.round(frameWidth * 0.09));
  const topMargin = Math.max(48, Math.round(frameHeight * 0.1));
  const bottomMargin = Math.max(48, Math.round(frameHeight * 0.1));
  const gap = Math.max(16, Math.round(Math.min(frameWidth, frameHeight) * 0.035));
  const usableWidth = Math.max(100, frameWidth - marginX * 2);
  const usableHeight = Math.max(100, frameHeight - topMargin - bottomMargin);
  const slotWidth = Math.max(80, Math.floor((usableWidth - gap * (cols - 1)) / cols));
  const slotHeight = Math.max(80, Math.floor((usableHeight - gap * (rows - 1)) / rows));
  const gridWidth = slotWidth * cols + gap * (cols - 1);
  const gridHeight = slotHeight * rows + gap * (rows - 1);
  const startX = Math.round((frameWidth - gridWidth) / 2);
  const startY = Math.round(topMargin + Math.max(0, (usableHeight - gridHeight) / 2));

  return Array.from({ length: safeCount }, (_, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      x: startX + col * (slotWidth + gap),
      y: startY + row * (slotHeight + gap),
      width: slotWidth,
      height: slotHeight
    };
  });
}

function clampSlot(slot: AiFrameSlotConfig, frameWidth: number, frameHeight: number): AiFrameSlotConfig {
  const width = clamp(Math.round(Number(slot.width) || 80), 40, frameWidth);
  const height = clamp(Math.round(Number(slot.height) || 80), 40, frameHeight);
  return {
    x: clamp(Math.round(Number(slot.x) || 0), 0, Math.max(0, frameWidth - width)),
    y: clamp(Math.round(Number(slot.y) || 0), 0, Math.max(0, frameHeight - height)),
    width,
    height
  };
}

function scaleSlots(slots: AiFrameSlotConfig[], oldWidth: number, oldHeight: number, nextWidth: number, nextHeight: number) {
  const scaleX = nextWidth / Math.max(oldWidth, 1);
  const scaleY = nextHeight / Math.max(oldHeight, 1);
  return slots.map((slot) =>
    clampSlot(
      {
        x: Math.round(slot.x * scaleX),
        y: Math.round(slot.y * scaleY),
        width: Math.round(slot.width * scaleX),
        height: Math.round(slot.height * scaleY)
      },
      nextWidth,
      nextHeight
    )
  );
}

export const CreateAiFrameModal: React.FC<CreateAiFrameModalProps> = ({
  isOpen,
  isGenerating,
  onClose,
  onCreate
}) => {
  const [selectedPreset, setSelectedPreset] = useState(presets[0]);
  const [name, setName] = useState('Frame AI mới');
  const [width, setWidth] = useState(selectedPreset.width);
  const [height, setHeight] = useState(selectedPreset.height);
  const [photoCount, setPhotoCount] = useState(3);
  const [slotColor, setSlotColor] = useState('#22d3ee');
  const [prompt, setPrompt] = useState('');
  const [slots, setSlots] = useState<AiFrameSlotConfig[]>(() => createDefaultSlots(selectedPreset.width, selectedPreset.height, 3));
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const dragStateRef = useRef<SlotDragState | null>(null);

  const previewSize = useMemo(() => {
    const maxPreview = 480;
    if (width >= height) {
      return {
        width: maxPreview,
        height: Math.max(180, Math.round((height / Math.max(width, 1)) * maxPreview))
      };
    }
    return {
      width: Math.max(180, Math.round((width / Math.max(height, 1)) * maxPreview)),
      height: maxPreview
    };
  }, [height, width]);

  if (!isOpen) return null;

  const selectedSlot = slots[selectedSlotIndex] || slots[0];

  const resetSlotLayout = (nextWidth = width, nextHeight = height, nextCount = photoCount) => {
    const nextSlots = createDefaultSlots(nextWidth, nextHeight, nextCount);
    setSlots(nextSlots);
    setSelectedSlotIndex((current) => Math.min(current, nextSlots.length - 1));
  };

  const handlePresetChange = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId) || presets[0];
    setSelectedPreset(preset);
    setWidth(preset.width);
    setHeight(preset.height);
    setSlots(createDefaultSlots(preset.width, preset.height, photoCount));
    setSelectedSlotIndex((current) => Math.min(current, photoCount - 1));
  };

  const handlePhotoCountChange = (value: number) => {
    const nextCount = toPhotoCount(value);
    setPhotoCount(nextCount);
    const nextSlots = createDefaultSlots(width, height, nextCount);
    setSlots(nextSlots);
    setSelectedSlotIndex((current) => Math.min(current, nextCount - 1));
  };

  const handleWidthChange = (value: number) => {
    const nextWidth = toSafeSize(value);
    setSelectedPreset(presets[presets.length - 1]);
    setSlots((current) => scaleSlots(current, width, height, nextWidth, height));
    setWidth(nextWidth);
  };

  const handleHeightChange = (value: number) => {
    const nextHeight = toSafeSize(value);
    setSelectedPreset(presets[presets.length - 1]);
    setSlots((current) => scaleSlots(current, width, height, width, nextHeight));
    setHeight(nextHeight);
  };

  const handleSlotChange = (key: keyof AiFrameSlotConfig, value: number) => {
    setSlots((current) =>
      current.map((slot, index) =>
        index === selectedSlotIndex
          ? clampSlot({ ...slot, [key]: Math.round(Number(value) || 0) }, width, height)
          : slot
      )
    );
  };

  const handleCopySelectedSlot = (direction: 'right' | 'down') => {
    const source = slots[selectedSlotIndex];
    if (!source || slots.length >= 6) return;

    const gap = Math.max(16, Math.round(Math.min(width, height) * 0.02));
    const nextSlot = clampSlot(
      {
        ...source,
        x: direction === 'right' ? source.x + source.width + gap : source.x,
        y: direction === 'down' ? source.y + source.height + gap : source.y
      },
      width,
      height
    );
    setSlots((current) => [...current, nextSlot]);
    setPhotoCount((current) => Math.min(6, current + 1));
    setSelectedSlotIndex(slots.length);
  };

  const handleSyncSlotSize = () => {
    const source = slots[selectedSlotIndex];
    if (!source) return;

    setSlots((current) =>
      current.map((slot) =>
        clampSlot(
          {
            ...slot,
            width: source.width,
            height: source.height
          },
          width,
          height
        )
      )
    );
  };

  const handleDeleteSelectedSlot = () => {
    if (slots.length <= 1) return;

    setSlots((current) => current.filter((_, index) => index !== selectedSlotIndex));
    setPhotoCount((current) => Math.max(1, current - 1));
    setSelectedSlotIndex((current) => Math.max(0, Math.min(current, slots.length - 2)));
  };

  const handleSlotPointerDown = (event: React.PointerEvent<HTMLElement>, index: number, mode: SlotDragMode) => {
    event.preventDefault();
    event.stopPropagation();
    const slot = slots[index];
    if (!slot) return;

    setSelectedSlotIndex(index);
    dragStateRef.current = {
      mode,
      index,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startSlot: slot,
      target: event.currentTarget
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSlotPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    const deltaX = ((event.clientX - dragState.startClientX) / previewSize.width) * width;
    const deltaY = ((event.clientY - dragState.startClientY) / previewSize.height) * height;
    setSlots((current) =>
      current.map((slot, index) => {
        if (index !== dragState.index) return slot;
        const nextSlot =
          dragState.mode === 'move'
            ? {
                ...dragState.startSlot,
                x: dragState.startSlot.x + deltaX,
                y: dragState.startSlot.y + deltaY
              }
            : {
                ...dragState.startSlot,
                width: dragState.startSlot.width + deltaX,
                height: dragState.startSlot.height + deltaY
              };
        return clampSlot(nextSlot, width, height);
      })
    );
  };

  const handleSlotPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    dragStateRef.current = null;
    try {
      dragState.target.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) return;

    onCreate({
      name: name.trim() || 'Frame AI mới',
      width,
      height,
      paperSize: selectedPreset.paperSize,
      orientation: selectedPreset.id === 'custom' ? (width >= height ? 'horizontal' : 'vertical') : selectedPreset.orientation,
      photoCount,
      slotColor,
      prompt: prompt.trim(),
      slots: slots.slice(0, photoCount).map((slot) => clampSlot(slot, width, height))
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100vh-24px)] w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-black text-slate-950">Tạo frame bằng AI</h2>
            <p className="text-xs font-medium text-slate-500">Chọn khổ frame, số ảnh, vị trí ô ảnh, chữ và prompt sinh nền.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            disabled={isGenerating}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_560px]">
          <div className="space-y-3">
            <label htmlFor="ai-frame-name" className="flex items-center gap-3 text-xs font-bold text-slate-700">
              <span className="shrink-0">Tên frame</span>
              <input
                id="ai-frame-name"
                name="frameName"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: Frame cưới tone xanh"
                autoComplete="off"
                className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 text-xs font-semibold text-slate-900 focus:border-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-100"
              />
            </label>

            <section className="rounded-md border border-slate-200 p-3">
              <div className="grid gap-3 sm:grid-cols-[1.35fr_0.75fr_0.75fr]">
                <label className="text-xs font-bold text-slate-700">
                  Kích thước frame
                  <select
                    name="aiFramePreset"
                    value={selectedPreset.id}
                    onChange={(event) => handlePresetChange(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-semibold text-slate-900 focus:border-rose-700 focus:outline-none"
                  >
                    {presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} - {preset.width} x {preset.height}px
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block truncate text-[11px] font-semibold text-slate-500">{selectedPreset.description}</span>
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Rộng
                  <input
                    name="width"
                    type="number"
                    inputMode="numeric"
                    value={width}
                    min={100}
                    onChange={(event) => handleWidthChange(Number(event.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-semibold focus:border-rose-700 focus:outline-none"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Cao
                  <input
                    name="height"
                    type="number"
                    inputMode="numeric"
                    value={height}
                    min={100}
                    onChange={(event) => handleHeightChange(Number(event.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-semibold focus:border-rose-700 focus:outline-none"
                  />
                </label>
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">
                Số lượng ảnh
                <input
                  name="photoCount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={6}
                  value={photoCount}
                  onChange={(event) => handlePhotoCountChange(Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-semibold focus:border-rose-700 focus:outline-none"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                Màu vùng đặt ảnh
                <div className="mt-1 flex h-9 items-center gap-2 rounded-md border border-slate-300 px-2">
                  <input
                    aria-label="Màu vùng đặt ảnh"
                    type="color"
                    value={slotColor}
                    onChange={(event) => setSlotColor(event.target.value)}
                    className="h-6 w-8 rounded border border-slate-200 bg-white"
                  />
                  <span className="text-xs font-mono font-bold uppercase text-slate-700">{slotColor}</span>
                </div>
              </label>
            </div>

            <section className="rounded-md border border-slate-200 p-2.5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-xs font-black uppercase text-slate-500">Ô đặt ảnh</h3>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopySelectedSlot('right')}
                    disabled={!selectedSlot || slots.length >= 6}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy phải
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopySelectedSlot('down')}
                    disabled={!selectedSlot || slots.length >= 6}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy xuống
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncSlotSize}
                    disabled={!selectedSlot || slots.length < 2}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Đồng bộ size
                  </button>
                  <button
                    type="button"
                    onClick={() => resetSlotLayout()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Dàn lại
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedSlot}
                    disabled={!selectedSlot || slots.length <= 1}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Xóa ô
                  </button>
                </div>
              </div>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {slots.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedSlotIndex(index)}
                    className={`h-7 min-w-7 rounded-md border px-2 text-[11px] font-black ${
                      selectedSlotIndex === index
                        ? 'border-rose-800 bg-rose-800 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Ảnh {index + 1}
                  </button>
                ))}
              </div>

              {selectedSlot && (
                <div className="grid grid-cols-4 gap-2">
                  <label className="text-[11px] font-bold text-slate-700">
                    X
                    <input
                      type="number"
                      inputMode="numeric"
                      value={selectedSlot.x}
                      onChange={(event) => handleSlotChange('x', Number(event.target.value))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold focus:border-rose-700 focus:outline-none"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-slate-700">
                    Y
                    <input
                      type="number"
                      inputMode="numeric"
                      value={selectedSlot.y}
                      onChange={(event) => handleSlotChange('y', Number(event.target.value))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold focus:border-rose-700 focus:outline-none"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-slate-700">
                    Rộng
                    <input
                      type="number"
                      inputMode="numeric"
                      min={40}
                      value={selectedSlot.width}
                      onChange={(event) => handleSlotChange('width', Number(event.target.value))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold focus:border-rose-700 focus:outline-none"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-slate-700">
                    Cao
                    <input
                      type="number"
                      inputMode="numeric"
                      min={40}
                      value={selectedSlot.height}
                      onChange={(event) => handleSlotChange('height', Number(event.target.value))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold focus:border-rose-700 focus:outline-none"
                    />
                  </label>
                </div>
              )}
            </section>

            <label className="block text-xs font-bold text-slate-700">
              Prompt cho AI
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                required
                placeholder="Ví dụ: frame photobooth cưới tone trắng xanh, hoa nhẹ, sang trọng, chừa vùng ảnh rõ ràng"
                className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-rose-700"
              />
            </label>

          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="mx-auto mb-4 flex min-h-[560px] items-center justify-center rounded-md bg-slate-900 p-5">
              <div
                className="relative overflow-hidden rounded-sm bg-white shadow-xl"
                style={{
                  width: previewSize.width,
                  height: previewSize.height
                }}
              >
                {slots.map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    data-ai-slot-preview={index + 1}
                    title="Kéo để đổi vị trí, kéo góc dưới phải để đổi kích thước"
                    onClick={() => setSelectedSlotIndex(index)}
                    onPointerDown={(event) => handleSlotPointerDown(event, index, 'move')}
                    onPointerMove={handleSlotPointerMove}
                    onPointerUp={handleSlotPointerUp}
                    onPointerCancel={handleSlotPointerUp}
                    className={`absolute flex touch-none select-none items-center justify-center rounded border text-sm font-black text-slate-950/75 transition-shadow ${
                      selectedSlotIndex === index ? 'border-rose-900 ring-2 ring-rose-700 ring-offset-1' : 'border-white/80'
                    }`}
                    style={{
                      left: `${(slot.x / width) * 100}%`,
                      top: `${(slot.y / height) * 100}%`,
                      width: `${(slot.width / width) * 100}%`,
                      height: `${(slot.height / height) * 100}%`,
                      backgroundColor: slotColor
                    }}
                  >
                    {index + 1}
                    <span
                      aria-hidden="true"
                      data-ai-slot-resize={index + 1}
                      onPointerDown={(event) => handleSlotPointerDown(event, index, 'resize')}
                      className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize rounded-tl bg-white/85 shadow-[0_0_0_1px_rgba(15,23,42,0.25)]"
                    >
                      <span className="absolute bottom-1 right-1 h-2 w-2 border-b-2 border-r-2 border-slate-700" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              Kéo ô ảnh để đổi vị trí, kéo góc dưới phải để đổi kích thước. Frame {width} x {height}px, {photoCount} vùng ảnh.
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-rose-800 px-4 py-2 text-sm font-bold text-white hover:bg-rose-900 disabled:bg-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isGenerating ? 'Đang tạo frame...' : 'Tạo frame AI'}
          </button>
        </div>
      </form>
    </div>
  );
};
