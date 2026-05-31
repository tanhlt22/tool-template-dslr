import React from 'react';
import { CheckCircle, Download } from 'lucide-react';

interface ExportModalProps {
  exportResult: any;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  exportResult,
  onClose
}) => {
  if (!exportResult) return null;

  return (
    <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-xl border border-[#dee8ff] p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-slate-200/50 animate-fade-in z-20">
      <div className="flex items-center gap-4">
        <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-200/50">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#111c2d]">Xuất Frame Thành Công!</h3>
          <p className="text-xs text-slate-500 font-semibold truncate max-w-[400px]">
            Lưu cấu hình: {exportResult.frame_id}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={exportResult.image_url}
          download={`${exportResult.name || 'frame'}.png`}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-[#0058be] hover:bg-[#004395] text-white shadow-md shadow-[#0058be]/10 transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          Tải Ảnh PNG Về Máy
        </a>
        <button
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-[#111c2d] px-3 font-bold"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};
export default ExportModal;
