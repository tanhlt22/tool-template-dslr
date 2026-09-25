import { useEffect, useState } from 'react';
import { FrameElement, FrameSlot } from '../types/canvas';
import { apiService } from '../services/api';
import { useUI } from '../contexts/UIContext';
import { uploadToStorage } from '../utils/storage';

interface UseTemplateDBOptions {
  setFrameName: (name: string) => void;
  setWidth: (w: number) => void;
  setHeight: (h: number) => void;
  setPrompt: (p: string) => void;
  setSlots: (slots: FrameSlot[]) => void;
  setElements: (elements: FrameElement[]) => void;
  setBgImageUrl: (url: string | null) => void;
  setBackgroundType: (type: 'color' | 'gradient' | 'ai') => void;
  setSelectedId: (id: string | null) => void;
  setSelectedType: (type: 'slot' | 'text' | 'icon' | 'image' | 'qr' | null) => void;
  setExportResult: (result: any) => void;
}

export function useTemplateDB(
  options: UseTemplateDBOptions,
  currentState: {
    frameName: string;
    width: number;
    height: number;
    prompt: string;
    bgImageUrl: string | null;
    slots: FrameSlot[];
    elements: FrameElement[];
  }
) {
  const {
    setFrameName,
    setWidth,
    setHeight,
    setPrompt,
    setSlots,
    setElements,
    setBgImageUrl,
    setBackgroundType,
    setSelectedId,
    setSelectedType,
    setExportResult
  } = options;

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>('wedding');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const { showToast } = useUI();
  const [savedFrames, setSavedFrames] = useState<any[]>([]);
  const [isLoadingFrames, setIsLoadingFrames] = useState(true);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    const role = localStorage.getItem('lumibooth_role') || 'user';
    setUserRole(role);
  }, []);

  useEffect(() => {
    fetchSavedFrames();
  }, []);

  const fetchSavedFrames = async () => {
    setIsLoadingFrames(true);
    try {
      const data = await apiService.getFrames();
      setSavedFrames(data);
    } catch {
      console.warn('API call offline or failed. Mock DB fallback mode active.');
    } finally {
      setIsLoadingFrames(false);
    }
  };

  const handleUpdateTemplateInDb = async (templateName?: string, category: string = 'wedding') => {
    if (!editingTemplateId) {
      return handleSaveNewTemplateToDb(templateName, category);
    }

    setIsSavingTemplate(true);
    showToast('Đang tải ảnh và lưu mẫu lên hệ thống...', 'info');
    try {
      // 1. Upload background if it's base64
      let finalBgUrl = currentState.bgImageUrl;
      if (finalBgUrl && finalBgUrl.startsWith('data:image/')) {
        finalBgUrl = await uploadToStorage(finalBgUrl);
        setBgImageUrl(finalBgUrl); // Update local state so it doesn't re-upload later
      }

      // 2. Upload all image elements if they are base64
      const finalElements = await Promise.all(
        currentState.elements.map(async (el) => {
          if ((el.type === 'image' || el.type === 'icon') && el.content && el.content.startsWith('data:image/')) {
            if (finalBgUrl && el.content === currentState.bgImageUrl) {
              return { ...el, content: finalBgUrl };
            }
            const uploadedUrl = await uploadToStorage(el.content);
            return { ...el, content: uploadedUrl };
          }
          return el;
        })
      );
      // Update local elements with new URLs
      setElements(finalElements);

      await apiService.updateFrame({
        id: editingTemplateId,
        name: templateName || currentState.frameName,
        category: category || editingCategory || 'general',
        width: currentState.width,
        height: currentState.height,
        backgroundPrompt: currentState.prompt,
        backgroundImageUrl: finalBgUrl,
        slots: currentState.slots,
        elements: finalElements
      });
      setEditingCategory(category);
      showToast('Đã lưu cập nhật mẫu thành công.', 'success');
      fetchSavedFrames();
      return true;
    } catch (e: any) {
      showToast('Lỗi cập nhật mẫu: ' + (e?.message || String(e)), 'error');
      return false;
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveNewTemplateToDb = async (templateName?: string, category: string = 'wedding') => {
    const finalName = (templateName || currentState.frameName || 'Mẫu mới').trim() || 'Mẫu mới';

    setIsSavingTemplate(true);
    showToast('Đang tải ảnh và lưu mẫu lên hệ thống...', 'info');
    try {
      // 1. Upload background if it's base64
      let finalBgUrl = currentState.bgImageUrl;
      if (finalBgUrl && finalBgUrl.startsWith('data:image/')) {
        finalBgUrl = await uploadToStorage(finalBgUrl);
        setBgImageUrl(finalBgUrl);
      }

      // 2. Upload all image elements if they are base64
      const finalElements = await Promise.all(
        currentState.elements.map(async (el) => {
          if ((el.type === 'image' || el.type === 'icon') && el.content && el.content.startsWith('data:image/')) {
            if (finalBgUrl && el.content === currentState.bgImageUrl) {
              return { ...el, content: finalBgUrl };
            }
            const uploadedUrl = await uploadToStorage(el.content);
            return { ...el, content: uploadedUrl };
          }
          return el;
        })
      );
      setElements(finalElements);

      const result = await apiService.createFrame({
        name: finalName,
        category: category || 'general',
        width: currentState.width,
        height: currentState.height,
        backgroundPrompt: currentState.prompt,
        backgroundImageUrl: finalBgUrl,
        slots: currentState.slots,
        elements: finalElements
      });
      if (result?.frame_id) {
        setEditingTemplateId(result.frame_id);
      }
      setEditingCategory(category);
      showToast(`Đã lưu mẫu "${finalName}" thành công.`, 'success');
      fetchSavedFrames();
      return true;
    } catch (e: any) {
      showToast('Lỗi lưu mẫu mới: ' + (e?.message || String(e)), 'error');
      return false;
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleLoadSavedFrame = (frame: any) => {
    setFrameName(frame.name);
    setWidth(frame.width);
    setHeight(frame.height);
    setPrompt(frame.background_prompt || '');
    setSlots(frame.slots || []);
    if (frame.category) {
      setEditingCategory(frame.category);
    }

    const loadedElements = [...(frame.elements || [])];
    const hasBgFrame = loadedElements.some((e: any) => e.id === 'background_frame' || (e.id && e.id.startsWith('background_frame_')));
    if (frame.background_image_url && !hasBgFrame) {
      loadedElements.unshift({
        id: 'background_frame',
        type: 'image',
        content: frame.background_image_url,
        x: 0,
        y: 0,
        width: frame.width,
        height: frame.height,
        rotation: 0,
        visible: true,
        locked: false,
        fileName: 'background_frame.png',
        style: {
          order: -1
        }
      });
    }

    setElements(loadedElements);
    setBgImageUrl(frame.background_image_url || null);
    setBackgroundType(frame.background_image_url || frame.background_prompt ? 'ai' : 'color');

    if (frame.slots && frame.slots.length > 0) {
      setSelectedId(frame.slots[0].id);
      setSelectedType('slot');
    } else if (frame.elements && frame.elements.length > 0) {
      setSelectedId(frame.elements[0].id);
      setSelectedType(frame.elements[0].type);
    } else {
      setSelectedId(null);
      setSelectedType(null);
    }

    setExportResult(null);
  };

  return {
    editingTemplateId,
    setEditingTemplateId,
    editingCategory,
    setEditingCategory,
    isSavingTemplate,
    savedFrames,
    isLoadingFrames,
    userRole,
    handleUpdateTemplateInDb,
    handleSaveNewTemplateToDb,
    handleLoadSavedFrame,
    fetchSavedFrames
  };
}
