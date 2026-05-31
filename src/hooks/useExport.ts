import { useState } from 'react';
import { FrameSlot, FrameElement } from '../types/canvas';
import { generateClientBase64, generateDslrboothZip, simulateLocalBackground, punchSlotHoles, renderAllElements } from '../utils/canvasRenderer';
import { createCompositeCanvas, detectSlots, DetectType } from '../utils/slotDetection';
import { apiService } from '../services/api';

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
  prompt: string;
  setBgImageUrl: (url: string | null) => void;
  setSlots: (slots: FrameSlot[]) => void;
  setActiveSidebarTab: (tab: 'canvas' | 'stickers' | 'layers') => void;
}

export function useExport(options: UseExportOptions) {
  const {
    width, height, slots, elements, frameName,
    backgroundType, backgroundColor, bgGradient, bgImageUrl, prompt,
    setBgImageUrl, setSlots, setActiveSidebarTab
  } = options;

  const [isGeneratingBg, setIsGeneratingBg] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [zipExportSuccess, setZipExportSuccess] = useState<boolean>(false);
  const [isDetectingSlots, setIsDetectingSlots] = useState<boolean>(false);

  const bgOptions = { backgroundType, backgroundColor, bgGradient, bgImageUrl };

  // Generate AI background
  const handleGenerateBg = async () => {
    if (!prompt.trim()) return;
    setIsGeneratingBg(true);
    setExportResult(null);

    try {
      const data = await apiService.generateBackground(prompt, width, height);
      setBgImageUrl(data.image);
    } catch (e) {
      console.warn('Backend offline or failed. Starting offline browser simulation...');
      setBgImageUrl(simulateLocalBackground(width, height));
    } finally {
      setIsGeneratingBg(false);
    }
  };

  // Export PNG
  const handleExportPNG = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const finalImageBase64 = await generateClientBase64(width, height, slots, elements, bgOptions);
      setExportResult({
        success: true,
        frame_id: `client_${Date.now().toString().slice(-6)}`,
        image_url: finalImageBase64,
        name: frameName || 'lumibooth_frame'
      });
    } catch (e) {
      alert('Không thể xuất ảnh: ' + e);
    } finally {
      setIsExporting(false);
    }
  };

  // Client-side mock export (preview)
  const simulateClientExport = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const doRender = async () => {
      // Background
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

      punchSlotHoles(ctx, slots, true);
      ctx.globalCompositeOperation = 'source-over';
      await renderAllElements(ctx, elements);

      setExportResult({
        success: true,
        frame_id: `mock_${Date.now()}`,
        image_url: canvas.toDataURL('image/png'),
        name: frameName
      });
    };

    doRender();
  };

  // Export DSLRbooth ZIP
  const handleExportDslrboothZip = async () => {
    setIsExportingZip(true);
    setZipExportSuccess(false);

    try {
      const blob = await generateDslrboothZip(width, height, slots, elements, frameName, bgOptions);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dslrbooth_${frameName.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setZipExportSuccess(true);
      setTimeout(() => setZipExportSuccess(false), 2500);
    } catch (e) {
      alert('Không thể đóng gói ZIP: ' + e);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Auto detect slots
  const handleAutoDetectSlots = async (detectType: DetectType) => {
    const imageElements = elements.filter(el => el.type === 'image' && el.visible !== false && el.content);
    if (imageElements.length === 0 && !bgImageUrl) {
      alert('Vui lòng tải ảnh nền/overlay có các ô ảnh lên trước!');
      return;
    }

    setIsDetectingSlots(true);
    try {
      const compositeCanvas = await createCompositeCanvas(imageElements, bgImageUrl, width, height);
      const newSlots = await detectSlots(compositeCanvas, imageElements, detectType, width, height);

      if (newSlots.length === 0) {
        alert('Không nhận diện được ô ảnh nào! Vui lòng kiểm tra lại kiểu nhận diện hoặc chất lượng ảnh.');
        return;
      }

      setSlots(newSlots);
      setActiveSidebarTab('layers');
      alert(`Đã tự động nhận diện thành công ${newSlots.length} ô ảnh!`);
    } catch (e: any) {
      alert('Lỗi khi quét nhận diện ô ảnh: ' + (e?.message || e));
    } finally {
      setIsDetectingSlots(false);
    }
  };

  return {
    // State
    isGeneratingBg,
    isExporting,
    exportResult, setExportResult,
    isExportingZip,
    zipExportSuccess,
    isDetectingSlots,

    // Handlers
    handleGenerateBg,
    handleExportPNG,
    simulateClientExport,
    handleExportDslrboothZip,
    handleAutoDetectSlots,
  };
}
