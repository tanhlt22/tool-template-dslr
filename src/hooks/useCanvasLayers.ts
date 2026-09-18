import { useState, useMemo, useRef, useEffect } from 'react';
import { FrameSlot, FrameElement } from '../types/canvas';
import { useUI } from '../contexts/UIContext';

interface UseCanvasLayersOptions {
  width: number;
  height: number;
}

export function useCanvasLayers({ width, height }: UseCanvasLayersOptions) {
  const [slots, setSlots] = useState<FrameSlot[]>([]);
  const [elements, setElements] = useState<FrameElement[]>([]);

  // --- HISTORY STATE FOR UNDO / REDO ---
  const isHistoryAction = useRef(false);
  const [history, setHistory] = useState<{ slots: FrameSlot[]; elements: FrameElement[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Initialize history on mount or when states are first loaded
  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ slots, elements }]);
      setHistoryIndex(0);
    }
  }, []);

  // Automatic history logger
  useEffect(() => {
    if (isHistoryAction.current) {
      isHistoryAction.current = false;
      return;
    }

    const newState = { slots, elements };
    const timer = setTimeout(() => {
      setHistory(prev => {
        // Compare with current state
        if (historyIndex >= 0 && historyIndex < prev.length) {
          const current = prev[historyIndex];
          if (JSON.stringify(current.slots) === JSON.stringify(newState.slots) &&
            JSON.stringify(current.elements) === JSON.stringify(newState.elements)) {
            return prev;
          }
        }

        const nextHistory = prev.slice(0, historyIndex + 1);
        nextHistory.push(newState);
        if (nextHistory.length > 50) {
          nextHistory.shift();
        }
        setHistoryIndex(nextHistory.length - 1);
        return nextHistory;
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [slots, elements]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryAction.current = true;
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      setSlots(prevState.slots);
      setElements(prevState.elements);
      setHistoryIndex(prevIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryAction.current = true;
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      setSlots(nextState.slots);
      setElements(nextState.elements);
      setHistoryIndex(nextIndex);
    }
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedId = selectedIds[0] || null;
  const setSelectedId = (id: string | null) => {
    setSelectedIds(id ? [id] : []);
  };
  const [selectedType, setSelectedType] = useState<'slot' | 'text' | 'icon' | 'image' | 'qr' | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'workflow' | 'canvas' | 'stickers' | 'layers'>('workflow');
  const { showConfirm, showToast } = useUI();

  const getNextPhotoOrder = () => {
    if (slots.length === 0) return 1;
    return Math.max(...slots.map((slot) => Number(slot.order) || 1)) + 1;
  };

  // Add items
  const handleAddSlot = () => {
    const newSlot: FrameSlot = {
      id: `slot_${Date.now()}`,
      x: width / 2 - 150,
      y: height / 2 - 100,
      width: 300,
      height: 200,
      rotation: 0,
      order: getNextPhotoOrder(),
      visible: true,
      locked: false
    };
    setSlots([...slots, newSlot]);
    setSelectedId(newSlot.id);
    setSelectedType('slot');
    setActiveSidebarTab('layers');
  };


  const handleAddText = (customText?: string, customStyle?: Partial<FrameElement['style']>) => {
    const newText: FrameElement = {
      id: `text_${Date.now()}`,
      type: 'text',
      content: customText || 'Nhập chữ',
      x: width / 2 - 150,
      y: height / 2 - 20,
      width: 300,
      height: 40,
      rotation: 0,
      visible: true,
      locked: false,
      style: {
        color: '#ffffff',
        fontSize: 28,
        fontFamily: 'Outfit',
        fontWeight: 'bold',
        order: elements.length,
        ...customStyle
      }
    };
    setElements([...elements, newText]);
    setSelectedId(newText.id);
    setSelectedType('text');
    setActiveSidebarTab('layers');
  };

  const handleAddQr = () => {
    const newQr: FrameElement = {
      id: `qr_${Date.now()}`,
      type: 'qr',
      content: 'https://haivustudio.com',
      x: width / 2 - 60,
      y: height / 2 - 60,
      width: 120,
      height: 120,
      rotation: 0,
      visible: true,
      locked: false,
      style: {
        order: elements.length
      }
    };
    setElements([...elements, newQr]);
    setSelectedId(newQr.id);
    setSelectedType('qr');
    setActiveSidebarTab('layers');
  };

  const handleAddSticker = (stickerUrl: string) => {
    const newSticker: FrameElement = {
      id: `sticker_${Date.now()}`,
      type: 'icon',
      content: stickerUrl,
      x: width / 2 - 50,
      y: height / 2 - 50,
      width: 100,
      height: 100,
      rotation: 0,
      visible: true,
      locked: false,
      style: {
        order: elements.length
      }
    };
    setElements([...elements, newSticker]);
    setSelectedId(newSticker.id);
    setSelectedType('icon');
    setActiveSidebarTab('layers');
  };

  const handleAddImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;

        const selectedSlot = selectedType === 'slot' ? slots.find(slot => slot.id === selectedId) : null;
        const targetW = selectedSlot ? selectedSlot.width : width * 0.7;
        const targetH = selectedSlot ? selectedSlot.height : height * 0.7;
        const containScale = Math.min(targetW / natW, targetH / natH, selectedSlot ? Number.POSITIVE_INFINITY : 1);
        const finalW = Math.round(natW * containScale);
        const finalH = Math.round(natH * containScale);
        const finalX = selectedSlot ? selectedSlot.x + (selectedSlot.width - finalW) / 2 : (width - finalW) / 2;
        const finalY = selectedSlot ? selectedSlot.y + (selectedSlot.height - finalH) / 2 : (height - finalH) / 2;
        const finalRotation = selectedSlot ? selectedSlot.rotation || 0 : 0;

        const newImage: FrameElement = {
          id: `image_${Date.now()}`,
          type: 'image',
          content: dataUrl,
          x: finalX,
          y: finalY,
          width: finalW,
          height: finalH,
          rotation: finalRotation,
          visible: true,
          locked: false,
          lockRatio: true,
          aspectRatio: natW / natH,
          fileName: file.name,
          style: {
            order: elements.length
          }
        };
        setElements([...elements, newImage]);
        setSelectedId(newImage.id);
        setSelectedType('image');
        setActiveSidebarTab('layers');
      };
    };
    reader.readAsDataURL(file);
  };

  const handleAddBackgroundFrame = (
    file: File,
    onBgImageUrlChange: (url: string | null) => void,
    onBackgroundTypeChange: (type: 'color' | 'gradient' | 'ai') => void
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        const fitScale = Math.min(width / natW, height / natH);
        const finalW = Math.round(natW * fitScale);
        const finalH = Math.round(natH * fitScale);

        const newBgElement: FrameElement = {
          id: `background_frame_${Date.now()}`,
          type: 'image',
          content: dataUrl,
          x: Math.round((width - finalW) / 2),
          y: Math.round((height - finalH) / 2),
          width: finalW,
          height: finalH,
          rotation: 0,
          visible: true,
          locked: false,
          lockRatio: true,
          aspectRatio: natW / natH,
          fileName: file.name,
          style: {
            order: -1
          }
        };

        setElements([...elements, newBgElement]);
        setSelectedId(newBgElement.id);
        setSelectedType('image');
        setActiveSidebarTab('layers');

        // ALSO set it as the root background (so export uses it properly)
        onBgImageUrlChange(dataUrl);
        onBackgroundTypeChange('ai');
      };
    };
    reader.readAsDataURL(file);
  };

  // In-memory clipboard for Canva-style batch copy/paste
  const clipboardRef = useRef<{
    slots: FrameSlot[];
    elements: FrameElement[];
  } | null>(null);

  // Delete element(s)
  const handleDeleteElement = (ids?: string[] | string) => {
    let targetIds: string[] = [];
    if (Array.isArray(ids)) targetIds = ids;
    else if (typeof ids === 'string') targetIds = [ids];
    else targetIds = selectedIds;

    if (targetIds.length === 0) return;

    setSlots(prev =>
      prev
        .filter(s => !targetIds.includes(s.id))
        .map((slot, index) => ({ ...slot, order: index + 1 }))
    );
    setElements(prev => prev.filter(e => !targetIds.includes(e.id)));
    setSelectedIds(prev => prev.filter(id => !targetIds.includes(id)));
    if (targetIds.includes(selectedId || '')) {
      setSelectedType(null);
    }
  };

  // Copy element(s) to clipboard
  const handleCopy = (ids?: string[] | string) => {
    let targetIds: string[] = [];
    if (Array.isArray(ids)) targetIds = ids;
    else if (typeof ids === 'string') targetIds = [ids];
    else targetIds = selectedIds;

    if (targetIds.length === 0) return false;

    const matchedSlots = slots.filter(s => targetIds.includes(s.id));
    const matchedElements = elements.filter(el => targetIds.includes(el.id));

    if (matchedSlots.length === 0 && matchedElements.length === 0) return false;

    clipboardRef.current = {
      slots: matchedSlots.map(s => ({ ...s })),
      elements: matchedElements.map(el => ({ ...el, style: { ...el.style } }))
    };

    const count = matchedSlots.length + matchedElements.length;
    showToast(`Đã sao chép ${count} thành phần`, 'info');
    return true;
  };

  // Paste element(s) from clipboard
  const handlePaste = () => {
    if (!clipboardRef.current) return false;
    const { slots: clipSlots, elements: clipElements } = clipboardRef.current;
    if (clipSlots.length === 0 && clipElements.length === 0) return false;

    const offset = 25;
    const newSlotIds: string[] = [];
    const newElementIds: string[] = [];

    const newSlots: FrameSlot[] = clipSlots.map((s, idx) => {
      const newId = `slot_${Date.now()}_${idx}`;
      newSlotIds.push(newId);
      const nextX = Math.min(width - s.width, Math.max(0, s.x + offset));
      const nextY = Math.min(height - s.height, Math.max(0, s.y + offset));
      return {
        ...s,
        id: newId,
        x: nextX,
        y: nextY,
        order: s.order // preserve original order number
      };
    });

    const newElements: FrameElement[] = clipElements.map((el, idx) => {
      const newId = `${el.type}_${Date.now()}_${idx}`;
      newElementIds.push(newId);
      const nextX = Math.min(width - el.width, Math.max(0, el.x + offset));
      const nextY = Math.min(height - el.height, Math.max(0, el.y + offset));
      return {
        ...el,
        id: newId,
        x: nextX,
        y: nextY,
        style: {
          ...el.style,
          order: elements.length + idx
        }
      };
    });

    if (newSlots.length > 0) {
      setSlots(prev => [...prev, ...newSlots]);
    }
    if (newElements.length > 0) {
      setElements(prev => [...prev, ...newElements]);
    }

    const allNewIds = [...newSlotIds, ...newElementIds];
    setSelectedIds(allNewIds);
    if (newSlots.length > 0) setSelectedType('slot');
    else if (newElements.length > 0) setSelectedType(newElements[0].type);

    // Update clipboard for cascading subsequent pastes
    clipboardRef.current = {
      slots: newSlots,
      elements: newElements
    };

    showToast(`Đã dán ${allNewIds.length} thành phần`, 'success');
    return true;
  };

  // Duplicate element(s): Copies and pastes immediately
  const handleDuplicateElement = (ids?: string[] | string) => {
    let targetIds: string[] = [];
    if (Array.isArray(ids)) targetIds = ids;
    else if (typeof ids === 'string') targetIds = [ids];
    else targetIds = selectedIds;

    if (targetIds.length === 0) return;
    handleCopy(targetIds);
    handlePaste();
  };


  const handleMoveLayerOrder = (id: string, dir: 'up' | 'down') => {
    const isSlot = slots.some(s => s.id === id);
    if (isSlot) {
      const idx = slots.findIndex(s => s.id === id);
      if (dir === 'up' && idx < slots.length - 1) {
        const next = slots[idx + 1];
        const updated = [...slots];
        updated[idx] = next;
        updated[idx + 1] = slots[idx];
        setSlots(updated);
      } else if (dir === 'down' && idx > 0) {
        const prev = slots[idx - 1];
        const updated = [...slots];
        updated[idx] = prev;
        updated[idx - 1] = slots[idx];
        setSlots(updated);
      }
    } else {
      const idx = elements.findIndex(e => e.id === id);
      if (dir === 'up' && idx < elements.length - 1) {
        const next = elements[idx + 1];
        const updated = [...elements];
        updated[idx] = { ...next, style: { ...next.style, order: idx } };
        updated[idx + 1] = { ...elements[idx], style: { ...elements[idx].style, order: idx + 1 } };
        setElements(updated);
      } else if (dir === 'down' && idx > 0) {
        const prev = elements[idx - 1];
        const updated = [...elements];
        updated[idx] = { ...prev, style: { ...prev.style, order: idx } };
        updated[idx - 1] = { ...elements[idx], style: { ...elements[idx].style, order: idx - 1 } };
        setElements(updated);
      }
    }
  };

  const handleAlignElement = (idOrIds: string | string[], alignType: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];

    const alignSlot = (s: FrameSlot): FrameSlot => {
      let newX = s.x;
      let newY = s.y;
      if (alignType === 'left') newX = 0;
      else if (alignType === 'right') newX = width - s.width;
      else if (alignType === 'center-h') newX = (width - s.width) / 2;
      else if (alignType === 'top') newY = 0;
      else if (alignType === 'bottom') newY = height - s.height;
      else if (alignType === 'center-v') newY = (height - s.height) / 2;
      return { ...s, x: newX, y: newY };
    };

    const alignElement = (e: FrameElement): FrameElement => {
      let newX = e.x;
      let newY = e.y;
      if (alignType === 'left') newX = 0;
      else if (alignType === 'right') newX = width - e.width;
      else if (alignType === 'center-h') newX = (width - e.width) / 2;
      else if (alignType === 'top') newY = 0;
      else if (alignType === 'bottom') newY = height - e.height;
      else if (alignType === 'center-v') newY = (height - e.height) / 2;
      return { ...e, x: newX, y: newY };
    };

    const hasSlots = slots.some(s => ids.includes(s.id));
    const hasElements = elements.some(e => ids.includes(e.id));

    if (hasSlots) {
      setSlots(slots.map(s => ids.includes(s.id) ? alignSlot(s) : s));
    }
    if (hasElements) {
      setElements(elements.map(e => ids.includes(e.id) ? alignElement(e) : e));
    }
  };

  const handleUpdateSelectedProp = (key: string, val: any) => {
    if (!selectedId) return;

    if (selectedType === 'slot') {
      setSlots(slots.map(s => {
        if (s.id === selectedId) {
          if (key === 'bounds') {
            return { ...s, ...val };
          }
          return { ...s, [key]: val };
        }
        return s;
      }));
    } else {
      setElements(elements.map(e => {
        if (e.id === selectedId) {
          if (key === 'bounds') {
            return { ...e, ...val };
          }
          if (['content', 'lockRatio', 'rotation', 'x', 'y', 'width', 'height'].includes(key)) {
            return { ...e, [key]: val };
          }
          return {
            ...e,
            style: {
              ...e.style,
              [key]: val
            }
          };
        }
        return e;
      }));
    }
  };

  const handleClearCanvas = async () => {
    const ok = await showConfirm({
      title: 'Đặt lại Canvas',
      message: 'Xóa sạch mọi layer và ô ảnh của canvas hiện tại?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (ok) {
      setSlots([]);
      setElements([]);
      setSelectedId(null);
      setSelectedType(null);
      return true; // signal caller to also clear bgImageUrl
    }
    return false;
  };

  const activeElement = useMemo(() => {
    if (!selectedId) return null;
    return elements.find(e => e.id === selectedId) || slots.find(s => s.id === selectedId) || null;
  }, [selectedId, elements, slots]);

  return {
    // State
    slots, setSlots,
    elements, setElements,
    selectedId, setSelectedId,
    selectedIds, setSelectedIds,
    selectedType, setSelectedType,
    activeSidebarTab, setActiveSidebarTab,
    activeElement,

    // Handlers
    handleAddSlot,
    handleAddText,

    handleAddQr,
    handleAddSticker,
    handleAddImage,
    handleAddBackgroundFrame,
    handleDeleteElement,
    handleDuplicateElement,
    handleCopy,
    handlePaste,
    handleMoveLayerOrder,
    handleAlignElement,
    handleUpdateSelectedProp,
    handleClearCanvas,
    handleUndo,
    handleRedo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };

}
