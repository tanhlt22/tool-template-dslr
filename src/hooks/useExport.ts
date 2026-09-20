import { useState } from 'react';
import { FrameSlot, FrameElement } from '../types/canvas';
import { generateClientBase64, generateDslrboothZip, simulateLocalBackground, punchSlotHoles, renderAllElements } from '../utils/canvasRenderer';
import { createCompositeCanvas, detectSlots, DetectType } from '../utils/slotDetection';
import { useUI } from '../contexts/UIContext';
import { applyPersonalizationToElements, PersonalizationData } from '../utils/personalization';
import { apiService } from '../services/api';
import { idSystemApi } from '../services/idSystemApi';

type SidebarTab = 'workflow' | 'canvas' | 'stickers' | 'layers';

interface UseExportOptions {
  width: number;
  height: number;
  slots: FrameSlot[];
  elements: FrameElement[];
  frameName: string;
  backgroundType: 'color' | 'gradient' | 'ai';
  backgroundColor: string;
  bgGradient: string;
  bgImageUrl: string | null;
  resolution: number;
  prompt: string;
  setBgImageUrl: (url: string | null) => void;
  setBackgroundType: (type: 'color' | 'gradient' | 'ai') => void;
  setSlots: (slots: FrameSlot[]) => void;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  personalization?: PersonalizationData;
  getCanvasSnapshot?: () => string | null;
}

interface ExportResult {
  success: boolean;
  frame_id: string;
  image_url: string;
  name: string;
}

export function useExport(options: UseExportOptions) {
  const {
    width, height, slots, elements, frameName,
    backgroundType, backgroundColor, bgGradient, bgImageUrl, resolution, prompt,
    setBgImageUrl, setBackgroundType, setSlots, setActiveSidebarTab, personalization, getCanvasSnapshot
  } = options;

  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipExportSuccess, setZipExportSuccess] = useState(false);
  const { showToast } = useUI();
  const [isDetectingSlots, setIsDetectingSlots] = useState(false);

  const bgOptions = { backgroundType, backgroundColor, bgGradient, bgImageUrl };
  const getExportElements = () => (
    personalization ? applyPersonalizationToElements(elements, personalization) : elements
  );

  const handleGenerateBg = async () => {
    if (!prompt.trim()) {
      showToast('Vui lòng nhập prompt để sinh ảnh AI.', 'error');
      return;
    }
    setIsGeneratingBg(true);
    setExportResult(null);

    try {
      const data = await apiService.generateBackground(prompt, width, height);
      setBgImageUrl(data.image);
      setBackgroundType('ai');
      window.dispatchEvent(new Event('id-system-balance-refresh'));
      showToast('Đã sinh ảnh AI và lưu lên Cloudinary.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (idSystemApi.settings.isConfigured()) {
        showToast(message, 'info');
      } else {
        console.warn('Background API failed. Using local generated fallback.');
        setBgImageUrl(simulateLocalBackground(width, height));
      }
    } finally {
      setIsGeneratingBg(false);
    }
  };

  const handleExportPNG = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const finalImageBase64 = getCanvasSnapshot?.() || await generateClientBase64(width, height, slots, getExportElements(), bgOptions);
      setExportResult({
        success: true,
        frame_id: `client_${Date.now().toString().slice(-6)}`,
        image_url: finalImageBase64,
        name: frameName || 'haivustudio_frame'
      });
    } catch (e) {
      showToast('Không thể xuất ảnh PNG: ' + String(e), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const simulateClientExport = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const doRender = async () => {
      if (backgroundType === 'ai' && bgImageUrl) {
        const img = new Image();
        img.src = bgImageUrl;
        await new Promise(resolve => {
          img.onload = () => { ctx.drawImage(img, 0, 0, width, height); resolve(null); };
          img.onerror = () => { ctx.fillStyle = backgroundColor || '#0f172a'; ctx.fillRect(0, 0, width, height); resolve(null); };
        });
      } else if (backgroundType === 'gradient' && bgGradient) {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = backgroundColor || '#0f172a';
        ctx.fillRect(0, 0, width, height);
      }

      // Punch holes in background
      punchSlotHoles(ctx, slots, false);

      // Draw elements on top
      ctx.globalCompositeOperation = 'source-over';
      await renderAllElements(ctx, getExportElements());

      setExportResult({
        success: true,
        frame_id: `mock_${Date.now()}`,
        image_url: canvas.toDataURL('image/png'),
        name: frameName
      });
    };

    void doRender();
  };

  const handleExportDslrboothZip = async () => {
    setIsExportingZip(true);
    setZipExportSuccess(false);

    try {
      const blob = await generateDslrboothZip(width, height, slots, getExportElements(), frameName, bgOptions, resolution);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dslrbooth_${frameName.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setZipExportSuccess(true);
      setTimeout(() => setZipExportSuccess(false), 2500);
    } catch (e) {
      showToast('Không thể đóng gói DSLRbooth ZIP: ' + String(e), 'error');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleAutoDetectSlots = async (detectType: DetectType) => {
    const imageElements = elements.filter(el => el.type === 'image' && el.visible !== false && el.content);
    if (imageElements.length === 0 && !bgImageUrl) {
      showToast('Vui lòng tải lên ảnh khung (Frame) trước khi quét.', 'error');
      return;
    }

    setIsDetectingSlots(true);
    try {
      const compositeCanvas = await createCompositeCanvas(imageElements, bgImageUrl, width, height);
      const newSlots = await detectSlots(compositeCanvas, imageElements, detectType, width, height);

      if (newSlots.length === 0) {
        showToast('Không tìm thấy ô ảnh nào. Thử chế độ quét khác hoặc tải ảnh khác lên.', 'info');
        return;
      }

      setSlots(newSlots);
      setActiveSidebarTab('layers');
      showToast(`Đã quét thành công và tạo ${newSlots.length} ô ảnh.`, 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showToast('Lỗi khi quét khung: ' + message, 'error');
    } finally {
      setIsDetectingSlots(false);
    }
  };

  return {
    isGeneratingBg,
    isExporting,
    exportResult,
    setExportResult,
    isExportingZip,
    zipExportSuccess,
    isDetectingSlots,
    handleGenerateBg,
    handleExportPNG,
    simulateClientExport,
    handleExportDslrboothZip,
    handleAutoDetectSlots,
  };
}
