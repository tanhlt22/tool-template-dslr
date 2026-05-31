import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash, Edit3, Save, Upload, Image as ImageIcon, 
  Grid, Sliders, X, Check, Loader2, Sparkles, Lock, ArrowLeft,
  Camera, Type, QrCode
} from 'lucide-react';
import { apiService } from '../../services/api';

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
  width: number;
  height: number;
  background_prompt?: string;
  background_image_url?: string | null;
  slots: Slot[];
  elements: Element[];
  created_at?: string;
}

interface AdminTabProps {
  onLoadTemplateToStudioAI?: (template: any) => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({ onLoadTemplateToStudioAI }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Cloudinary credentials (Initialized from environment variables or localStorage fallback)
  const [cloudName, setCloudName] = useState('');
  const [uploadPreset, setUploadPreset] = useState('');

  // File input ref for Cloudinary
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
    
    // Load Cloudinary config
    const savedCloudName = localStorage.getItem('lumibooth_cloudinary_cloud_name') || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    const savedUploadPreset = localStorage.getItem('lumibooth_cloudinary_upload_preset') || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
    setCloudName(savedCloudName);
    setUploadPreset(savedUploadPreset);
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getFrames();
      setTemplates(data);
    } catch (e) {
      console.error('Failed to load templates:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    const newTemplate: Template = {
      id: '',
      name: 'Mẫu Thiết Kế Mới ' + (templates.length + 1),
      width: 1200,
      height: 1800,
      background_image_url: '',
      background_prompt: 'color', // Default to plain color background
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
    } else {
      setEditingTemplate(newTemplate);
    }
  };

  const handleEdit = (tmpl: Template) => {
    setEditingTemplate(JSON.parse(JSON.stringify(tmpl))); // Deep copy
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn mẫu thiết kế này khỏi Supabase? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      await apiService.deleteFrame(id);
      setTemplates(templates.filter(t => t.id !== id));
      alert('Đã xóa mẫu thiết kế thành công!');
    } catch (e) {
      alert('Lỗi khi xóa mẫu: ' + e);
    }
  };

  // Cloudinary Direct Upload
  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTemplate) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.secure_url) {
        setEditingTemplate({
          ...editingTemplate,
          background_image_url: data.secure_url,
          background_prompt: 'image' // set type to image
        });
      } else {
        throw new Error(data.error?.message || 'Không có secure_url được trả về');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Lỗi kết nối API Cloudinary. Hãy kiểm tra lại Cloud Name và Preset của bạn.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    if (!editingTemplate.name.trim()) {
      alert('Vui lòng nhập tên mẫu thiết kế');
      return;
    }

    setIsSaving(true);
    try {
      if (!editingTemplate.id) {
        // Create new
        const payload = {
          name: editingTemplate.name,
          width: editingTemplate.width,
          height: editingTemplate.height,
          backgroundPrompt: editingTemplate.background_prompt,
          backgroundImageUrl: editingTemplate.background_image_url,
          slots: editingTemplate.slots,
          elements: editingTemplate.elements
        };
        await apiService.createFrame(payload);
      } else {
        // Update existing
        const payload = {
          id: editingTemplate.id,
          name: editingTemplate.name,
          width: editingTemplate.width,
          height: editingTemplate.height,
          backgroundPrompt: editingTemplate.background_prompt,
          backgroundImageUrl: editingTemplate.background_image_url,
          slots: editingTemplate.slots,
          elements: editingTemplate.elements
        };
        await apiService.updateFrame(payload);
      }

      await fetchTemplates();
      setEditingTemplate(null);
      alert('Đã lưu cấu hình mẫu thành công!');
    } catch (e) {
      alert('Lỗi khi lưu cấu hình mẫu: ' + e);
    } finally {
      setIsSaving(false);
    }
  };

  // Slots helper
  const handleUpdateSlot = (idx: number, field: keyof Slot, val: any) => {
    if (!editingTemplate) return;
    const newSlots = [...editingTemplate.slots];
    newSlots[idx] = { ...newSlots[idx], [field]: val };
    setEditingTemplate({ ...editingTemplate, slots: newSlots });
  };

  const handleAddSlot = () => {
    if (!editingTemplate) return;
    const newSlot: Slot = {
      id: 'slot_' + (editingTemplate.slots.length + 1) + '_' + Date.now().toString().slice(-4),
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      rotation: 0,
      order: editingTemplate.slots.length + 1
    };
    setEditingTemplate({
      ...editingTemplate,
      slots: [...editingTemplate.slots, newSlot]
    });
  };

  const handleRemoveSlot = (idx: number) => {
    if (!editingTemplate) return;
    const newSlots = editingTemplate.slots.filter((_, i) => i !== idx);
    setEditingTemplate({ ...editingTemplate, slots: newSlots });
  };

  // Elements helper
  const handleUpdateElement = (idx: number, field: keyof Element, val: any) => {
    if (!editingTemplate) return;
    const newElems = [...editingTemplate.elements];
    newElems[idx] = { ...newElems[idx], [field]: val };
    setEditingTemplate({ ...editingTemplate, elements: newElems });
  };

  const handleUpdateElementStyle = (idx: number, field: string, val: any) => {
    if (!editingTemplate) return;
    const newElems = [...editingTemplate.elements];
    const style = newElems[idx].style || {};
    newElems[idx] = { 
      ...newElems[idx], 
      style: { ...style, [field]: val } 
    };
    setEditingTemplate({ ...editingTemplate, elements: newElems });
  };

  const handleAddTextElement = () => {
    if (!editingTemplate) return;
    const newElem: Element = {
      id: 'text_' + Date.now().toString().slice(-4),
      type: 'text',
      content: 'Chữ Của Bạn',
      x: 200,
      y: 1600,
      width: 600,
      height: 60,
      rotation: 0,
      style: {
        color: '#ffffff',
        fontSize: 32,
        fontFamily: 'Outfit',
        fontWeight: 'bold'
      }
    };
    setEditingTemplate({
      ...editingTemplate,
      elements: [...editingTemplate.elements, newElem]
    });
  };

  const handleRemoveElement = (idx: number) => {
    if (!editingTemplate) return;
    const newElems = editingTemplate.elements.filter((_, i) => i !== idx);
    setEditingTemplate({ ...editingTemplate, elements: newElems });
  };

  // Render a visual preview box representing coordinates inside the editor form
  const renderVisualPreview = () => {
    if (!editingTemplate) return null;
    const { width: w, height: h, slots: sls, elements: els } = editingTemplate;
    const maxDim = 320;
    const scale = maxDim / Math.max(w, h);
    const canvasW = w * scale;
    const canvasH = h * scale;

    const bgVal = editingTemplate.background_image_url 
      ? `url(${editingTemplate.background_image_url})` 
      : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';

    return (
      <div 
        className="relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center"
        style={{ width: maxDim, height: maxDim }}
      >
        <div 
          className="relative shadow-inner bg-cover bg-center border border-dashed border-slate-500"
          style={{ 
            width: canvasW, 
            height: canvasH,
            backgroundImage: editingTemplate.background_image_url ? bgVal : undefined,
            backgroundSize: 'cover'
          }}
        >
          {/* Slots */}
          {sls.map((slot, idx) => (
            <div
              key={slot.id}
              className="absolute bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 text-[10px] font-black flex items-center justify-center rounded-sm"
              style={{
                left: slot.x * scale,
                top: slot.y * scale,
                width: slot.width * scale,
                height: slot.height * scale,
                transform: `rotate(${slot.rotation}deg)`,
                transformOrigin: 'center center'
              }}
            >
              <span>Slot {slot.order || (idx + 1)}</span>
            </div>
          ))}

          {/* Texts & Elements */}
          {els.map((el) => (
            <div
              key={el.id}
              className="absolute border border-indigo-400 bg-indigo-500/10 text-indigo-300 text-[8px] font-bold flex items-center justify-center p-0.5 overflow-hidden"
              style={{
                left: el.x * scale,
                top: el.y * scale,
                width: el.width * scale,
                height: el.height * scale,
                transform: `rotate(${el.rotation}deg)`,
                transformOrigin: 'center center'
              }}
            >
              <span className="truncate">{el.type === 'text' ? el.content : `[${el.type}]`}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden h-full">
      {editingTemplate ? (
        /* ================= 📝 CHẾ ĐỘ THÊM / SỬA MẪU THIẾT KẾ ================= */
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          {/* Form Header */}
          <div className="bg-[#fcfdfe] border-b border-[#dee8ff]/60 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setEditingTemplate(null)}
                className="p-2 hover:bg-[#f0f3ff] rounded-xl text-slate-500 hover:text-[#0058be] transition-colors"
                title="Quay lại"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-base font-black text-[#111c2d]">
                  {editingTemplate.id ? '🔧 CHỈNH SỬA MẪU THIẾT KẾ' : '✨ THÊM MẪU THIẾT KẾ MỚI'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Cấu hình chi tiết các ô ảnh, chữ và màu nền mẫu
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-650 rounded-xl text-xs font-bold transition-all"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:shadow-lg text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Lưu Cấu Hình Mẫu</span>
              </button>
            </div>
          </div>

          {/* Form Body - Split into two sections (config & real-time visual preview) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#fbfdff]">
            {/* Visual Live Preview Zone */}
            <div className="lg:w-[380px] bg-slate-950 border-r border-[#dee8ff]/50 p-6 flex flex-col items-center justify-center shrink-0 gap-4 text-center">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-black uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                Realtime Preview
              </span>
              
              {renderVisualPreview()}

              <div className="max-w-[280px]">
                <h4 className="text-xs font-bold text-slate-200 mt-2">Bản Vẽ Tọa Độ Bản Xem Trước</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                  Kích thước: {editingTemplate.width} x {editingTemplate.height}px | Tỷ lệ ô ảnh được render trực tiếp đúng chuẩn pixel của DSLRbooth.
                </p>
              </div>
            </div>

            {/* Editing Details Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Part 1: General Info */}
              <div className="bg-white border border-[#dee8ff]/60 p-5 rounded-2xl shadow-xs space-y-4">
                <h4 className="text-xs font-black text-[#0058be] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  <span>1. Thông Tin Cơ Bản & Kích Thước</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Tên Mẫu Thiết Kế</label>
                    <input 
                      type="text" 
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0058be] transition-colors"
                      placeholder="VD: Rustic Gold Elegant"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Chiều Rộng (Width px)</label>
                    <input 
                      type="number" 
                      value={editingTemplate.width}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, width: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0058be]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Chiều Cao (Height px)</label>
                    <input 
                      type="number" 
                      value={editingTemplate.height}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, height: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0058be]"
                    />
                  </div>
                </div>
              </div>

              {/* Part 2: Cloudinary Dynamic Upload */}
              <div className="bg-white border border-[#dee8ff]/60 p-5 rounded-2xl shadow-xs space-y-4">
                <h4 className="text-xs font-black text-[#0058be] uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  <span>2. Quản Lý Ảnh Nền (Cloudinary Auto-Upload)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cloudinary credentials inputs */}
                  <div className="space-y-3 bg-[#f8faff] p-4 rounded-xl border border-[#dee8ff]/30">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Cấu Hình Cloudinary API</span>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Cloud Name</label>
                      <input 
                        type="text" 
                        value={cloudName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCloudName(val);
                          localStorage.setItem('lumibooth_cloudinary_cloud_name', val);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Upload Preset Name (Unsigned)</label>
                      <input 
                        type="text" 
                        value={uploadPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUploadPreset(val);
                          localStorage.setItem('lumibooth_cloudinary_upload_preset', val);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Upload action area */}
                  <div className="flex flex-col justify-center border-2 border-dashed border-[#dee8ff] rounded-xl p-4 text-center items-center bg-[#fafbff]">
                    {editingTemplate.background_image_url ? (
                      <div className="relative group overflow-hidden rounded-lg w-full h-[120px] flex items-center justify-center border border-slate-200">
                        <img 
                          src={editingTemplate.background_image_url} 
                          alt="Background" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 bg-white rounded-lg text-[#0058be] hover:bg-[#f0f3ff]"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTemplate({ ...editingTemplate, background_image_url: null })}
                            className="p-2 bg-white rounded-lg text-rose-500 hover:bg-rose-50"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-blue-50 text-[#0058be] rounded-full border border-blue-200/50">
                          <ImageIcon className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-[11px] font-extrabold text-slate-600">Nhấp Để Tải Ảnh Lên Cloudinary</p>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Tải trực tiếp ảnh JPG/PNG lên tài khoản 1-Click</p>
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#0058be] hover:bg-[#004395] text-white text-[10px] font-black rounded-lg transition-all active:scale-95 shadow-xs"
                        >
                          {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          Tải Lên File Ảnh
                        </button>
                      </div>
                    )}

                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleCloudinaryUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    {uploadError && (
                      <span className="text-[9px] text-rose-500 font-bold mt-2 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                        ⚠️ {uploadError}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Part 3: Coordinates Slots Manager */}
              <div className="bg-white border border-[#dee8ff]/60 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#0058be] uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4" />
                    <span>3. Quản Lý Tọa Độ Ô Ảnh (Slots: {editingTemplate.slots.length})</span>
                  </h4>
                  <button
                    onClick={handleAddSlot}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-250/20 text-emerald-700 text-[10px] font-black rounded-xl transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Ô Ảnh</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingTemplate.slots.map((slot, idx) => (
                    <div 
                      key={slot.id} 
                      className="grid grid-cols-2 md:grid-cols-7 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50 relative group/slot items-end"
                    >
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Thứ tự</label>
                        <input 
                          type="number" 
                          value={slot.order}
                          onChange={(e) => handleUpdateSlot(idx, 'order', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-black text-slate-700"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">X (px)</label>
                        <input 
                          type="number" 
                          value={slot.x}
                          onChange={(e) => handleUpdateSlot(idx, 'x', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-750"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Y (px)</label>
                        <input 
                          type="number" 
                          value={slot.y}
                          onChange={(e) => handleUpdateSlot(idx, 'y', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-750"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Rộng (px)</label>
                        <input 
                          type="number" 
                          value={slot.width}
                          onChange={(e) => handleUpdateSlot(idx, 'width', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-750"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Cao (px)</label>
                        <input 
                          type="number" 
                          value={slot.height}
                          onChange={(e) => handleUpdateSlot(idx, 'height', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-750"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Góc Xoay</label>
                        <input 
                          type="number" 
                          value={slot.rotation}
                          onChange={(e) => handleUpdateSlot(idx, 'rotation', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-750"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                        <button
                          onClick={() => handleRemoveSlot(idx)}
                          className="p-2 border border-rose-250 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-lg transition-colors flex items-center justify-center"
                          title="Xóa ô ảnh"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {editingTemplate.slots.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Trống Trơn! Hãy thêm ít nhất 1 ô ảnh</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Part 4: Dynamic Stickers & Texts Decor */}
              <div className="bg-white border border-[#dee8ff]/60 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#0058be] uppercase tracking-wider flex items-center gap-1.5">
                    <Type className="w-4 h-4" />
                    <span>4. Quản Lý Chữ / Sticker Trang Trí ({editingTemplate.elements.length})</span>
                  </h4>
                  <button
                    onClick={handleAddTextElement}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-250/20 text-indigo-700 text-[10px] font-black rounded-xl transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Chữ</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingTemplate.elements.map((el, idx) => (
                    <div 
                      key={el.id} 
                      className="grid grid-cols-2 md:grid-cols-8 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50 items-end"
                    >
                      <div className="col-span-2 md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nội dung chữ</label>
                        <input 
                          type="text" 
                          value={el.content}
                          onChange={(e) => handleUpdateElement(idx, 'content', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">X (px)</label>
                        <input 
                          type="number" 
                          value={el.x}
                          onChange={(e) => handleUpdateElement(idx, 'x', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-750"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Y (px)</label>
                        <input 
                          type="number" 
                          value={el.y}
                          onChange={(e) => handleUpdateElement(idx, 'y', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-750"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Cỡ Chữ (px)</label>
                        <input 
                          type="number" 
                          value={el.style?.fontSize || 24}
                          onChange={(e) => handleUpdateElementStyle(idx, 'fontSize', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Màu Chữ</label>
                        <input 
                          type="color" 
                          value={el.style?.color || '#ffffff'}
                          onChange={(e) => handleUpdateElementStyle(idx, 'color', e.target.value)}
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg p-1"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Góc Xoay</label>
                        <input 
                          type="number" 
                          value={el.rotation}
                          onChange={(e) => handleUpdateElement(idx, 'rotation', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700"
                        />
                      </div>
                      <div className="flex justify-end col-span-2 md:col-span-1">
                        <button
                          onClick={() => handleRemoveElement(idx)}
                          className="p-2 border border-rose-250 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-lg transition-colors flex items-center justify-center"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {editingTemplate.elements.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chưa có chữ trang trí nào</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= 📋 CHẾ ĐỘ DANH SÁCH MẪU THIẾT KẾ (DASHBOARD) ================= */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Section Toolbar */}
          <div className="bg-[#fcfdfe] border-b border-[#dee8ff]/60 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center shrink-0 gap-3">
            <div>
              <h3 className="text-base font-black text-[#111c2d] flex items-center gap-2">
                ⚙️ HỆ THỐNG QUẢN TRỊ MẪU DSLRBOOTH
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Xem danh sách mẫu hiện tại, thêm mẫu mới, hoặc sửa trực tiếp trong DB Supabase
              </p>
            </div>
            
            <button
              onClick={handleCreateNew}
              className="px-5 py-2.5 bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:shadow-lg text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Mẫu Thiết Kế Mới</span>
            </button>
          </div>

          {/* List Grid View */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#fbfdff]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 font-bold">
                <Loader2 className="w-8 h-8 text-[#0058be] animate-spin" />
                <span className="text-xs">Đang nạp các mẫu thiết kế từ Supabase...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-[#dee8ff] rounded-2xl p-6">
                <p className="text-sm font-bold text-slate-600">Trống trơn! Không tìm thấy mẫu nào</p>
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
                  const isDefault = tmpl.id.startsWith('template_'); // Hardcoded default templates
                  const bgUrl = tmpl.background_image_url;

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
                            <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-emerald-100 animate-pulse">
                              ● Live (Supabase DB)
                            </span>
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
                                <Grid className="w-5 h-5 text-slate-400" />
                              </div>
                              <span>{tmpl.name}</span>
                            </div>
                          )}
                        </div>

                        <h4 className="font-extrabold text-sm text-[#111c2d] truncate mb-2">{tmpl.name}</h4>
                        
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
                          <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5 text-slate-400" /> {tmpl.slots.length} ô ảnh</span>
                          <span className="flex items-center gap-1"><Type className="w-3.5 h-3.5 text-slate-400" /> {tmpl.elements.length} Chữ</span>
                        </div>
                      </div>

                      {/* Card Action footer */}
                      <div className="flex items-center justify-end gap-2 mt-auto">
                        {isDefault ? (
                          <button
                            onClick={() => alert('Mẫu mặc định không được phép chỉnh sửa hoặc xóa để bảo vệ tính nhất quán của hệ thống. Bạn có thể tự do tạo mẫu mới!')}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 border border-slate-200/50"
                          >
                            <Lock className="w-3.5 h-3.5" /> Xem Chi Tiết
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleDelete(tmpl.id)}
                              className="px-3.5 py-2 hover:bg-rose-50 border border-rose-250 text-rose-600 rounded-xl text-xs font-bold transition-all"
                              title="Xóa mẫu"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              onClick={() => handleEdit(tmpl)}
                              className="px-3.5 py-2 bg-[#f0f3ff] hover:bg-[#0058be] text-[#0058be] hover:text-white rounded-xl text-xs font-bold transition-all border border-[#dee8ff]"
                              title="Sửa Nhanh Thông Số"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            
                            {onLoadTemplateToStudioAI && (
                              <button
                                onClick={() => onLoadTemplateToStudioAI(tmpl)}
                                className="flex-1 py-2 bg-gradient-to-r from-[#02b36e] to-[#009b5c] hover:from-[#009b5c] hover:to-[#00824b] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all border border-[#009b5c]/10 hover:shadow-md hover:shadow-emerald-600/10"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Thiết Kế Trực Quan (Studio AI)
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
      )}
    </div>
  );
};
export default AdminTab;
