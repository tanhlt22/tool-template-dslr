import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Hand, Sparkles, X, ZoomIn, ZoomOut } from 'lucide-react';
import { FrameSlot, FrameElement } from '../types/canvas';

interface CanvasEditorProps {
  width: number;
  height: number;
  backgroundImageUrl: string | null;
  slots: FrameSlot[];
  elements: FrameElement[];
  onSlotsChange: (slots: FrameSlot[]) => void;
  onElementsChange: (elements: FrameElement[]) => void;
  selectedId: string | null;
  onSelectElement: (id: string | null, type: 'slot' | 'text' | 'icon' | 'image' | 'qr' | null) => void;
  showGrid: boolean;
  snapToGrid: boolean;
  backgroundColor: string;
  backgroundType: 'color' | 'gradient' | 'ai';
  bgGradient: string;
  onAutoDetectSlots?: (type: 'transparency' | 'solid-green' | 'solid-white') => void;
  isDetectingSlots?: boolean;
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
  onSelectElement,
  showGrid,
  snapToGrid,
  backgroundColor,
  backgroundType,
  bgGradient,
  onAutoDetectSlots,
  isDetectingSlots = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const isUpdatingFromProps = useRef<boolean>(false);
  const zoomRef = useRef(1);
  const resizeCanvasContainerRef = useRef<(() => void) | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const hitCycleRef = useRef<{ signature: string; index: number; time: number }>({
    signature: '',
    index: -1,
    time: 0
  });
  const [zoom, setZoom] = useState(1);

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

  // States for automatic slot detection popup on canvas
  const [dismissed, setDismissed] = useState(true);
  const [detectType, setDetectType] = useState<'transparency' | 'solid-green' | 'solid-white'>('transparency');

  const prevImageCountRef = useRef(0);
  const prevBgImageUrlRef = useRef<string | null>(null);

  const imageElementsCount = elements.filter(e => e.type === 'image').length;

  useEffect(() => {
    zoomRef.current = zoom;
    resizeCanvasContainerRef.current?.();
  }, [zoom]);

  useEffect(() => {
    // Automatically trigger suggestion when a new image is added/uploaded
    const bgChanged = !!(backgroundImageUrl && backgroundImageUrl !== prevBgImageUrlRef.current);
    const countChanged = imageElementsCount > prevImageCountRef.current;

    if (bgChanged || countChanged) {
      setDismissed(false);
    }

    prevBgImageUrlRef.current = backgroundImageUrl;
    prevImageCountRef.current = imageElementsCount;
  }, [backgroundImageUrl, imageElementsCount]);

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

    // Custom styling for active object borders & handles
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = '#ffffff';
    fabric.Object.prototype.cornerStrokeColor = '#38bdf8';
    fabric.Object.prototype.borderColor = '#38bdf8';
    fabric.Object.prototype.cornerSize = 12;
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.borderScaleFactor = 2.5;

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
      fabric.Object.prototype.controls.mtr.offsetY = -46;
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
        ctx.arc(0, 0, 24, 0, 2 * Math.PI); // Bigger circle, radius 24
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
        
        // Circular arrow path
        ctx.beginPath();
        ctx.arc(0, 0, 11, -Math.PI / 2, Math.PI); 
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(-11, -7);
        ctx.lineTo(-18, 4);
        ctx.lineTo(-4, 4);
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
        canvas.setActiveObject(nextObject);
        onSelectElement(nextObject.data.id, nextObject.data.type);
        canvas.requestRenderAll();
      }
    });

    // Listen to selection events
    canvas.on('selection:created', (e) => {
      if (isUpdatingFromProps.current) return;
      const activeObj = e.selected?.[0];
      if (activeObj && activeObj.data) {
        onSelectElement(activeObj.data.id, activeObj.data.type);
      }
    });

    canvas.on('selection:updated', (e) => {
      if (isUpdatingFromProps.current) return;
      const activeObj = e.selected?.[0];
      if (activeObj && activeObj.data) {
        onSelectElement(activeObj.data.id, activeObj.data.type);
      }
    });

    canvas.on('selection:cleared', () => {
      if (isUpdatingFromProps.current) return;
      onSelectElement(null, null);
    });

    // Grid snapping on moving
    canvas.on('object:moving', (options) => {
      if (!options.target) return;
      if (snapToGrid) {
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

        const x = obj.left || 0;
        const y = obj.top || 0;
        const w = (obj.width || 0) * (obj.scaleX || 1);
        const h = (obj.height || 0) * (obj.scaleY || 1);
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

      const scaleX = availableW / width;
      const scaleY = availableH / height;

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
        scalerEl.style.width = `${width * scale}px`;
        scalerEl.style.height = `${height * scale}px`;
      }
    };

    resizeCanvasContainerRef.current = resizeCanvasContainer;

    // Resize listener
    window.addEventListener('resize', resizeCanvasContainer);
    setTimeout(resizeCanvasContainer, 100);

    return () => {
      console.log('[CanvasEditor] Disposing Fabric.js canvas');
      window.removeEventListener('resize', resizeCanvasContainer);
      resizeCanvasContainerRef.current = null;
      canvas.dispose();
      fabricCanvas.current = null;
    };
  }, [width, height, snapToGrid]);

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
        hasControls: !isLocked
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
        existing.set({
          left: slot.x,
          top: slot.y,
          width: slot.width / (existing.scaleX || 1),
          height: slot.height / (existing.scaleY || 1),
          angle: slot.rotation,
          visible: isVisible
        });
        existing.data = { ...existing.data, order: slot.order || slotIndex + 1 };
        applyLockStatus(existing, isLocked);
        applyHitTestStatus(existing);
      } else {
        const rect = new fabric.Rect({
          left: slot.x,
          top: slot.y,
          width: slot.width,
          height: slot.height,
          angle: slot.rotation,
          fill: 'rgba(226, 232, 240, 0.92)',
          stroke: '#0ea5e9',
          strokeWidth: 2,
          strokeDashArray: [6, 4],
          rx: 8,
          ry: 8,
          visible: isVisible,
          data: { id: slot.id, type: 'slot', order: slot.order }
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
          fabric.Image.fromURL(elem.content, (img) => {
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
          }, { crossOrigin: 'anonymous' });
        } else if (elem.type === 'image') {
          fabric.Image.fromURL(elem.content, (img) => {
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
          }, { crossOrigin: 'anonymous' });
        } else if (elem.type === 'qr') {
          // Dynamic QR Code link visual generator
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(elem.content)}&size=150x150`;
          fabric.Image.fromURL(qrUrl, (img) => {
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
          }, { crossOrigin: 'anonymous' });
        }
      }
    });

    bringSlotLabelsToFront();

    // 4. Update selection border visualization
    if (selectedId) {
      const activeObject = canvas.getObjects().find(o => o.data?.id === selectedId);
      if (activeObject && canvas.getActiveObject() !== activeObject) {
        canvas.setActiveObject(activeObject);
      }
    } else {
      canvas.discardActiveObject();
    }

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
  }, [slots, elements, selectedId]);

  const hasImages = !!backgroundImageUrl || elements.some(el => el.type === 'image' && el.visible !== false && el.content);
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full flex items-center justify-center overflow-y-auto bg-slate-900 relative p-4 py-8 custom-scrollbar"
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

      <div className="canvas-scaler relative shrink-0">
        <div className="canvas-container shadow-xl shadow-slate-200/50 absolute top-0 left-0">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-md border border-slate-600/70 bg-slate-950/90 px-3 py-2 text-white shadow-xl backdrop-blur">
        <button
          type="button"
          aria-label="Pan canvas"
          className="rounded p-1 text-slate-200 hover:bg-white/10"
        >
          <Hand className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="h-5 w-px bg-slate-600" />
        <button
          type="button"
          onClick={() => setZoom((value) => Math.max(0.25, Number((value - 0.1).toFixed(2))))}
          aria-label="Thu nho canvas"
          className="rounded p-1 text-slate-200 hover:bg-white/10"
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          aria-label="Phong to canvas"
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
          aria-label="Phong to canvas"
          className="rounded p-1 text-slate-200 hover:bg-white/10"
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="min-w-10 text-right text-[11px] font-black text-slate-200 hover:text-white"
          title="Dat zoom ve 100%"
        >
          {zoomPercent}%
        </button>
      </div>

      {/* Floating suggestion panel or button for slot detection */}
      {hasImages && (
        dismissed ? (
          <button
            onClick={() => setDismissed(false)}
            className="absolute top-4 right-4 z-10 bg-white hover:bg-slate-50 border border-slate-200 text-rose-800 font-extrabold text-[11px] px-3 py-2 rounded-md shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            title="Tự động quét đục lỗ ô ảnh"
          >
            <Sparkles className="w-4 h-4 text-rose-800" />
            Quét tạo bố cục
          </button>
        ) : (
          <div className="absolute top-4 right-4 z-10 bg-white border border-slate-200 rounded-md p-4 shadow-xl max-w-sm flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center justify-between gap-6">
              <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-800" />
                QUÉT TẠO BỐ CỤC
              </h4>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                title="Bỏ qua"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-bold leading-normal">
              Tự động định vị tọa độ từ ảnh khung PNG (chỗ trong suốt), khối màu xanh hoặc khối màu trắng.
            </p>
            <div className="flex items-center gap-2">
              <select
                value={detectType}
                onChange={(e) => setDetectType(e.target.value as any)}
                className="flex-1 px-2.5 py-2 bg-white border border-slate-300 rounded-md text-[11px] font-bold text-slate-900 focus:outline-none focus:border-rose-700"
              >
                <option value="transparency">Vùng rỗng trong suốt (PNG)</option>
                <option value="solid-green">Khối màu xanh lá cây đậm</option>
                <option value="solid-white">Khối màu trắng tinh</option>
              </select>
              <button
                onClick={async () => {
                  if (onAutoDetectSlots) {
                    await onAutoDetectSlots(detectType);
                    setDismissed(true);
                    setDetectType('transparency');
                  }
                }}
                disabled={isDetectingSlots}
                className="px-3.5 py-2 rounded-md bg-rose-800 hover:bg-rose-900 disabled:opacity-50 text-white font-extrabold text-[11px] active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
              >
                {isDetectingSlots ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xử lý
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    Nhan dien
                  </>
                )}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};
export default CanvasEditor;
