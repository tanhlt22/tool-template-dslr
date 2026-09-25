import React, { useState, useEffect } from 'react';
import { Plus, Trash, Sparkles, Image as ImageIcon, Camera, Type, Loader2, Lock, Cloud, FolderKanban } from 'lucide-react';
import { apiService } from '../../services/api';
import { useUI } from '../../contexts/UIContext';
import { getAssetUrl } from '../../utils/storage';

interface Slot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  order: number;
}

interface Element {
  id: string;
  type: 'text' | 'icon' | 'image' | 'qr';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  style?: {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    order?: number;
  };
}

interface Template {
  id: string;
  name: string;
  category?: string;
  width: number;
  height: number;
  background_prompt?: string;
  background_image_url?: string | null;
  slots: Slot[];
  elements?: Element[];
  elements_count?: number;
  is_list_item?: boolean;
  created_at?: string;
}

interface AdminTabProps {
  onLoadTemplateToStudioAI?: (template: any) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'wedding', label: 'Tiệc Cưới' },
  { id: 'birthday', label: 'Sinh Nhật' },
  { id: 'party', label: 'Sự Kiện / Party' },
  { id: 'graduation', label: 'Kỷ Yếu' },
  { id: 'general', label: 'Khác' }
];

export const AdminTab: React.FC<AdminTabProps> = ({ onLoadTemplateToStudioAI }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { showToast, showConfirm } = useUI();
  
  useEffect(() => {
    fetchTemplates('all');
  }, []);

  const fetchTemplates = async (cat?: string) => {
    setIsLoading(true);
    try {
      const categoryToFetch = cat !== undefined ? cat : selectedCategory;
      const data = await apiService.getFrames(categoryToFetch);
      setTemplates(data);
    } catch (e) {
      console.error('Failed to load templates:', e);
      showToast('Lỗi khi nạp danh sách mẫu: ' + e, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    fetchTemplates(catId);
  };

  const handleCreateNew = () => {
    const newTemplate: Template = {
      id: '',
      name: 'Mẫu Thiết Kế Mới ' + (templates.length + 1),
      category: selectedCategory === 'all' ? 'wedding' : selectedCategory,
      width: 1200,
      height: 1800,
      background_image_url: '',
      background_prompt: 'color',
      slots: [
        { id: 'slot_1', x: 80, y: 120, width: 480, height: 360, rotation: 0, order: 1 },
        { id: 'slot_2', x: 640, y: 120, width: 480, height: 360, rotation: 0, order: 2 }
      ],
      elements: [
        {
          id: 'text_title',
          type: 'text',
          content: 'HAPPY DAY',
          x: 200,
          y: 1560,
          width: 800,
          height: 80,
          rotation: 0,
          style: {
            color: '#dfb26b',
            fontSize: 48,
            fontFamily: 'Outfit',
            fontWeight: 'bold',
            order: 0
          }
        }
      ]
    };

    if (onLoadTemplateToStudioAI) {
      onLoadTemplateToStudioAI(newTemplate);
    }
  };

  const handleLoadTemplateToStudioAI = async (template: Template) => {
    if (!onLoadTemplateToStudioAI) return;

    try {
      const fullTemplate = Array.isArray(template.elements)
        && !template.is_list_item ? template
        : await apiService.getFrame(template.id);
      onLoadTemplateToStudioAI(fullTemplate);
    } catch (error) {
      showToast('Không thể tải chi tiết mẫu: ' + String(error), 'error');
    }
  };

  const handleDeleteFrame = async (frameId: string) => {
    const ok = await showConfirm({
      title: 'Cảnh báo',
      message: 'Bạn có chắc chắn muốn xóa vĩnh viễn mẫu thiết kế này khỏi hệ thống? Dữ liệu mẫu sẽ bị xóa vĩnh viễn.',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy'
    });
    
    if (!ok) return;

    try {
      await apiService.deleteFrame(frameId);
      showToast('Đã xóa mẫu thiết kế thành công!', 'success');
      fetchTemplates();
    } catch (e: any) {
      showToast('Lỗi khi xóa mẫu: ' + e, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fbfdff] overflow-hidden h-full">
      {/* Section Header */}
      <div className="bg-[#fcfdfe] border-b border-[#dee8ff]/60 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center shrink-0 gap-3">
        <div>
          <h3 className="text-base font-black text-[#111c2d] flex items-center gap-2">
            ⚙️ HỆ THỐNG QUẢN TRỊ MẪU DSLRBOOTH
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Lưu trữ đám mây trực tuyến tốc độ cao & bảo mật
          </p>
        </div>
        
        <button
          onClick={handleCreateNew}
          className="px-5 py-2.5 bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:shadow-lg text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Mẫu Thiết Kế Mới</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Info Banner */}
        <div className="bg-white border border-[#dee8ff] rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.01)] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f0f3ff] rounded-xl text-[#0058be]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#111c2d] uppercase tracking-wider">Hệ Thống Lưu Trữ Trực Tuyến Tự Động</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Mẫu và ảnh được đồng bộ tự động lên kho dữ liệu hệ thống, truy xuất siêu nhanh và phân loại khoa học theo chủ đề.
              </p>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-black text-slate-500 uppercase mr-1 flex items-center gap-1">
            <FolderKanban className="w-3.5 h-3.5 text-[#0058be]" /> Phân loại:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#0058be] text-white shadow-sm shadow-[#0058be]/20'
                  : 'bg-white text-slate-600 border border-[#dee8ff] hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* List Grid View */}
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 font-bold">
              <Loader2 className="w-8 h-8 text-[#0058be] animate-spin" />
              <span className="text-xs">Đang nạp các mẫu thiết kế từ hệ thống...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-[#dee8ff] rounded-2xl p-6">
              <p className="text-sm font-bold text-slate-600">Trống trơn! Không tìm thấy mẫu nào trong phân loại này</p>
              <button
                onClick={handleCreateNew}
                className="mt-4 px-4 py-2 bg-[#0058be] text-white rounded-xl text-xs font-black inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Tạo Mẫu Đầu Tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tmpl) => {
                const isDefault = tmpl.id.startsWith('template_');
                const bgUrl = getAssetUrl(tmpl.background_image_url);

                return (
                  <div 
                    key={tmpl.id}
                    className="bg-white border border-[#dee8ff]/80 hover:border-[#0058be]/40 p-5 rounded-2xl transition-all shadow-[0_2px_15px_rgba(0,0,0,0.01)] hover:shadow-md relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Lock / Live badges */}
                      <div className="flex items-center justify-between mb-3.5">
                        {isDefault ? (
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-slate-200">
                            <Lock className="w-2.5 h-2.5" /> Mặc Định (Fix)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-emerald-100">
                              ● Lưu trữ đám mây
                            </span>
                            {tmpl.category && (
                              <span className="text-[9px] bg-blue-50 text-blue-600 font-bold uppercase px-2 py-0.5 rounded-md border border-blue-100">
                                {tmpl.category}
                              </span>
                            )}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          {tmpl.width}x{tmpl.height}
                        </span>
                      </div>

                      {/* Thumbnail / Visual Box */}
                      <div 
                        className="h-[120px] rounded-xl mb-4 bg-slate-900 border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner bg-cover bg-center"
                        style={{
                          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined
                        }}
                      >
                        {!bgUrl && (
                          <div className="text-center font-bold text-[10px] text-slate-400 flex flex-col items-center gap-1">
                            <div className="p-2 bg-slate-800 rounded-full border border-slate-700">
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            </div>
                            <span>{tmpl.name}</span>
                          </div>
                        )}
                      </div>

                      <h4 className="font-extrabold text-sm text-[#111c2d] truncate mb-2">{tmpl.name}</h4>
                      
                      <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
                        <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5 text-slate-400" /> {(tmpl.slots || []).length} ô ảnh</span>
                        <span className="flex items-center gap-1"><Type className="w-3.5 h-3.5 text-slate-400" /> {(tmpl.elements ?? []).length} Chữ</span>
                      </div>
                    </div>

                    {/* Card Action footer */}
                    <div className="flex items-center justify-end gap-2 mt-auto">
                      {isDefault ? (
                        <button
                          onClick={() => showToast('Mẫu mặc định không được phép chỉnh sửa hoặc xóa để bảo vệ tính nhất quán của hệ thống. Bạn có thể tự do tạo mẫu mới!', 'info')}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 border border-slate-200/50"
                        >
                          <Lock className="w-3.5 h-3.5" /> Mặc Định (Fix)
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleDeleteFrame(tmpl.id)}
                            className="px-3.5 py-2 hover:bg-rose-50 border border-rose-250 text-rose-600 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                            title="Xóa mẫu"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                          
                          {onLoadTemplateToStudioAI && (
                            <button
                              onClick={() => handleLoadTemplateToStudioAI(tmpl)}
                              className="flex-1 py-2 bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:from-[#004b9e] hover:to-[#175cc0] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all border border-blue-600/10 hover:shadow-md hover:shadow-blue-600/10 active:scale-[0.98] cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                              Thiết Kế (Studio AI)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTab;
