import React, { useEffect, useState } from 'react';
import { FolderHeart, Save, Tag, X } from 'lucide-react';

export const FRAME_CATEGORIES = [
  { id: 'wedding', label: 'Đám cưới (Wedding)', icon: '💍' },
  { id: 'birthday', label: 'Sinh nhật (Birthday)', icon: '🎂' },
  { id: 'event', label: 'Sự kiện / Doanh nghiệp', icon: '🎉' },
  { id: 'graduation', label: 'Kỷ yếu / Tốt nghiệp', icon: '🎓' },
  { id: 'couple', label: 'Cặp đôi / Tình yêu', icon: '❤️' },
  { id: 'y2k', label: 'Y2K / Retro / Vintage', icon: '✨' },
  { id: 'holiday', label: 'Lễ hội / Tết / Noel', icon: '🎄' },
  { id: 'general', label: 'Chung / Mặc định', icon: '🖼️' }
];

interface SaveFrameModalProps {
  isOpen: boolean;
  defaultName: string;
  defaultCategory?: string;
  isSaving: boolean;
  existingNames?: string[];
  isForExport?: boolean;
  onClose: () => void;
  onSave: (name: string, category: string) => void;
}

export const SaveFrameModal: React.FC<SaveFrameModalProps> = ({
  isOpen,
  defaultName,
  defaultCategory = 'wedding',
  isSaving,
  existingNames = [],
  isForExport = false,
  onClose,
  onSave
}) => {
  const [name, setName] = useState(defaultName || '');
  const [category, setCategory] = useState(defaultCategory || 'wedding');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName || '');
      const matched = FRAME_CATEGORIES.some((c) => c.id === defaultCategory);
      if (matched) {
        setCategory(defaultCategory);
        setIsCustom(false);
      } else if (defaultCategory) {
        setCategory('custom');
        setCustomCategory(defaultCategory);
        setIsCustom(true);
      } else {
        setCategory('wedding');
        setIsCustom(false);
      }
    }
  }, [defaultName, defaultCategory, isOpen]);

  if (!isOpen) return null;

  const isDuplicate = Boolean(
    name.trim() &&
      existingNames.some(
        (existing) => existing.trim().toLowerCase() === name.trim().toLowerCase()
      )
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDuplicate) return;
    const finalCategory = isCustom ? customCategory.trim() || 'general' : category;
    onSave(name.trim(), finalCategory);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <FolderHeart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Lưu mẫu khung hình</h2>
              <p className="text-xs font-medium text-slate-500">
                {isForExport ? 'Lưu khung hình vào hệ thống để tiếp tục xuất file.' : 'Lưu thiết kế vào thư viện mẫu của hệ thống.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Đóng"
            className="rounded-md p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-800 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {isForExport && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-xs font-semibold text-amber-800 flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <span>Bạn cần lưu thiết kế khung hình vào hệ thống trước khi tiến hành xuất file ảnh hoặc gói DSLRBooth.</span>
            </div>
          )}
          {/* Tên mẫu */}
          <div>
            <label htmlFor="save-frame-name" className="mb-1.5 block text-xs font-bold text-slate-700">
              Tên mẫu khung hình <span className="text-rose-600">*</span>
            </label>
            <input
              id="save-frame-name"
              type="text"
              required
              value={name}
              autoFocus
              placeholder="VD: Khung Cưới Vintage 4x6, Kỷ Yếu 2026..."
              onChange={(event) => setName(event.target.value)}
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                isDuplicate
                  ? 'border-rose-500 focus:border-rose-600 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-rose-600 focus:ring-rose-100'
              }`}
            />
            {isDuplicate && (
              <p className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1">
                ⚠️ Tên khung hình này đã tồn tại trong hệ thống. Vui lòng đặt tên khác để tránh trùng lặp!
              </p>
            )}
          </div>

          {/* Phân loại khung hình */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Tag className="h-3.5 w-3.5 text-rose-600" />
                Loại khung hình (Chủ đề)
              </label>
              <button
                type="button"
                onClick={() => setIsCustom(!isCustom)}
                className="text-[11px] font-bold text-rose-600 hover:underline"
              >
                {isCustom ? 'Chọn từ danh mục' : '+ Nhập loại khác'}
              </button>
            </div>

            {isCustom ? (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Nhập tên loại khung (VD: Trung thu, Halloween, Khai trương...)"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-100"
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FRAME_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-rose-600 bg-rose-50/80 text-rose-900 shadow-sm ring-1 ring-rose-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base leading-none">{cat.icon}</span>
                      <span className="truncate">{cat.label.split(' (')[0]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim() || isDuplicate}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-rose-900/10 hover:bg-rose-800 disabled:opacity-50 transition-all"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSaving ? 'Đang lưu lên hệ thống...' : isForExport ? 'Lưu & Xuất file ngay' : 'Lưu mẫu ngay'}
          </button>
        </div>
      </form>
    </div>
  );
};
