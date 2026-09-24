import React from 'react';
import {
  Edit3,
  FilePlus2,
  Import,
  RefreshCw,
  Star,
  Trash2,
  PenTool,
  Copy,
  Search,
  ShieldCheck
} from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { FrameConfig } from '../types/canvas';
import { TemplateThumbnail } from './TemplateThumbnail';

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
  onRenameFrame?: (frameId: string, newName: string, password?: string) => Promise<boolean>;
  onOpenEditor?: () => void;
  isAdmin?: boolean;
}

const fallbackTemplates: TemplateRecord[] = [];

const getFrames = (frames: TemplateRecord[]) => (frames.length > 0 ? frames : fallbackTemplates);

export const FrameLibrary: React.FC<FrameLibraryProps> = ({
  frames,
  onCreateNew,
  onEditFrame,
  onRefresh,
  onDuplicateFrame,
  onDeleteFrame,
  onRenameFrame,
  onOpenEditor,
  isAdmin = false
}) => {
  const { showPrompt, showToast } = useUI();
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const visibleFrames = getFrames(frames);

  const categories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'wedding', label: '💍 Đám cưới' },
    { id: 'birthday', label: '🎂 Sinh nhật' },
    { id: 'event', label: '🎉 Sự kiện' },
    { id: 'graduation', label: '🎓 Kỷ yếu' },
    { id: 'couple', label: '❤️ Cặp đôi' },
    { id: 'y2k', label: '✨ Y2K' },
    { id: 'holiday', label: '🎄 Lễ hội' },
    { id: 'general', label: '🖼️ Khác' }
  ];

  const filteredFrames = visibleFrames.filter((frame) => {
    const matchesCategory = selectedCategory === 'all' || (frame as any).category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      (frame.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });

  const handleRename = async (frame: TemplateRecord) => {
    if (!onRenameFrame) return;

    if (!frame.id || String(frame.id).startsWith('demo_')) {
      showToast('Đây là mẫu minh họa, không thể đổi tên.', 'info');
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
    <main className="flex min-w-0 flex-1 flex-col bg-slate-50 overflow-y-auto">
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black text-slate-950">Quản trị Thư viện Khung</h1>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-800">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
              Toàn quyền Quản trị
            </span>
          )}
        </div>

        {onOpenEditor && (
          <button
            type="button"
            onClick={onOpenEditor}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-sm"
          >
            <PenTool className="h-4 w-4 text-rose-400" aria-hidden="true" />
            Mở Trình thiết kế (Canvas)
          </button>
        )}
      </header>

      <section className="m-4 flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Danh sách khung hình trên hệ thống</h2>
            <p className="text-xs font-medium text-slate-500">
              {isAdmin
                ? 'Bạn có quyền sửa, đổi tên, nhân bản hoặc xóa vĩnh viễn bất kỳ khung hình nào.'
                : 'Chọn khung hình có sẵn hoặc tạo khung hình mới để chỉnh sửa.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm khung hình..."
                className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-200 w-48 sm:w-60 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Làm mới
            </button>

            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-900 transition-colors shadow-sm"
            >
              <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
              Tạo khung hình mới
            </button>
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {filteredFrames.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
            <p className="text-sm font-bold text-slate-500">
              {searchQuery ? `Không tìm thấy khung hình nào khớp với "${searchQuery}"` : 'Chưa có mẫu khung hình nào trong danh mục này.'}
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:underline"
            >
              <FilePlus2 className="h-3.5 w-3.5" /> Tạo mẫu mới ngay
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredFrames.map((frame, index) => (
              <article
                key={frame.id || index}
                className="group rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition-all hover:border-rose-200 hover:shadow-md"
              >
                <div className="relative overflow-hidden rounded-xl bg-slate-100">
                  <TemplateThumbnail frame={frame} scale={1.8} />
                  {(frame as any).category && (
                    <span className="absolute top-2 right-2 rounded-lg bg-slate-900/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {(frame as any).category}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xs font-black text-slate-950" title={frame.name}>
                      {frame.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {frame.width} x {frame.height} | {frame.slots?.length || 0} ô ảnh
                    </p>
                  </div>
                  {onRenameFrame && (
                    <button
                      type="button"
                      title="Đổi tên khung hình"
                      onClick={() => handleRename(frame)}
                      className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-700 transition-colors"
                    >
                      <PenTool className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onEditFrame(frame)}
                    title="Chỉnh sửa khung hình trong Canvas"
                    aria-label={`Sửa ${frame.name}`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50/60 p-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sửa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicateFrame(frame)}
                    title="Nhân bản khung hình"
                    aria-label={`Nhân bản ${frame.name}`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Nhân bản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteFrame(frame)}
                    title="Xóa vĩnh viễn khung hình"
                    aria-label={`Xóa ${frame.name}`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50/60 p-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Xóa</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

