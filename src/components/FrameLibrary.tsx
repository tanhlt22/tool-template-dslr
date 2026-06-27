import React from 'react';
import {
  Edit3,
  FilePlus2,
  Import,
  RefreshCw,
  Star,
  Trash2,
  PenTool
} from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { FrameConfig } from '../types/canvas';

interface TemplateRecord extends FrameConfig {
  id: string;
  created_at?: string;
  background_prompt?: string;
  background_image_url?: string | null;
}

interface FrameLibraryProps {
  frames: TemplateRecord[];
  onCreateNew: () => void;
  onEditFrame: (frame: TemplateRecord) => void;
  onRefresh: () => void;
  onDuplicateFrame: (frame: TemplateRecord) => void;
  onDeleteFrame: (frame: TemplateRecord) => void;
  onRenameFrame?: (frameId: string, newName: string) => Promise<boolean>;
  onOpenEditor?: () => void;
}

const fallbackTemplates: TemplateRecord[] = [
  {
    id: 'demo_strip_3',
    name: '3slot_D_cut',
    width: 600,
    height: 1800,
    slots: [
      { id: 'slot_1', x: 70, y: 120, width: 460, height: 390, rotation: 0, order: 1 },
      { id: 'slot_2', x: 70, y: 585, width: 460, height: 390, rotation: 0, order: 2 },
      { id: 'slot_3', x: 70, y: 1050, width: 460, height: 390, rotation: 0, order: 3 }
    ],
    elements: []
  },
  {
    id: 'demo_4x6_2',
    name: 'Frame moi 2',
    width: 1200,
    height: 1800,
    slots: [
      { id: 'slot_1', x: 145, y: 175, width: 910, height: 580, rotation: 0, order: 1 },
      { id: 'slot_2', x: 145, y: 835, width: 910, height: 580, rotation: 0, order: 2 }
    ],
    elements: []
  },
  {
    id: 'demo_landscape_2',
    name: 'Frame moi 3 cat',
    width: 1800,
    height: 1200,
    slots: [
      { id: 'slot_1', x: 780, y: 230, width: 425, height: 650, rotation: 0, order: 1 },
      { id: 'slot_2', x: 1250, y: 230, width: 425, height: 650, rotation: 0, order: 2 }
    ],
    elements: []
  }
];

const getFrames = (frames: TemplateRecord[]) => (frames.length > 0 ? frames : fallbackTemplates);

const TemplateThumbnail: React.FC<{ frame: TemplateRecord }> = ({ frame }) => {
  const image = frame.background_image_url || frame.backgroundImageUrl;
  const width = frame.width || 1200;
  const height = frame.height || 1800;
  const isLandscape = width > height;

  return (
    <div className="flex h-28 items-center justify-center rounded-md bg-slate-100 p-2">
      <div
        className="relative overflow-hidden rounded-sm border border-slate-200 bg-[#f8eee5] shadow-sm"
        style={{
          width: isLandscape ? 92 : Math.max(42, Math.round((width / height) * 92)),
          height: isLandscape ? Math.max(42, Math.round((height / width) * 92)) : 92,
          backgroundImage: image ? `url(${image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {frame.slots?.map((slot, index) => (
          <div
            key={slot.id || index}
            className="absolute flex items-center justify-center rounded-[2px] border border-slate-300 bg-slate-200 text-[10px] font-black text-rose-800"
            style={{
              left: `${(slot.x / width) * 100}%`,
              top: `${(slot.y / height) * 100}%`,
              width: `${(slot.width / width) * 100}%`,
              height: `${(slot.height / height) * 100}%`
            }}
          >
            {slot.order || index + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

export const FrameLibrary: React.FC<FrameLibraryProps> = ({
  frames,
  onCreateNew,
  onEditFrame,
  onRefresh,
  onDuplicateFrame,
  onDeleteFrame,
  onRenameFrame,
  onOpenEditor
}) => {
  const { showPrompt, showToast } = useUI();
  const visibleFrames = getFrames(frames);

  const handleRename = async (frame: TemplateRecord) => {
    if (!onRenameFrame) return;

    if (!frame.id || String(frame.id).startsWith('demo_')) {
      showToast('Đây là mẫu minh họa, không thể đổi tên.', 'info');
      return;
    }

    const password = await showPrompt({
      title: 'Xác thực bảo mật',
      message: 'Vui lòng nhập mật khẩu quản trị viên để đổi tên:',
      type: 'password',
      placeholder: 'Nhập mật khẩu...',
      confirmText: 'Tiếp tục',
      cancelText: 'Hủy'
    });

    if (password === null) return;
    
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'theanh2002';
    if (password !== adminPassword) {
      showToast('Mật khẩu không đúng. Không thể đổi tên!', 'error');
      return;
    }

    const newName = await showPrompt({
      title: 'Đổi tên Frame',
      message: 'Nhập tên mới cho frame này:',
      placeholder: 'Tên mới...',
      defaultValue: frame.name,
      confirmText: 'Lưu thay đổi',
      cancelText: 'Hủy'
    });

    if (newName !== null && newName.trim() !== '' && newName.trim() !== frame.name) {
      await onRenameFrame(frame.id, newName.trim());
    }
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center gap-4">
        <h1 className="text-xl font-black text-slate-950">Frame</h1>
        {onOpenEditor && (
          <button
            type="button"
            onClick={onOpenEditor}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <PenTool className="h-4 w-4" aria-hidden="true" />
            Chỉnh sửa Frame
          </button>
        )}
      </header>

      <section className="m-4 flex-1 border border-slate-200 bg-white p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Thu vien template</h2>
            <p className="text-xs font-medium text-slate-500">Chon frame co san hoac tao frame moi de chinh sua.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              <Import className="h-3.5 w-3.5" aria-hidden="true" />
              Import template
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh
            </button>

            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 rounded-md bg-rose-800 px-3 py-2 text-xs font-bold text-white hover:bg-rose-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
              Tao frame moi
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {visibleFrames.map((frame, index) => (
            <article
              key={frame.id || index}
              className="group rounded-md border border-slate-200 bg-white p-2 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50/40"
            >
              <div className="relative">

                <TemplateThumbnail frame={frame} />
              </div>

              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xs font-black text-slate-950" title={frame.name}>
                    {frame.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {frame.width} x {frame.height} | {frame.slots?.length || 0} anh
                  </p>
                </div>
                {onRenameFrame && (
                  <button
                    type="button"
                    title="Đổi tên Frame"
                    onClick={() => handleRename(frame)}
                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  >
                    <PenTool className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => onEditFrame(frame)}
                  title="Chỉnh sửa Frame"
                  aria-label={`Sua ${frame.name}`}
                  className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-rose-300 hover:text-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                >
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Tải file DSLR"
                  className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-rose-300 hover:text-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                  aria-label={`Xuat ${frame.name}`}
                >
                  <Import className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteFrame(frame)}
                  title="Xóa Frame"
                  aria-label={`Xoa ${frame.name}`}
                  className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-rose-300 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};
