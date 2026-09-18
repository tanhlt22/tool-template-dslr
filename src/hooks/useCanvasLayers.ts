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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'slot' | 'text' | 'icon' | 'image' | 'qr' | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'workflow' | 'canvas' | 'stickers' | 'layers'>('workflow');
  const { showConfirm } = useUI();

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

  const handleAddPresetSlots = (type: 'strip-4' | 'strip-dual-right' | 'grid-4') => {
    let newSlots: FrameSlot[] = [];

    if (type === 'strip-4') {
      const marginY = Math.round(height * 0.05);
      const availableH = height - marginY * 2;
      const spacing = Math.round(height * 0.02);
      const slotH = Math.round((availableH - spacing * 3) / 4);
      const slotW = Math.round(width * 0.82);
      const slotX = Math.round((width - slotW) / 2);

      for (let i = 0; i < 4; i++) {
        newSlots.push({
          id: `slot_preset_${Date.now()}_${i + 1}`,
          x: slotX,
          y: marginY + (slotH + spacing) * i,
          width: slotW,
          height: slotH,
          rotation: 0,
          order: i + 1,
          visible: true,
          locked: false
        });
      }
    } else if (type === 'strip-dual-right') {
      // Photobooth strip dải đôi: cột trái là ảnh mẫu/idol, cột phải là 4 ô ảnh chụp
      const marginY = Math.round(height * 0.04);
      const availableH = height - marginY * 2;
      const spacing = Math.round(height * 0.015);
      const slotH = Math.round((availableH - spacing * 3) / 4);
      const slotW = Math.round(width * 0.44);
      const slotX = Math.round(width * 0.52);

      for (let i = 0; i < 4; i++) {
        newSlots.push({
          id: `slot_preset_${Date.now()}_${i + 1}`,
          x: slotX,
          y: marginY + (slotH + spacing) * i,
          width: slotW,
          height: slotH,
          rotation: 0,
          order: i + 1,
          visible: true,
          locked: false
        });
      }
    } else if (type === 'grid-4') {
      // 2x2 grid
      const marginX = Math.round(width * 0.06);
      const marginY = Math.round(height * 0.06);
      const spacing = Math.round(width * 0.03);
      const slotW = Math.round((width - marginX * 2 - spacing) / 2);
      const slotH = Math.round((height - marginY * 2 - spacing) / 2);

      const positions = [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
        { col: 0, row: 1 },
        { col: 1, row: 1 }
      ];

      newSlots = positions.map((pos, idx) => ({
        id: `slot_preset_${Date.now()}_${idx + 1}`,
        x: marginX + pos.col * (slotW + spacing),
        y: marginY + pos.row * (slotH + spacing),
        width: slotW,
        height: slotH,
        rotation: 0,
        order: idx + 1,
        visible: true,
        locked: false
      }));
    }

    if (newSlots.length > 0) {
      setSlots(newSlots);
      setSelectedId(newSlots[0].id);
      setSelectedType('slot');
      setActiveSidebarTab('layers');
    }
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

  // Delete, duplicate, z-index reorder, alignment
  const handleDeleteElement = (id: string) => {
    const deletedSlot = slots.find(s => s.id === id);
    if (deletedSlot) {
      setSlots(
        slots
          .filter(s => s.id !== id)
          .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
          .map((slot, index) => ({ ...slot, order: index + 1 }))
      );
    } else {
      setSlots(slots.filter(s => s.id !== id));
    }
    setElements(elements.filter(e => e.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedType(null);
    }
  };

  // In-memory clipboard for Canva-style copy/paste
  const clipboardRef = useRef<{ type: 'slot' | 'element'; data: any } | null>(null);

  const handleDuplicateElement = (id: string) => {
    const slot = slots.find(s => s.id === id);
    if (slot) {
      // Smart stack: if there is room below, stack neatly aligned with spacing, else slight diagonal offset
      const spacing = 16;
      const canStackBelow = slot.y + slot.height * 2 + spacing <= height;
      const nextY = canStackBelow ? slot.y + slot.height + spacing : Math.min(slot.y + 25, height - 50);
      const nextX = canStackBelow ? slot.x : Math.min(slot.x + 25, width - 50);

      const duplicatedSlot: FrameSlot = {
        ...slot,
        id: `slot_${Date.now()}`,
        x: nextX,
        y: nextY,
        order: slots.length + 1
      };
      setSlots([...slots, duplicatedSlot]);
      setSelectedId(duplicatedSlot.id);
      setSelectedType('slot');
      setActiveSidebarTab('layers');
      return;
    }
    const elem = elements.find(e => e.id === id);
    if (elem) {
      const duplicatedElem: FrameElement = {
        ...elem,
        id: `${elem.type}_${Date.now()}`,
        x: Math.min(elem.x + 25, width - 50),
        y: Math.min(elem.y + 25, height - 50),
        style: {
          ...elem.style,
          order: elements.length
        }
      };
      setElements([...elements, duplicatedElem]);
      setSelectedId(duplicatedElem.id);
      setSelectedType(elem.type);
      setActiveSidebarTab('layers');
    }
  };

  // Batch duplicate: Creates multiple slots aligned vertically below the selected slot
  const handleBatchDuplicateSlot = (id: string, count: number = 3, customSpacing?: number) => {
    const slot = slots.find(s => s.id === id);
    if (!slot) return;

    const spacing = customSpacing !== undefined ? customSpacing : 16;
    const newSlots: FrameSlot[] = [];

    for (let i = 1; i <= count; i++) {
      const nextY = slot.y + (slot.height + spacing) * i;
      if (nextY + slot.height > height + 20) break; // Canvas boundary check

      newSlots.push({
        ...slot,
        id: `slot_${Date.now()}_${i}`,
        x: slot.x,
        y: nextY,
        order: slots.length + i,
        visible: true,
        locked: false
      });
    }

    if (newSlots.length > 0) {
      const allSlots = [...slots, ...newSlots];
      setSlots(allSlots);
      setSelectedId(newSlots[newSlots.length - 1].id);
      setSelectedType('slot');
      setActiveSidebarTab('layers');
    }
  };

  // Canva-style copy
  const handleCopy = (id?: string) => {
    const targetId = id || selectedId;
    if (!targetId) return false;

    const slot = slots.find(s => s.id === targetId);
    if (slot) {
      clipboardRef.current = { type: 'slot', data: { ...slot } };
      return true;
    }
    const elem = elements.find(e => e.id === targetId);
    if (elem) {
      clipboardRef.current = { type: 'element', data: { ...elem } };
      return true;
    }
    return false;
  };

  // Canva-style paste
  const handlePaste = () => {
    if (!clipboardRef.current) return false;
    const { type, data } = clipboardRef.current;

    if (type === 'slot') {
      const spacing = 16;
      const canStackBelow = data.y + data.height * 2 + spacing <= height;
      const nextY = canStackBelow ? data.y + data.height + spacing : Math.min(data.y + 25, height - 50);
      const nextX = canStackBelow ? data.x : Math.min(data.x + 25, width - 50);

      const newSlot: FrameSlot = {
        ...data,
        id: `slot_${Date.now()}`,
        x: nextX,
        y: nextY,
        order: slots.length + 1
      };
      setSlots((prev) => [...prev, newSlot]);
      setSelectedId(newSlot.id);
      setSelectedType('slot');
      // Update clipboard anchor for sequential pastes
      clipboardRef.current = { type: 'slot', data: newSlot };
      return true;
    }

    if (type === 'element') {
      const nextX = Math.min(data.x + 25, width - 50);
      const nextY = Math.min(data.y + 25, height - 50);

      const newElem: FrameElement = {
        ...data,
        id: `${data.type}_${Date.now()}`,
        x: nextX,
        y: nextY,
        style: {
          ...data.style,
          order: elements.length
        }
      };
      setElements((prev) => [...prev, newElem]);
      setSelectedId(newElem.id);
      setSelectedType(newElem.type);
      clipboardRef.current = { type: 'element', data: newElem };
      return true;
    }

    return false;
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

  const handleAlignElement = (id: string, alignType: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    const isSlot = slots.some(s => s.id === id);
    if (isSlot) {
      setSlots(slots.map(s => {
        if (s.id !== id) return s;
        let newX = s.x;
        let newY = s.y;
        if (alignType === 'left') newX = 0;
        else if (alignType === 'right') newX = width - s.width;
        else if (alignType === 'center-h') newX = (width - s.width) / 2;
        else if (alignType === 'top') newY = 0;
        else if (alignType === 'bottom') newY = height - s.height;
        else if (alignType === 'center-v') newY = (height - s.height) / 2;
        return { ...s, x: newX, y: newY };
      }));
    } else {
      setElements(elements.map(e => {
        if (e.id !== id) return e;
        let newX = e.x;
        let newY = e.y;
        if (alignType === 'left') newX = 0;
        else if (alignType === 'right') newX = width - e.width;
        else if (alignType === 'center-h') newX = (width - e.width) / 2;
        else if (alignType === 'top') newY = 0;
        else if (alignType === 'bottom') newY = height - e.height;
        else if (alignType === 'center-v') newY = (height - e.height) / 2;
        return { ...e, x: newX, y: newY };
      }));
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
    selectedType, setSelectedType,
    activeSidebarTab, setActiveSidebarTab,
    activeElement,

    // Handlers
    handleAddSlot,
    handleAddPresetSlots,
    handleAddText,

    handleAddQr,
    handleAddSticker,
    handleAddImage,
    handleAddBackgroundFrame,
    handleDeleteElement,
    handleDuplicateElement,
    handleBatchDuplicateSlot,
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
