import React, { useState, useEffect } from 'react';
import { X, Check, Brain, Eye, EyeOff, Save } from 'lucide-react';
import { apiService } from '../services/api';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const [modelName, setModelName] = useState<string>('imagen-3.0-generate-002');
  const [apiKey, setApiKey] = useState<string>('');
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>(', ultra-modern 2026 premium wedding backdrop, minimal sleek elegant aesthetic, soft pastel gradient mesh, smooth liquid blurred colors, subtle cinematic analog film grain texture, high-end fine art editorial photography, contemporary clean design, thin classy minimalist gold borders on the very edges, completely clean uncluttered spacious center area, high resolution, award-winning contemporary event styling, natural soft diffused lighting, organic high-fashion atmosphere, no retro elements, no clip-art, no cheap plastic flowers, no text, no watermarks, no camera icons, no grid lines.');
  const [aspectRatio, setAspectRatio] = useState<string>('1.5');
  
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Load current settings from database on mount
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const data = await apiService.getAISettings();
      if (data) {
        setModelName(data.model_name || 'imagen-3.0-generate-002');
        setApiKey(data.gemini_api_key || '');
        setPrefix(data.prompt_prefix || '');
        setSuffix(data.prompt_suffix || '');
        setAspectRatio(data.aspect_ratio || '1.5');
      }
    } catch (e) {
      console.warn('Backend is offline. Using default local simulation settings.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);
    
    const payload = {
      model_name: modelName,
      gemini_api_key: apiKey,
      prompt_prefix: prefix,
      prompt_suffix: suffix,
      aspect_ratio: aspectRatio
    };

    try {
      await apiService.saveAISettings(payload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (e) {
      alert('Không thể lưu cấu hình. Đang chạy ở chế độ offline.');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="w-full max-w-md bg-white border border-[#dee8ff] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col animate-scale-up">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-[#dee8ff]">
          <div className="flex items-center gap-2 text-[#0058be]">
            <Brain className="w-5 h-5 text-[#0058be]" />
            <h3 className="text-sm font-black text-[#111c2d] uppercase tracking-wider">Cấu Hình Dynamic AI Engine</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
          
          {/* Gemini API Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Google Gemini API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Dán Gemini API Key tại đây..."
                className="bg-white border border-[#dee8ff] rounded-xl pl-3 pr-10 py-2.5 text-xs w-full focus:outline-none focus:border-[#0058be]/50 text-[#111c2d] font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[9px] text-slate-450 font-semibold leading-normal">
              API key sẽ được lưu động vào database. Nếu để trống, hệ thống sẽ sử dụng key mặc định từ file .env.
            </p>
          </div>

          {/* Model Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Chọn Model Sinh Ảnh</label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="bg-white border border-[#dee8ff] rounded-xl px-3 py-2.5 text-xs focus:outline-none text-[#111c2d] font-semibold"
            >
              <option value="imagen-3.0-generate-002">Imagen 3.0 (Mặc định - Đẹp nhất)</option>
              <option value="imagen-2.0">Imagen 2.0 (Tiêu chuẩn)</option>
              <option value="custom-model">Model tùy chỉnh...</option>
            </select>
          </div>

          {/* If Custom Model */}
          {modelName === 'custom-model' && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tên Model Tự Nhập</label>
              <input
                type="text"
                placeholder="Ví dụ: gemini-1.5-flash"
                value={modelName === 'custom-model' ? '' : modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="bg-white border border-[#dee8ff] rounded-xl px-3 py-2 text-xs w-full focus:outline-none focus:border-[#0058be]/50 text-[#111c2d] font-semibold"
              />
            </div>
          )}

          {/* Aspect Ratio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tỷ Lệ Bức Ảnh (Aspect Ratio)</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="bg-white border border-[#dee8ff] rounded-xl px-3 py-2.5 text-xs focus:outline-none text-[#111c2d] font-semibold"
            >
              <option value="1.5">Ngang (3:2 / Aspect 1.5) - Landscape</option>
              <option value="1.0">Vuông (1:1 / Aspect 1.0) - Square</option>
              <option value="0.75">Dọc (3:4 / Aspect 0.75) - Portrait</option>
            </select>
          </div>

          {/* Prompt Suffix and Prefix */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Prompt Tiền Tố (Prefix)</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Ví dụ: Aesthetic..."
                className="bg-white border border-[#dee8ff] rounded-xl px-3 py-2 text-xs w-full focus:outline-none focus:border-[#0058be]/50 text-[#111c2d] font-semibold"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Prompt Hậu Tố (Suffix)</label>
              <input
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                placeholder="Ví dụ: , 4k, hyper detailed"
                className="bg-white border border-[#dee8ff] rounded-xl px-3 py-2 text-xs w-full focus:outline-none focus:border-[#0058be]/50 text-[#111c2d] font-semibold"
              />
            </div>
          </div>
          <p className="text-[9px] text-slate-450 font-semibold leading-normal">
            Hệ thống sẽ tự động ghép: **[Tiền tố] + [Prompt của bạn] + [Hậu tố]** để gửi lên Gemini Imagen nhằm tối ưu hóa chất lượng ảnh đầu ra của photobooth.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#dee8ff] bg-[#f0f3ff]/40 flex justify-end gap-3.5">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-[#111c2d] font-bold px-3 transition-colors"
          >
            Đóng
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#0058be] hover:bg-[#004395] text-white shadow-md shadow-[#0058be]/10 transition-all disabled:opacity-50 active:scale-95"
          >
            {success ? <Check className="w-4 h-4 animate-bounce" /> : <Save className="w-4 h-4" />}
            {success ? 'Đã Lưu Thành Công!' : isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>

      </div>
    </div>
  );
};
export default AISettingsModal;
