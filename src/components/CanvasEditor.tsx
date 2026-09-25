import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Hand, ZoomIn, ZoomOut } from 'lucide-react';
import { FrameSlot, FrameElement } from '../types/canvas';
import { resolveAssetUrl } from '../utils/storage';

const globalFabricImageCache: Record<string, HTMLImageElement> = {};

const loadCachedFabricImage = (url: string, callback: (img: fabric.Image) => void) => {
  const resolvedUrl = resolveAssetUrl(url);
  if (globalFabricImageCache[resolvedUrl]) {
    const img = new fabric.Image(globalFabricImageCache[resolvedUrl]);
    callback(img);
  } else {
    fabric.Image.fromURL(resolvedUrl, (img) => {
      if (!img) return;
      if (img.getElement()) {
        globalFabricImageCache[resolvedUrl] = img.getElement() as HTMLImageElement;
      }
      callback(img);
    }, { crossOrigin: 'anonymous' });
  }
};

const punchSnapshotSlotHoles = (
  ctx: CanvasRenderingContext2D,
  slots: FrameSlot[]
) => {
  ctx.globalCompositeOperation = 'destination-out';
  slots.filter((slot) => slot.visible !== false).forEach((slot) => {
    ctx.save();
    const theta = (slot.rotation || 0) * Math.PI / 180;
    const cx = slot.x + (slot.width / 2) * Math.cos(theta) - (slot.height / 2) * Math.sin(theta);
    const cy = slot.y + (slot.width / 2) * Math.sin(theta) + (slot.height / 2) * Math.cos(theta);
    ctx.translate(cx, cy);
    ctx.rotate(theta);
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.rect(-slot.width / 2, -slot.height / 2, slot.width, slot.height);
    ctx.fill();
    ctx.restore();
  });
  ctx.globalCompositeOperation = 'source-over';
};

interface CanvasEditorProps {
  width: number;
  height: number;
  backgroundImageUrl: string | null;
  slots: FrameSlot[];
  elements: FrameElement[];
  onSlotsChange: (slots: FrameSlot[]) => void;
  onElementsChange: (elements: FrameElement[]) => void;
  selectedId: string | null;
  selectedIds?: string[];
  onSelectElement: (id: string | null, type: 'slot' | 'text' | 'icon' | 'image' | 'qr' | null) => void;
  onSelectElements?: (ids: string[], type: 'slot' | 'text' | 'icon' | 'image' | 'qr' | null) => void;
  showGrid: boolean;
  snapToGrid: boolean;
  backgroundColor: string;
  backgroundType: 'color' | 'gradient' | 'ai';
  bgGradient: string;
  onCanvasSnapshotReady?: (capture: (() => string | null) | null) => void;
  onDuplicateElement?: (ids?: string[] | string) => void;
  onDeleteElement?: (ids?: string[] | string) => void;
  onCopy?: (ids?: string[] | string) => boolean;
  onPaste?: () => boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  width,
  height,
  backgroundImageUrl,
  slots,
  elements,
  onSlotsChange,
  onElementsChange,
  selectedId,
  selectedIds,
  onSelectElement,
  onSelectElements,
  showGrid,
  snapToGrid,
  backgroundColor,
  backgroundType,
  bgGradient,
  onCanvasSnapshotReady,
  onDuplicateElement,
  onDeleteElement,
  onCopy,
  onPaste,
  onUndo,
  onRedo
}) => {
  const effectiveSelectedIds = useMemo(() => {
    if (selectedIds && selectedIds.length > 0) return selectedIds;
    return selectedId ? [selectedId] : [];
  }, [selectedIds, selectedId]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const isUpdatingFromProps = useRef<boolean>(false);
  const zoomRef = useRef(1);
  const slotsRef = useRef(slots);
  const resizeCanvasContainerRef = useRef<(() => void) | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const hitCycleRef = useRef<{ signature: string; index: number; time: number }>({
    signature: '',
    index: -1,
    time: 0
  });
  const [zoom, setZoom] = useState(1);
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  const snapToGridRef = useRef(snapToGrid);
  const onCanvasSnapshotReadyRef = useRef(onCanvasSnapshotReady);

  useEffect(() => {
    widthRef.current = width;
    heightRef.current = height;
  }, [width, height]);

  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  useEffect(() => {
    onCanvasSnapshotReadyRef.current = onCanvasSnapshotReady;
  }, [onCanvasSnapshotReady]);

  // Prevent any browser viewport auto-scrolling on double click/focus
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
      if (document.documentElement.scrollTop !== 0 || document.documentElement.scrollLeft !== 0) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      if (document.body.scrollTop !== 0 || document.body.scrollLeft !== 0) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }
    };
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    zoomRef.current = zoom;
    resizeCanvasContainerRef.current?.();
  }, [zoom]);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  // Canva-style keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+D, Delete/Backspace, Arrow keys, Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an HTML input or textarea
      const activeTagName = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTagName === 'input' || activeTagName === 'textarea') return;

      // Ignore if Fabric is editing text
      const activeFabricObject = fabricCanvas.current?.getActiveObject();
      if (activeFabricObject && (activeFabricObject as any).isEditing) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Copy: Ctrl + C
      if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        if (effectiveSelectedIds.length > 0) {
          e.preventDefault();
          onCopy?.(effectiveSelectedIds);
        }
        return;
      }

      // Paste: Ctrl + V
      if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        onPaste?.();
        return;
      }

      // Duplicate: Ctrl + D
      if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        if (effectiveSelectedIds.length > 0) {
          e.preventDefault();
          onDuplicateElement?.(effectiveSelectedIds);
        }
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (effectiveSelectedIds.length > 0) {
          e.preventDefault();
          onDeleteElement?.(effectiveSelectedIds);
        }
        return;
      }

      // Undo: Ctrl + Z
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Redo: Ctrl + Y or Ctrl + Shift + Z
      if ((isCmdOrCtrl && e.key.toLowerCase() === 'y') || (isCmdOrCtrl && e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Arrow keys: Nudge selected object(s) by 1px (or 10px with Shift)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (effectiveSelectedIds.length === 0 || !activeFabricObject) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        const activeObjects = fabricCanvas.current?.getActiveObjects() || [];
        activeObjects.forEach(obj => {
          obj.set({
            left: (obj.left || 0) + dx,
            top: (obj.top || 0) + dy
          });
          obj.setCoords();
          const target = obj;
          const label = fabricCanvas.current?.getObjects().find(o => o.data?.isSlotLabel && o.data.parentId === target.data?.id);
          if (label) {
            const center = target.getCenterPoint();
            label.set({ left: center.x, top: center.y });
            label.setCoords();
          }
        });
        fabricCanvas.current?.renderAll();

        onSlotsChange(slots.map(s => effectiveSelectedIds.includes(s.id) ? { ...s, x: s.x + dx, y: s.y + dy } : s));
        onElementsChange(elements.map(el => effectiveSelectedIds.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveSelectedIds, onCopy, onPaste, onDuplicateElement, onDeleteElement, onUndo, onRedo, slots, elements, onSlotsChange, onElementsChange]);

  // 1. Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('[CanvasEditor] Initializing Fabric.js canvas');

    // Create fabric canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: '#0f172a',
      preserveObjectStacking: true,
      targetFindTolerance: 8,
    });

    fabricCanvas.current = canvas;

    const captureCurrentCanvas = () => {
      const currentCanvas = fabricCanvas.current;
      if (!currentCanvas) return null;

      const editorOnlyObjects = currentCanvas
        .getObjects()
        .filter((obj) => obj.data?.isGridLine || obj.data?.isSlotLabel || obj.data?.type === 'slot');
      const previousVisibility = editorOnlyObjects.map((obj) => ({
        obj,
        visible: obj.visible
      }));

      try {
        editorOnlyObjects.forEach((obj) => obj.set('visible', false));
        currentCanvas.renderAll();
        const currentWidth = currentCanvas.getWidth() || width;
        const multiplier = Math.max(1, width / currentWidth);
        const sourceCanvas = (
          (currentCanvas as any).toCanvasElement?.(multiplier) ||
          (currentCanvas as any).lowerCanvasEl
        ) as HTMLCanvasElement | undefined;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = width;
        exportCanvas.height = height;
        const exportCtx = exportCanvas.getContext('2d');
        if (!sourceCanvas || !exportCtx) return null;

        exportCtx.imageSmoothingEnabled = true;
        exportCtx.imageSmoothingQuality = 'high';
        exportCtx.drawImage(sourceCanvas, 0, 0, width, height);
        punchSnapshotSlotHoles(exportCtx, slotsRef.current);
        return exportCanvas.toDataURL('image/png');
      } catch {
        return null;
      } finally {
        previousVisibility.forEach(({ obj, visible }) => obj.set('visible', visible));
        currentCanvas.renderAll();
      }
    };

    onCanvasSnapshotReadyRef.current?.(captureCurrentCanvas);

    // Prevent browser auto-scroll-to-focus on Fabric.js hidden accessibility textarea
    const hiddenTextarea = (canvas as any).hiddenTextarea;
    if (hiddenTextarea) {
      hiddenTextarea.style.position = 'fixed';
      hiddenTextarea.style.top = '0px';
      hiddenTextarea.style.left = '0px';
      hiddenTextarea.style.width = '0px';
      hiddenTextarea.style.height = '0px';
      hiddenTextarea.style.opacity = '0';
      hiddenTextarea.style.pointerEvents = 'none';

      const originalFocus = hiddenTextarea.focus;
      hiddenTextarea.focus = function (options?: any) {
        return originalFocus.call(this, { preventScroll: true, ...options });
      };
    }

    // Custom styling for active object borders & handles - snug (sát viền) and clean
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = '#ffffff';
    fabric.Object.prototype.cornerStrokeColor = '#e11d48';
    fabric.Object.prototype.borderColor = '#e11d48';
    fabric.Object.prototype.cornerSize = 12;
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.borderScaleFactor = 2;
    fabric.Object.prototype.padding = 0;
    fabric.Object.prototype.strokeUniform = true;

    // Apply same snug styles to multi-selection groups
    fabric.ActiveSelection.prototype.transparentCorners = false;
    fabric.ActiveSelection.prototype.cornerColor = '#ffffff';
    fabric.ActiveSelection.prototype.cornerStrokeColor = '#e11d48';
    fabric.ActiveSelection.prototype.borderColor = '#e11d48';
    fabric.ActiveSelection.prototype.cornerSize = 12;
    fabric.ActiveSelection.prototype.cornerStyle = 'circle';
    fabric.ActiveSelection.prototype.borderScaleFactor = 2;
    fabric.ActiveSelection.prototype.padding = 0;
    fabric.ActiveSelection.prototype.strokeUniform = true;

    const updateSlotLabelForObject = (target?: fabric.Object) => {
      if (!target || target.data?.type !== 'slot') return;
      const label = canvas.getObjects().find((obj) => obj.data?.isSlotLabel && obj.data.parentId === target.data.id) as fabric.Text | undefined;
      if (!label) return;
      const center = target.getCenterPoint();
      const renderedW = (target.width || 0) * (target.scaleX || 1);
      const renderedH = (target.height || 0) * (target.scaleY || 1);
      label.set({
        left: center.x,
        top: center.y,
        angle: target.angle || 0,
        visible: target.visible !== false,
        fontSize: Math.max(28, Math.min(96, Math.round(Math.min(renderedW, renderedH) * 0.28)))
      });
      label.setCoords();
    };

    if (fabric.Object.prototype.controls && fabric.Object.prototype.controls.mtr) {
      fabric.Object.prototype.controls.mtr.offsetY = -28;
      fabric.Object.prototype.controls.mtr.cursorStyle = 'pointer';
      
      let initialAngle = 0;
      let mouseDownTime = 0;
      fabric.Object.prototype.controls.mtr.mouseDownHandler = function(eventData, transform, x, y) {
        initialAngle = transform.target.angle || 0;
        mouseDownTime = Date.now();
        return true; 
      };
      
      fabric.Object.prototype.controls.mtr.mouseUpHandler = function(eventData, transform, x, y) {
        const target = transform.target;
        const isClick = (Date.now() - mouseDownTime) < 300;
        
        if (isClick) { 
          target.rotate(Math.round(((target.angle || 0) + 90) % 360));
          target.setCoords();
          updateSlotLabelForObject(target);
          target.canvas?.requestRenderAll();
          target.canvas?.fire('object:modified', { target: target });
        }
        return true;
      };

      fabric.Object.prototype.controls.mtr.render = function(ctx, left, top, styleOverride, fabricObject) {
        ctx.save();
        ctx.translate(left, top);
        
        // Background circle
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e11d48';
        ctx.stroke();
        
        // Circular arrow path
        ctx.beginPath();
        ctx.arc(0, 0, 8, -Math.PI / 2, Math.PI); 
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(-8, -5);
        ctx.lineTo(-13, 3);
        ctx.lineTo(-3, 3);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        
        ctx.restore();
      };
    }

    const isSelectableObject = (obj: fabric.Object) => {
      return !!(
        obj.data?.id &&
        obj.data?.type &&
        !obj.data?.isGridLine &&
        !obj.data?.isSlotLabel &&
        obj.visible !== false &&
        obj.selectable !== false
      );
    };

    const getObjectsAtPointer = (pointer: { x: number; y: number }) => {
      const point = new fabric.Point(pointer.x, pointer.y);
      return canvas
        .getObjects()
        .filter(isSelectableObject)
        .filter((obj) => {
          obj.setCoords();
          return obj.containsPoint(point);
        })
        .reverse();
    };

    const getHitSignature = (pointer: { x: number; y: number }, hits: fabric.Object[]) => {
      const roundedX = Math.round(pointer.x / 8);
      const roundedY = Math.round(pointer.y / 8);
      return `${roundedX}:${roundedY}:${hits.map((obj) => obj.data?.id).join('|')}`;
    };

    canvas.on('mouse:down', (options) => {
      if (!options.e || isUpdatingFromProps.current) return;
      const pointer = canvas.getPointer(options.e);
      pointerDownRef.current = { x: pointer.x, y: pointer.y };
    });

    canvas.on('mouse:up', (options) => {
      if (!options.e || isUpdatingFromProps.current) return;
      const downPointer = pointerDownRef.current;
      pointerDownRef.current = null;
      if (!downPointer) return;

      // Don't interfere with Shift+Click multi-selection or rubber-band selection
      if (options.e.shiftKey) return;

      // Don't interfere if an ActiveSelection (multi-select group) is active
      const currentActive = canvas.getActiveObject();
      if (currentActive && currentActive.type === 'activeSelection') return;

      const pointer = canvas.getPointer(options.e);
      const deltaX = pointer.x - downPointer.x;
      const deltaY = pointer.y - downPointer.y;
      const movedDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (movedDistance > 6) return;

      const hits = getObjectsAtPointer(pointer);
      if (hits.length < 2) return;

      const signature = getHitSignature(pointer, hits);
      const activeObject = canvas.getActiveObject();
      const activeIndex = hits.findIndex((obj) => obj.data?.id === activeObject?.data?.id);
      const now = Date.now();
      const shouldCycle = hitCycleRef.current.signature === signature && now - hitCycleRef.current.time < 2200;
      const nextIndex = shouldCycle
        ? (Math.max(hitCycleRef.current.index, activeIndex, 0) + 1) % hits.length
        : Math.max(activeIndex, 0);
      const nextObject = hits[nextIndex];

      hitCycleRef.current = { signature, index: nextIndex, time: now };

      if (nextObject && nextObject.data?.id && nextObject.data?.type && nextObject !== activeObject) {
        onSelectElement(nextObject.data.id, nextObject.data.type);
        canvas.requestRenderAll();
      }
    });

    // Listen to selection events
    const syncFabricSelection = () => {
      if (isUpdatingFromProps.current) return;
      const activeObjs = canvas.getActiveObjects() || [];
      const selectableObjs = activeObjs.filter(o => o.data?.id && !o.data?.isGridLine && !o.data?.isSlotLabel);
      if (selectableObjs.length === 0) {
        onSelectElements?.([], null);
        onSelectElement(null, null);
        return;
      }
      const ids = selectableObjs.map(o => o.data.id);
      const primaryType = selectableObjs[0]?.data?.type || null;
      if (ids.length > 1) {
        // Multi-select: ONLY call onSelectElements to avoid overwriting with single ID
        onSelectElements?.(ids, primaryType);
      } else {
        // Single select: update both
        onSelectElements?.(ids, primaryType);
        onSelectElement(ids[0], primaryType);
      }
    };

    canvas.on('selection:created', syncFabricSelection);
    canvas.on('selection:updated', syncFabricSelection);
    canvas.on('selection:cleared', () => {
      if (isUpdatingFromProps.current) return;
      onSelectElements?.([], null);
      onSelectElement(null, null);
    });

    // Grid snapping on moving
    canvas.on('object:moving', (options) => {
      if (!options.target) return;
      if (snapToGridRef.current) {
        const grid = 20;
        const target = options.target;
        target.set({
          left: Math.round((target.left || 0) / grid) * grid,
          top: Math.round((target.top || 0) / grid) * grid
        });
      }
      updateSlotLabelForObject(options.target);
    });

    canvas.on('object:scaling', (options) => {
      if (!options.target) return;
      if (snapToGrid) {
        const grid = 20;
        const target = options.target;
        const w = (target.width || 0) * (target.scaleX || 1);
        const h = (target.height || 0) * (target.scaleY || 1);
        const newW = Math.round(w / grid) * grid;
        const newH = Math.round(h / grid) * grid;
        target.set({
          scaleX: newW / (target.width || 1),
          scaleY: newH / (target.height || 1)
        });
      }
      updateSlotLabelForObject(options.target);
    });

    canvas.on('object:rotating', (options) => {
      updateSlotLabelForObject(options.target);
    });

    // Listen to changes
    const syncCanvasStateToReact = () => {
      if (isUpdatingFromProps.current) return;

      const allObjects = canvas.getObjects();
      const updatedSlots: FrameSlot[] = [];
      const updatedElements: FrameElement[] = [];

      allObjects.forEach((obj) => {
        if (!obj.data) return;
        if (obj.data.isGridLine || obj.data.isSlotLabel) return;
        const id = obj.data.id;

        const w = (obj.width || 0) * (obj.scaleX || 1);
        const h = (obj.height || 0) * (obj.scaleY || 1);

        // If object is inside an ActiveSelection group, calculate its absolute canvas position
        let x = obj.left || 0;
        let y = obj.top || 0;
        if ((obj as any).group) {
          const center = obj.getCenterPoint();
          x = center.x - w / 2;
          y = center.y - h / 2;
        }

        const rotation = obj.angle || 0;
        const isVisible = obj.visible !== false;
        const isLocked = obj.lockMovementX === true;

        if (obj.data.type === 'slot') {
          updatedSlots.push({
            id,
            x,
            y,
            width: w,
            height: h,
            rotation: rotation,
            order: obj.data.order || 0,
            placeholderColor: obj.data.placeholderColor,
            visible: isVisible,
            locked: isLocked
          });
        } else if (obj.data.type === 'text') {
          const style = obj.data.style || {};
          const textObj = obj as fabric.IText;
          
          // Bake scaling into fontSize so it exports correctly at high resolution
          const scaleY = textObj.scaleY || 1;
          const newFontSize = Math.round((textObj.fontSize || 24) * scaleY);

          updatedElements.push({
            id,
            type: 'text',
            content: textObj.text || '',
            x,
            y,
            width: w,
            height: h,
            rotation: rotation,
            visible: isVisible,
            locked: isLocked,
            style: {
              ...style,
              color: textObj.fill as string || '#ffffff',
              fontSize: newFontSize,
              fontFamily: textObj.fontFamily || 'Outfit'
            }
          });
        } else if (obj.data.type === 'icon' || obj.data.type === 'image' || obj.data.type === 'qr') {
          updatedElements.push({
            id,
            type: obj.data.type,
            content: obj.data.content || '',
            x,
            y,
            width: w,
            height: h,
            rotation: rotation,
            visible: isVisible,
            locked: isLocked,
            lockRatio: obj.lockUniScaling || false,
            aspectRatio: obj.data.aspectRatio,
            fileName: obj.data.fileName,
            style: obj.data.style
          });
        }
      });

      onSlotsChange(updatedSlots);
      onElementsChange(updatedElements);
    };

    canvas.on('object:modified', (options) => {
      updateSlotLabelForObject(options.target);
      syncCanvasStateToReact();
    });
    canvas.on('text:editing:exited', syncCanvasStateToReact);
    canvas.on('object:removed', syncCanvasStateToReact);

    // Responsive Canvas container scale wrapper
    const resizeCanvasContainer = () => {
      if (!containerRef.current || !fabricCanvas.current) return;
      const el = containerRef.current;
      const canvasEl = el.querySelector('.canvas-container') as HTMLElement;
      if (!canvasEl) return;

      const isMobile = el.clientWidth < 768;
      const paddingX = isMobile ? 32 : 64;
      const paddingY = isMobile ? 100 : 120; // Extra padding for bottom controls
      const availableW = el.clientWidth - paddingX;
      const availableH = el.clientHeight - paddingY;

      const currentW = widthRef.current;
      const currentH = heightRef.current;
      const scaleX = availableW / currentW;
      const scaleY = availableH / currentH;

      let baseScale;
      if (isMobile) {
        // On mobile, scale to fit the width so it's readable, and allow vertical scrolling
        baseScale = Math.min(scaleX, 1.0);
      } else {
        // On desktop, scale to fit both dimensions
        baseScale = Math.min(scaleX, scaleY, 1.0);
      }

      const scale = baseScale * zoomRef.current;

      canvasEl.style.transform = `scale(${scale})`;
      canvasEl.style.transformOrigin = 'top left';

      // Update canvas scaler size to allow perfect scroll footprint
      const scalerEl = el.querySelector('.canvas-scaler') as HTMLElement;
      if (scalerEl) {
        scalerEl.style.width = `${currentW * scale}px`;
        scalerEl.style.height = `${currentH * scale}px`;
      }
    };

    resizeCanvasContainerRef.current = resizeCanvasContainer;

    // Resize listener
    window.addEventListener('resize', resizeCanvasContainer);
    setTimeout(resizeCanvasContainer, 100);

    return () => {
      console.log('[CanvasEditor] Disposing Fabric.js canvas');
      onCanvasSnapshotReady?.(null);
      window.removeEventListener('resize', resizeCanvasContainer);
      resizeCanvasContainerRef.current = null;
      canvas.dispose();
      fabricCanvas.current = null;
    };
  }, []); // Initialize canvas once on mount

  // Dynamically update canvas dimensions without disposing the canvas or losing objects
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    canvas.setDimensions({ width, height });
    canvas.clipPath = new fabric.Rect({
      left: 0,
      top: 0,
      width: width,
      height: height,
      absolutePositioned: true
    });
    resizeCanvasContainerRef.current?.();
    canvas.requestRenderAll();
  }, [width, height]);

  // 2. Sync background color / gradient
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    canvas.backgroundImage = undefined;
    if (backgroundType === 'gradient' && bgGradient) {
      // Clean soft light blue-gray fallback for gradient inside editor
      canvas.setBackgroundColor('#dee8ff', canvas.renderAll.bind(canvas));
    } else {
      canvas.setBackgroundColor(backgroundColor || '#ffffff', canvas.renderAll.bind(canvas));
    }
  }, [backgroundType, backgroundColor, bgGradient, width, height]);

  // 3. Render Grid Overlay
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    // Remove existing grid lines
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      if (obj.data && obj.data.isGridLine) {
        canvas.remove(obj);
      }
    });

    if (showGrid) {
      const grid = 40;
      const strokeColor = 'rgba(99, 102, 241, 0.1)';

      // Vertical lines
      for (let i = 0; i < width; i += grid) {
        const line = new fabric.Line([i, 0, i, height], {
          stroke: strokeColor,
          selectable: false,
          evented: false,
          data: { isGridLine: true }
        });
        canvas.add(line);
      }
      // Horizontal lines
      for (let i = 0; i < height; i += grid) {
        const line = new fabric.Line([0, i, width, i], {
          stroke: strokeColor,
          selectable: false,
          evented: false,
          data: { isGridLine: true }
        });
        canvas.add(line);
      }
      canvas.renderAll();
    }
  }, [showGrid, width, height]);

  // 4. Render Canvas elements (slots, elements) from props ONLY if React triggers a state change NOT coming from canvas itself
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    isUpdatingFromProps.current = true;

    // Discard any active selection BEFORE updating objects from props.
    // When objects are in an ActiveSelection group, their left/top are group-relative.
    // Setting absolute positions on group-relative objects causes them to jump.
    canvas.discardActiveObject();

    // Gather existing canvas objects (excluding grid lines and visual-only slot numbers)
    const objects = canvas.getObjects().filter(o => !o.data?.isGridLine && !o.data?.isSlotLabel);

    // Desired IDs from state
    const desiredIds = new Set([
      ...slots.map(s => s.id),
      ...elements.map(e => e.id)
    ]);

    // Remove objects no longer in state
    objects.forEach((obj) => {
      if (obj.data && !desiredIds.has(obj.data.id)) {
        canvas.remove(obj);
      }
    });

    canvas.getObjects().forEach((obj) => {
      if (obj.data?.isSlotLabel && !slots.some((slot) => slot.id === obj.data.parentId)) {
        canvas.remove(obj);
      }
    });

    // Helper to apply lock status
    const applyLockStatus = (obj: fabric.Object, isLocked: boolean) => {
      obj.set({
        lockMovementX: isLocked,
        lockMovementY: isLocked,
        lockRotation: isLocked,
        lockScalingX: isLocked,
        lockScalingY: isLocked,
        hasControls: !isLocked,
        selectable: !isLocked,
        evented: !isLocked
      });
    };

    const applyHitTestStatus = (obj: fabric.Object) => {
      const type = obj.data?.type;
      const isBitmapLike = type === 'image' || type === 'icon' || type === 'qr';
      obj.set({
        perPixelTargetFind: isBitmapLike,
        targetFindTolerance: type === 'slot' ? 10 : 8
      } as any);
    };

    const enforceZIndex = () => {
      // Create ordered list of IDs: slots first, then elements
      const orderedIds = [
        ...slots.map(s => s.id),
        ...elements.map(e => e.id)
      ];

      // Reorder objects on canvas based on desired state array order
      orderedIds.forEach((id, index) => {
        const obj = canvas.getObjects().find(o => o.data?.id === id);
        if (obj) {
          obj.moveTo(index);
        }
      });

      bringSlotLabelsToFront();
    };

    const bringSlotLabelsToFront = () => {
      canvas.getObjects()
        .filter((obj) => obj.data?.isSlotLabel)
        .forEach((label) => canvas.bringToFront(label));
    };

    // Add or update active objects
    // --- Slots ---
    slots.forEach((slot, slotIndex) => {
      const existing = objects.find(o => o.data?.id === slot.id);
      const isVisible = slot.visible !== false;
      const isLocked = slot.locked === true;
      const slotNumber = String(slot.order || slotIndex + 1);

      if (existing) {
        (existing as fabric.Rect).set({
          left: slot.x,
          top: slot.y,
          width: slot.width / (existing.scaleX || 1),
          height: slot.height / (existing.scaleY || 1),
          angle: slot.rotation,
          fill: slot.placeholderColor || 'rgba(226, 232, 240, 0.92)',
          rx: 0,
          ry: 0,
          strokeUniform: true,
          visible: isVisible
        });
        existing.data = { ...existing.data, order: slot.order || slotIndex + 1, placeholderColor: slot.placeholderColor };
        applyLockStatus(existing, isLocked);
        applyHitTestStatus(existing);
      } else {
        const rect = new fabric.Rect({
          left: slot.x,
          top: slot.y,
          width: slot.width,
          height: slot.height,
          angle: slot.rotation,
          fill: slot.placeholderColor || 'rgba(226, 232, 240, 0.92)',
          stroke: '#0ea5e9',
          strokeWidth: 2,
          strokeDashArray: [6, 4],
          rx: 0,
          ry: 0,
          strokeUniform: true,
          visible: isVisible,
          data: { id: slot.id, type: 'slot', order: slot.order, placeholderColor: slot.placeholderColor }
        });

        applyLockStatus(rect, isLocked);
        applyHitTestStatus(rect);
        canvas.add(rect);
      }

      let slotObject = canvas.getObjects().find((obj) => obj.data?.id === slot.id && obj.data?.type === 'slot');
      if (!slotObject && existing) slotObject = existing;
      
      const labelId = `slot_label_${slot.id}`;
      const existingLabel = canvas.getObjects().find((obj) => obj.data?.id === labelId) as fabric.Text | undefined;
      const labelFontSize = Math.max(28, Math.min(96, Math.round(Math.min(slot.width, slot.height) * 0.28)));
      
      let centerX = slot.x + slot.width / 2;
      let centerY = slot.y + slot.height / 2;
      if (slotObject) {
        slotObject.setCoords();
        const center = slotObject.getCenterPoint();
        centerX = center.x;
        centerY = center.y;
      }

      if (existingLabel) {
        existingLabel.set({
          text: slotNumber,
          left: centerX,
          top: centerY,
          angle: slot.rotation,
          visible: isVisible,
          fontSize: labelFontSize
        });
        existingLabel.setCoords();
      } else {
        const label = new fabric.Text(slotNumber, {
          left: centerX,
          top: centerY,
          originX: 'center',
          originY: 'center',
          angle: slot.rotation,
          fontSize: labelFontSize,
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          fill: '#9f1239',
          selectable: false,
          evented: false,
          visible: isVisible,
          data: { id: labelId, parentId: slot.id, isSlotLabel: true }
        });
        canvas.add(label);
      }

      if (slotObject) {
        const label = canvas.getObjects().find((obj) => obj.data?.id === labelId);
        if (label) {
          canvas.bringToFront(label);
        }
      }
    });

    // --- Elements (Text / Icons / Uploaded Images / QR Codes) ---
    elements.forEach((elem) => {
      const existing = objects.find(o => o.data?.id === elem.id);
      const isVisible = elem.visible !== false;
      const isLocked = elem.locked === true;

      if (existing) {
        existing.set({
          left: elem.x,
          top: elem.y,
          angle: elem.rotation,
          visible: isVisible
        });
        applyLockStatus(existing, isLocked);
        existing.data = { ...existing.data, style: elem.style };
        applyHitTestStatus(existing);

        if (elem.type === 'text') {
          const textObj = existing as fabric.IText;
          textObj.set({
            text: elem.content,
            fill: elem.style?.color || '#ffffff',
            fontSize: elem.style?.fontSize || 24,
            fontFamily: elem.style?.fontFamily || 'Outfit',
            scaleX: 1,
            scaleY: 1
          });
        } else if (elem.type === 'image' || elem.type === 'icon') {
          const fabricImg = existing as fabric.Image;
          if (existing.data?.content !== elem.content) {
            // Image source changed
            fabricImg.setSrc(resolveAssetUrl(elem.content), () => {
              fabricImg.set({
                scaleX: elem.width / (fabricImg.width || 1),
                scaleY: elem.height / (fabricImg.height || 1),
              });
              existing.data.content = elem.content;
              existing.canvas?.requestRenderAll();
            }, { crossOrigin: 'anonymous' });
          } else {
            // Just update scale if size changed
            fabricImg.set({
              scaleX: elem.width / (fabricImg.width || 1),
              scaleY: elem.height / (fabricImg.height || 1),
            });
          }
        } else if (elem.type === 'qr') {
          const fabricImg = existing as fabric.Image;
          if (existing.data?.content !== elem.content) {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(elem.content)}&size=150x150`;
            fabricImg.setSrc(qrUrl, () => {
              fabricImg.set({
                scaleX: elem.width / (fabricImg.width || 1),
                scaleY: elem.height / (fabricImg.height || 1),
              });
              existing.data.content = elem.content;
              existing.canvas?.requestRenderAll();
            }, { crossOrigin: 'anonymous' });
          } else {
            fabricImg.set({
              scaleX: elem.width / (fabricImg.width || 1),
              scaleY: elem.height / (fabricImg.height || 1),
            });
          }
        }
      } else {
        if (elem.type === 'text') {
          const text = new fabric.IText(elem.content, {
            left: elem.x,
            top: elem.y,
            fontSize: elem.style?.fontSize || 24,
            fontFamily: elem.style?.fontFamily || 'Outfit',
            fontWeight: elem.style?.fontWeight || 'bold',
            fill: elem.style?.color || '#ffffff',
            angle: elem.rotation,
            visible: isVisible,
            shadow: '2px 2px 4px rgba(0,0,0,0.5)',
            data: { id: elem.id, type: 'text', style: elem.style }
          });
          applyLockStatus(text, isLocked);
          applyHitTestStatus(text);
          canvas.add(text);
        } else if (elem.type === 'icon') {
          loadCachedFabricImage(elem.content, (img) => {
            if (canvas !== fabricCanvas.current) return;
            img.set({
              left: elem.x,
              top: elem.y,
              scaleX: elem.width / (img.width || 1),
              scaleY: elem.height / (img.height || 1),
              angle: elem.rotation,
              visible: isVisible,
              shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.4)', blur: 8 }),
              data: { id: elem.id, type: 'icon', content: elem.content, style: elem.style }
            });
            applyLockStatus(img, isLocked);
            applyHitTestStatus(img);
            canvas.add(img);
            enforceZIndex();
            canvas.renderAll();
          });
        } else if (elem.type === 'image') {
          loadCachedFabricImage(elem.content, (img) => {
            if (canvas !== fabricCanvas.current) return;
            img.set({
              left: elem.x,
              top: elem.y,
              scaleX: elem.width / (img.width || 1),
              scaleY: elem.height / (img.height || 1),
              angle: elem.rotation,
              visible: isVisible,
              shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 6 }),
              data: { id: elem.id, type: 'image', content: elem.content, aspectRatio: elem.aspectRatio, fileName: elem.fileName }
            });
            applyLockStatus(img, isLocked);
            applyHitTestStatus(img);
            canvas.add(img);
            enforceZIndex();
            canvas.renderAll();
          });
        } else if (elem.type === 'qr') {
          // Dynamic QR Code link visual generator
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(elem.content)}&size=150x150`;
          loadCachedFabricImage(qrUrl, (img) => {
            if (canvas !== fabricCanvas.current) return;
            img.set({
              left: elem.x,
              top: elem.y,
              scaleX: elem.width / (img.width || 1),
              scaleY: elem.height / (img.height || 1),
              angle: elem.rotation,
              visible: isVisible,
              shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 6 }),
              data: { id: elem.id, type: 'qr', content: elem.content }
            });
            applyLockStatus(img, isLocked);
            applyHitTestStatus(img);
            canvas.add(img);
            enforceZIndex();
            canvas.renderAll();
          });
        }
      }
    });

    bringSlotLabelsToFront();

    // Enforce initial Z-index for synchronously added elements
    enforceZIndex();
    canvas.renderAll();
    
    isUpdatingFromProps.current = false;

    // Deferred re-render: ensure text renders correctly after Google Fonts finish loading
    const hasText = elements.some(e => e.type === 'text');
    if (hasText) {
      document.fonts.ready.then(() => {
        if (fabricCanvas.current) {
          fabricCanvas.current.getObjects().forEach(obj => {
            if (obj.data?.type === 'text') {
              (obj as fabric.IText).initDimensions();
              obj.setCoords();
            }
          });
          fabricCanvas.current.renderAll();
        }
      });
    }
  }, [slots, elements, width, height]);

  // 5. Sync Fabric selection state from React selectedIds (separate from rendering to avoid position jumps)
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    // Don't re-set selection while we're updating from props in the render useEffect
    if (isUpdatingFromProps.current) return;

    if (effectiveSelectedIds.length > 1) {
      const matchingObjects = canvas.getObjects().filter(o => o.data?.id && effectiveSelectedIds.includes(o.data.id));
      if (matchingObjects.length > 1) {
        const currentActive = canvas.getActiveObjects() || [];
        const currentIds = currentActive.map(o => o.data?.id).filter(Boolean);
        const isSame = currentIds.length === matchingObjects.length && currentIds.every(id => effectiveSelectedIds.includes(id));
        if (!isSame) {
          canvas.discardActiveObject();
          const selection = new fabric.ActiveSelection(matchingObjects, { canvas: canvas });
          canvas.setActiveObject(selection);
          canvas.requestRenderAll();
        }
      }
    } else if (effectiveSelectedIds.length === 1) {
      const activeObject = canvas.getObjects().find(o => o.data?.id === effectiveSelectedIds[0]);
      if (activeObject && canvas.getActiveObject() !== activeObject) {
        canvas.setActiveObject(activeObject);
        canvas.requestRenderAll();
      }
    } else {
      if (canvas.getActiveObject()) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  }, [effectiveSelectedIds]);

  const hasImages = !!backgroundImageUrl || elements.some(el => el.type === 'image' && el.visible !== false && el.content);
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement | null;
        if (target === containerRef.current || (target && target.classList && target.classList.contains('canvas-scaler'))) {
          fabricCanvas.current?.discardActiveObject();
          fabricCanvas.current?.requestRenderAll();
          onSelectElement(null, null);
          onSelectElements?.([], null);
        }
      }}
      className="flex-1 w-full h-full flex items-center justify-center overflow-y-auto bg-slate-900 relative p-4 py-8 custom-scrollbar select-none"
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

      <div className="canvas-scaler relative shrink-0 overflow-hidden shadow-2xl">
        <div className="canvas-container absolute top-0 left-0 overflow-hidden">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-md border border-slate-600/70 bg-slate-950/90 px-3 py-2 text-white shadow-xl backdrop-blur">
        <button
          type="button"
          aria-label="Di chuyển khung vẽ"
          className="rounded p-1 text-slate-200 hover:bg-white/10"
        >
          <Hand className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="h-5 w-px bg-slate-600" />
        <button
          type="button"
          onClick={() => setZoom((value) => Math.max(0.25, Number((value - 0.1).toFixed(2))))}
          aria-label="Thu nhỏ khung vẽ"
          className="rounded p-1 text-slate-200 hover:bg-white/10"
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          aria-label="Phóng to khung vẽ"
          type="range"
          min={25}
          max={200}
          step={5}
          value={zoomPercent}
          onChange={(event) => setZoom(Number(event.target.value) / 100)}
          className="h-1 w-32 accent-white"
        />
        <button
          type="button"
          onClick={() => setZoom((value) => Math.min(2, Number((value + 0.1).toFixed(2))))}
          aria-label="Phóng to khung vẽ"
          className="rounded p-1 text-slate-200 hover:bg-white/10"
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="min-w-10 text-right text-[11px] font-black text-slate-200 hover:text-white"
          title="Đặt thu phóng về 100%"
        >
          {zoomPercent}%
        </button>
      </div>
    </div>
  );
};
export default CanvasEditor;
