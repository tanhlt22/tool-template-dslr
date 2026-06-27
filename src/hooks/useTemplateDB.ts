import { useEffect, useState } from 'react';
import { FrameElement, FrameSlot } from '../types/canvas';
import { apiService } from '../services/api';
import { useUI } from '../contexts/UIContext';

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
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const { showToast } = useUI();
  const [savedFrames, setSavedFrames] = useState<any[]>([]);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    const role = localStorage.getItem('lumibooth_role') || 'user';
    setUserRole(role);
  }, []);

  useEffect(() => {
    fetchSavedFrames();
  }, []);

  const fetchSavedFrames = async () => {
    try {
      const data = await apiService.getFrames();
      setSavedFrames(data);
    } catch {
      console.warn('API call offline or failed. Mock DB fallback mode active.');
    }
  };

  const handleUpdateTemplateInDb = async (templateName?: string) => {
    if (!editingTemplateId) {
      return handleSaveNewTemplateToDb(templateName);
    }

    setIsSavingTemplate(true);
    try {
      await apiService.updateFrame({
        id: editingTemplateId,
        name: templateName || currentState.frameName,
        width: currentState.width,
        height: currentState.height,
        backgroundPrompt: currentState.prompt,
        backgroundImageUrl: currentState.bgImageUrl,
        slots: currentState.slots,
        elements: currentState.elements
      });
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

  const handleSaveNewTemplateToDb = async (templateName?: string) => {
    const finalName = (templateName || currentState.frameName || 'Mẫu mới').trim() || 'Mẫu mới';

    setIsSavingTemplate(true);
    try {
      const result = await apiService.createFrame({
        name: finalName,
        width: currentState.width,
        height: currentState.height,
        backgroundPrompt: currentState.prompt,
        backgroundImageUrl: currentState.bgImageUrl,
        slots: currentState.slots,
        elements: currentState.elements
      });
      if (result?.frame_id) {
        setEditingTemplateId(result.frame_id);
      }
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
    isSavingTemplate,
    savedFrames,
    userRole,
    handleUpdateTemplateInDb,
    handleSaveNewTemplateToDb,
    handleLoadSavedFrame,
    fetchSavedFrames
  };
}
