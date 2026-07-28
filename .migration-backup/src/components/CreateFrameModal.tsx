import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface NewFrameConfig {
  name: string;
  width: number;
  height: number;
  paperSize: string;
  orientation: 'vertical' | 'horizontal';
}

interface CreateFrameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: NewFrameConfig) => void;
}

const presets = [
  { id: '4x6-v', name: '4x6 doc', description: 'Frame in anh dung', width: 1200, height: 1800, paperSize: '4x6', orientation: 'vertical' as const },
  { id: '4x6-h', name: '4x6 ngang', description: 'Frame ngang cho booth', width: 1800, height: 1200, paperSize: '4x6', orientation: 'horizontal' as const },
  { id: '2x6-v', name: '2x6 doc', description: 'Strip doc 3 anh', width: 600, height: 1800, paperSize: '2x6', orientation: 'vertical' as const },
  { id: '2x6-h', name: '2x6 ngang', description: 'Strip ngang 2 anh', width: 1800, height: 600, paperSize: '2x6', orientation: 'horizontal' as const },
  { id: 'custom', name: 'Tuy chinh', description: 'Nhap kich thuoc rieng', width: 1200, height: 1800, paperSize: 'custom', orientation: 'vertical' as const }
];

export const CreateFrameModal: React.FC<CreateFrameModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [selectedPreset, setSelectedPreset] = useState(presets[0]);
  const [name, setName] = useState('Frame moi');
  const [width, setWidth] = useState(selectedPreset.width);
  const [height, setHeight] = useState(selectedPreset.height);

  if (!isOpen) return null;

  const handlePresetChange = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId) || presets[0];
    setSelectedPreset(preset);
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreate({
      name: name.trim() || 'Frame moi',
      width,
      height,
      paperSize: selectedPreset.paperSize,
      orientation: selectedPreset.orientation
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100vh-32px)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-black text-slate-950">Tao frame moi</h2>
            <p className="text-xs font-medium text-slate-500">Chon kich thuoc truoc khi vao man chinh sua.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dong"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[1fr_240px]">
          <div>
            <label htmlFor="frame-name" className="mb-1 block text-xs font-bold text-slate-700">
              Ten frame
            </label>
            <input
              id="frame-name"
              name="frameName"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Vi du: Frame cuoi hoi..."
              autoComplete="off"
              className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-100"
            />

            <fieldset>
              <legend className="mb-2 text-xs font-bold text-slate-700">Kich thuoc frame</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {presets.map((preset) => (
                  <label
                    key={preset.id}
                    className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
                      selectedPreset.id === preset.id
                        ? 'border-rose-700 bg-rose-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="framePreset"
                      value={preset.id}
                      checked={selectedPreset.id === preset.id}
                      onChange={(event) => handlePresetChange(event.target.value)}
                      className="mt-1 h-4 w-4 accent-rose-800"
                    />
                    <span>
                      <span className="block text-sm font-black text-slate-950">{preset.name}</span>
                      <span className="block text-xs font-medium text-slate-500">{preset.description}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-slate-500">
                        {preset.width} x {preset.height}px
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="mx-auto mb-4 flex h-52 items-center justify-center rounded-md bg-slate-900 p-4">
              <div
                className="rounded-sm bg-white shadow-xl"
                style={{
                  width: width >= height ? 180 : Math.max(54, Math.round((width / height) * 180)),
                  height: width >= height ? Math.max(54, Math.round((height / width) * 180)) : 180
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-slate-700">
                Rong
                <input
                  name="width"
                  type="number"
                  inputMode="numeric"
                  value={width}
                  min={100}
                  onChange={(event) => {
                    setSelectedPreset(presets[presets.length - 1]);
                    setWidth(Number(event.target.value));
                  }}
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
                  onChange={(event) => {
                    setSelectedPreset(presets[presets.length - 1]);
                    setHeight(Number(event.target.value));
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-semibold focus:border-rose-700 focus:outline-none"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            Huy
          </button>
          <button
            type="submit"
            className="rounded-md bg-rose-800 px-4 py-2 text-sm font-bold text-white hover:bg-rose-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            Tao va chinh sua
          </button>
        </div>
      </form>
    </div>
  );
};
