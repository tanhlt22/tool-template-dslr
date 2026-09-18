import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Camera,
  ChevronDown,
  ChevronUp,
  Copy,
  Image as ImageIcon,
  Layers,
  MousePointer,
  QrCode,
  Trash2,
  Type,
  X
} from 'lucide-react';
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
  userRole?: string;
  editingTemplateId?: string | null;
  isSavingTemplate?: boolean;
  onUpdateTemplateInDb?: () => void;
  onSaveNewTemplateToDb?: () => void;
}

const NumberField: React.FC<{
  label: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, name, value, onChange }) => (
  <label className="block text-xs font-bold text-slate-700">
    {label}
    <input
      name={name}
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value) ? Math.round(value) : 0}
      onChange={(event) => onChange(Number(event.target.value))}
      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-900 focus:border-rose-700 focus:outline-none"
    />
  </label>
);

export const Inspector: React.FC<InspectorProps> = ({
  selectedId,
  selectedType,
  activeElement,
  onUpdateProp,
  onDeleteElement,
  onDuplicateElement,
  onMoveLayerOrder,
  onAlignElement,
  slotsCount = 0,
  elementsCount = 0,
  canvasWidth = 1200,
  canvasHeight = 1800,
  onClose
}) => {
  const header = (() => {
    if (!activeElement) return { icon: MousePointer, title: 'Chọn đối tượng', subtitle: 'Nhấp vào lớp hoặc khung vẽ' };
    if (selectedType === 'slot') return { icon: Camera, title: `Ảnh chụp ${activeElement.order || 1}`, subtitle: 'Ô ảnh photobooth' };
    if (selectedType === 'text') return { icon: Type, title: 'Văn bản', subtitle: String(activeElement.content || '').slice(0, 28) };
    if (selectedType === 'qr') return { icon: QrCode, title: 'Mã QR', subtitle: 'Liên kết chia sẻ hoặc tải lên' };
    if (selectedType === 'image') return { icon: ImageIcon, title: 'Ảnh / Nền', subtitle: activeElement.fileName || 'Lớp ảnh' };
    return { icon: Layers, title: 'Sticker', subtitle: 'Lớp trang trí' };
  })();

  const HeaderIcon = header.icon;
  const fitSelectedImageToCanvas = () => {
    if (!activeElement || selectedType !== 'image') return;
    const aspectRatio = activeElement.aspectRatio || (activeElement.width / Math.max(activeElement.height, 1)) || 1;
    let nextWidth = canvasWidth;
    let nextHeight = nextWidth / aspectRatio;
    if (nextHeight > canvasHeight) {
      nextHeight = canvasHeight;
      nextWidth = nextHeight * aspectRatio;
    }
    onUpdateProp('bounds', {
      x: Math.round((canvasWidth - nextWidth) / 2),
      y: Math.round((canvasHeight - nextHeight) / 2),
      width: Math.round(nextWidth),
      height: Math.round(nextHeight),
      rotation: 0
    });
  };

  return (
    <aside className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-black text-slate-950">Thuộc tính</h2>
          <p className="text-[11px] font-semibold text-slate-500">Chỉnh sửa lớp đang chọn</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng thuộc tính"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-rose-800 shadow-sm">
            <HeaderIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{header.title}</p>
            <p className="truncate text-xs font-semibold text-slate-500">{header.subtitle}</p>
          </div>
        </div>

        {!activeElement ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[10px] font-bold uppercase text-slate-500">Khung</p>
                <p className="mt-1 truncate text-xs font-black text-slate-950">{canvasWidth}x{canvasHeight}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[10px] font-bold uppercase text-slate-500">Ảnh</p>
                <p className="mt-1 text-xs font-black text-slate-950">{slotsCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[10px] font-bold uppercase text-slate-500">Lớp</p>
                <p className="mt-1 text-xs font-black text-slate-950">{elementsCount}</p>
              </div>
            </div>
            <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-relaxed text-slate-600">
              Chọn một ô ảnh, chữ, QR hoặc ảnh trên khung vẽ để chỉnh thuộc tính chi tiết.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <section>
              <h3 className="mb-2 text-xs font-black uppercase text-slate-500">Căn lề nhanh</h3>
              <div className="grid grid-cols-6 gap-1">
                {[
                  ['left', AlignLeft, 'Trái'],
                  ['center-h', AlignCenter, 'Giữa ngang'],
                  ['right', AlignRight, 'Phải'],
                  ['top', AlignLeft, 'Trên'],
                  ['center-v', AlignCenter, 'Giữa dọc'],
                  ['bottom', AlignRight, 'Dưới']
                ].map(([type, Icon, label]) => (
                  <button
                    key={String(type)}
                    type="button"
                    title={String(label)}
                    onClick={() => onAlignElement(selectedId!, type as any)}
                    className="flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    {React.createElement(Icon as any, { className: `h-4 w-4 ${['top', 'center-v', 'bottom'].includes(String(type)) ? 'rotate-90' : ''}`, 'aria-hidden': true })}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onMoveLayerOrder(selectedId!, 'up')}
                className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <ChevronUp className="mx-auto h-4 w-4" aria-hidden="true" />
                Lên
              </button>
              <button
                type="button"
                onClick={() => onMoveLayerOrder(selectedId!, 'down')}
                className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <ChevronDown className="mx-auto h-4 w-4" aria-hidden="true" />
                Xuống
              </button>
              <button
                type="button"
                onClick={() => onDuplicateElement(selectedId!)}
                className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Copy className="mx-auto h-4 w-4" aria-hidden="true" />
                Sao chép
              </button>
            </section>

            <section className="rounded-md border border-slate-200 p-3">
              <h3 className="mb-2 text-xs font-black uppercase text-slate-500">Vị trí và kích thước</h3>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="X" name="x" value={activeElement.x} onChange={(value) => onUpdateProp('x', value)} />
                <NumberField label="Y" name="y" value={activeElement.y} onChange={(value) => onUpdateProp('y', value)} />
                <NumberField label="Rộng" name="width" value={activeElement.width} onChange={(value) => onUpdateProp('width', value)} />
                <NumberField label="Cao" name="height" value={activeElement.height} onChange={(value) => onUpdateProp('height', value)} />
              </div>
              <label className="mt-2 block text-xs font-bold text-slate-700">
                Xoay
                <input
                  name="rotation"
                  type="range"
                  min="-180"
                  max="180"
                  value={activeElement.rotation || 0}
                  onChange={(event) => onUpdateProp('rotation', Number(event.target.value))}
                  className="mt-1 w-full accent-rose-800"
                />
                <span className="text-[11px] font-semibold text-slate-500">{activeElement.rotation || 0} độ</span>
              </label>
            </section>

            {selectedType === 'slot' && (
              <section className="rounded-md border border-slate-200 p-3">
                <label className="block text-xs font-bold text-slate-700">
                  Thứ tự ảnh
                  <select
                    name="slotOrder"
                    value={activeElement.order || 1}
                    onChange={(event) => onUpdateProp('order', Number(event.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:border-rose-700 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <option key={item} value={item}>
                        Ảnh {item}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
            )}

            {selectedType === 'text' && (
              <section className="space-y-2 rounded-md border border-slate-200 p-3">
                <label className="block text-xs font-bold text-slate-700">
                  Nội dung
                  <input
                    name="textContent"
                    type="text"
                    value={activeElement.content}
                    onChange={(event) => onUpdateProp('content', event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:border-rose-700 focus:outline-none"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Phông chữ
                  <select
                    name="fontFamily"
                    value={activeElement.style?.fontFamily || 'Outfit'}
                    onChange={(event) => onUpdateProp('fontFamily', event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:border-rose-700 focus:outline-none"
                  >
                    {GOOGLE_FONTS.map((font) => (
                      <option key={font.name} value={font.value}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </label>
                <NumberField label="Cỡ chữ" name="fontSize" value={activeElement.style?.fontSize || 24} onChange={(value) => onUpdateProp('fontSize', value)} />
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  Màu chữ
                  <input
                    aria-label="Màu chữ"
                    type="color"
                    value={activeElement.style?.color || '#111827'}
                    onChange={(event) => onUpdateProp('color', event.target.value)}
                    className="h-8 w-12 rounded border border-slate-300 bg-white"
                  />
                </label>
              </section>
            )}

            {selectedType === 'qr' && (
              <section className="rounded-md border border-slate-200 p-3">
                <label className="block text-xs font-bold text-slate-700">
                  Liên kết QR
                  <input
                    name="qrLink"
                    type="url"
                    value={activeElement.content}
                    onChange={(event) => onUpdateProp('content', event.target.value)}
                    placeholder="https://..."
                    autoComplete="off"
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:border-rose-700 focus:outline-none"
                  />
                </label>
              </section>
            )}

            {selectedType === 'image' && (
              <section className="space-y-3 rounded-md border border-slate-200 p-3">
                <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                  Khóa tỷ lệ ảnh
                  <input
                    type="checkbox"
                    checked={activeElement.lockRatio !== false}
                    onChange={(event) => onUpdateProp('lockRatio', event.target.checked)}
                    className="h-4 w-4 accent-rose-800"
                  />
                </label>
                <button
                  type="button"
                  onClick={fitSelectedImageToCanvas}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                >
                  Căn ảnh vừa khung
                </button>
              </section>
            )}

            <button
              type="button"
              onClick={() => onDeleteElement(selectedId!)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Xóa lớp đang chọn
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Inspector;
