import { useState, useEffect } from 'react';
import { FrameSlot, FrameElement } from '../types/canvas';
import { apiService } from '../services/api';

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
    setFrameName, setWidth, setHeight, setPrompt,
    setSlots, setElements, setBgImageUrl, setBackgroundType,
    setSelectedId, setSelectedType, setExportResult
  } = options;

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [savedFrames, setSavedFrames] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('user');

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
    } catch (e) {
      console.warn('API call offline or failed. Mock DB fallback mode active.');
    }
  };

  const handleUpdateTemplateInDb = async () => {
    if (!editingTemplateId) return;
    setIsSavingTemplate(true);
    try {
      const payload = {
        id: editingTemplateId,
        name: currentState.frameName,
        width: currentState.width,
        height: currentState.height,
        backgroundPrompt: currentState.prompt,
        backgroundImageUrl: currentState.bgImageUrl,
        slots: currentState.slots,
        elements: currentState.elements
      };
      await apiService.updateFrame(payload);
      alert('Đã lưu cập nhật mẫu thiết kế lên hệ thống thành công!');
      setEditingTemplateId(null);
      fetchSavedFrames();
      return true; // signal success to caller
    } catch (e: any) {
      alert('Lỗi cập nhật mẫu: ' + e.message);
      return false;
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveNewTemplateToDb = async () => {
    const inputName = window.prompt('Nhập tên mẫu thiết kế DSLRbooth mới:', currentState.frameName);
    if (inputName === null) return false;
    const finalName = inputName.trim() || 'Mẫu thiết kế mới';

    setIsSavingTemplate(true);
    try {
      const payload = {
        name: finalName,
        width: currentState.width,
        height: currentState.height,
        backgroundPrompt: currentState.prompt,
        backgroundImageUrl: currentState.bgImageUrl,
        slots: currentState.slots,
        elements: currentState.elements
      };
      await apiService.createFrame(payload);
      alert(`Đã lưu mẫu thiết kế mới "${finalName}" thành công!`);
      fetchSavedFrames();
      return true;
    } catch (e: any) {
      alert('Lỗi lưu mẫu mới: ' + e.message);
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
    setElements(frame.elements || []);
    setBgImageUrl(frame.background_image_url || null);
    setBackgroundType(frame.background_prompt ? 'ai' : 'color');

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
    editingTemplateId, setEditingTemplateId,
    isSavingTemplate,
    savedFrames,
    userRole,

    handleUpdateTemplateInDb,
    handleSaveNewTemplateToDb,
    handleLoadSavedFrame,
    fetchSavedFrames,
  };
}
