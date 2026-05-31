import { useState, useMemo } from 'react';
import { FrameSlot, FrameElement } from '../types/canvas';

interface UseCanvasLayersOptions {
  width: number;
  height: number;
}

export function useCanvasLayers({ width, height }: UseCanvasLayersOptions) {
  const [slots, setSlots] = useState<FrameSlot[]>([
    {
      id: 'slot_default_1',
      x: 400,
      y: 500,
      width: 400,
      height: 600,
      rotation: 0,
      order: 1,
      visible: true,
      locked: false
    }
  ]);

  const [elements, setElements] = useState<FrameElement[]>([
    {
      id: 'text_default_1',
      type: 'text',
      content: 'TÊN CÔ DÂU & CHÚ RỂ',
      x: 300,
      y: 1200,
      width: 600,
      height: 60,
      rotation: 0,
      visible: true,
      locked: false,
      style: {
        color: '#ffffff',
        fontSize: 36,
        fontFamily: 'Outfit',
        fontWeight: 'bold',
        order: 0
      }
    }
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'slot' | 'text' | 'icon' | 'image' | 'qr' | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'canvas' | 'stickers' | 'layers'>('canvas');

  // Add items
  const handleAddSlot = () => {
    const newSlot: FrameSlot = {
      id: `slot_${Date.now()}`,
      x: width / 2 - 150,
      y: height / 2 - 100,
      width: 300,
      height: 200,
      rotation: 0,
      order: slots.length,
      visible: true,
      locked: false
    };
    setSlots([...slots, newSlot]);
    setSelectedId(newSlot.id);
    setSelectedType('slot');
    setActiveSidebarTab('layers');
  };

  const handleAddText = () => {
    const newText: FrameElement = {
      id: `text_${Date.now()}`,
      type: 'text',
      content: 'Tap to Edit Text',
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
        order: elements.length
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
      content: 'https://lumibooth.com',
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

        let finalW = natW;
        let finalH = natH;
        if (natW > width || natH > height) {
          const scaleX = width / natW;
          const scaleY = height / natH;
          const scale = Math.min(scaleX, scaleY);
          finalW = Math.round(natW * scale);
          finalH = Math.round(natH * scale);
        }

        const newImage: FrameElement = {
          id: `image_${Date.now()}`,
          type: 'image',
          content: dataUrl,
          x: 0,
          y: 0,
          width: finalW,
          height: finalH,
          rotation: 0,
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

  // Delete, duplicate, z-index reorder, alignment
  const handleDeleteElement = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
    setElements(elements.filter(e => e.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedType(null);
    }
  };

  const handleDuplicateElement = (id: string) => {
    const slot = slots.find(s => s.id === id);
    if (slot) {
      const duplicatedSlot: FrameSlot = {
        ...slot,
        id: `slot_${Date.now()}`,
        x: Math.min(slot.x + 30, width - 100),
        y: Math.min(slot.y + 30, height - 100),
        order: slots.length
      };
      setSlots([...slots, duplicatedSlot]);
      return;
    }
    const elem = elements.find(e => e.id === id);
    if (elem) {
      const duplicatedElem: FrameElement = {
        ...elem,
        id: `${elem.type}_${Date.now()}`,
        x: Math.min(elem.x + 30, width - 100),
        y: Math.min(elem.y + 30, height - 100),
        style: {
          ...elem.style,
          order: elements.length
        }
      };
      setElements([...elements, duplicatedElem]);
    }
  };

  const handleMoveLayerOrder = (id: string, dir: 'up' | 'down') => {
    const isSlot = slots.some(s => s.id === id);
    if (isSlot) {
      const idx = slots.findIndex(s => s.id === id);
      if (dir === 'up' && idx < slots.length - 1) {
        const next = slots[idx + 1];
        const updated = [...slots];
        updated[idx] = { ...next, order: idx };
        updated[idx + 1] = { ...slots[idx], order: idx + 1 };
        setSlots(updated);
      } else if (dir === 'down' && idx > 0) {
        const prev = slots[idx - 1];
        const updated = [...slots];
        updated[idx] = { ...prev, order: idx };
        updated[idx - 1] = { ...slots[idx], order: idx - 1 };
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
          return { ...s, [key]: val };
        }
        return s;
      }));
    } else {
      setElements(elements.map(e => {
        if (e.id === selectedId) {
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

  const handleClearCanvas = () => {
    if (confirm('Xóa sạch mọi layers và slots của canvas hiện tại?')) {
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
    handleAddText,
    handleAddQr,
    handleAddSticker,
    handleAddImage,
    handleDeleteElement,
    handleDuplicateElement,
    handleMoveLayerOrder,
    handleAlignElement,
    handleUpdateSelectedProp,
    handleClearCanvas,
  };
}
