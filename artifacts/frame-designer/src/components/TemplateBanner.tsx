import React from 'react';

interface TemplateBannerProps {
  editingTemplateId: string;
  frameName: string;
  isSavingTemplate: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export const TemplateBanner: React.FC<TemplateBannerProps> = ({
  editingTemplateId, frameName, isSavingTemplate, onCancel, onSave
}) => {
  const isNew = editingTemplateId === 'new_draft';

  return (
    <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md shrink-0 animate-fade-in z-20">
      <div className="flex items-center gap-2">
        <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider animate-pulse">
          {isNew ? 'Chế độ tạo mẫu DSLRbooth mới' : 'Chế độ sửa mẫu DSLRbooth'}
        </span>
        <span className="text-xs font-bold">
          Bạn đang thiết kế trực quan cho mẫu{isNew ? ' mới' : ''}: <strong className="underline">{frameName}</strong>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="px-3.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold transition-all"
        >
          Hủy &amp; Quay Lại Admin
        </button>
        <button
          onClick={onSave}
          disabled={isSavingTemplate}
          className="px-4 py-1 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
        >
          {isSavingTemplate ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              Đang lưu...
            </>
          ) : (
            isNew ? 'Lưu Thành Mẫu Mới' : 'Lưu Cập Nhật DB Supabase'
          )}
        </button>
      </div>
    </div>
  );
};
