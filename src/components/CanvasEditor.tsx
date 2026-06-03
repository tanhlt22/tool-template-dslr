import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Sparkles, X } from 'lucide-react';
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
    fabric.Object.prototype.cornerColor = '#10b981'; // Emerald-500 hệt photobooth-react
    fabric.Object.prototype.cornerStrokeColor = '#ffffff';
    fabric.Object.prototype.borderColor = '#10b981'; // Emerald-500
    fabric.Object.prototype.cornerSize = 10;
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.borderScaleFactor = 2;

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
      if (!snapToGrid || !options.target) return;
      const grid = 20;
      const target = options.target;
      target.set({
        left: Math.round((target.left || 0) / grid) * grid,
        top: Math.round((target.top || 0) / grid) * grid
      });
    });

    canvas.on('object:scaling', (options) => {
      if (!snapToGrid || !options.target) return;
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
    });

    // Listen to changes
    const syncCanvasStateToReact = () => {
      if (isUpdatingFromProps.current) return;

      const allObjects = canvas.getObjects();
      const updatedSlots: FrameSlot[] = [];
      const updatedElements: FrameElement[] = [];

      allObjects.forEach((obj) => {
        if (!obj.data) return;
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
          const textObj = obj as fabric.Text;
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
              fontSize: textObj.fontSize || 24,
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

    canvas.on('object:modified', syncCanvasStateToReact);
    canvas.on('object:removed', syncCanvasStateToReact);

    // Responsive Canvas container scale wrapper
    const resizeCanvasContainer = () => {
      if (!containerRef.current || !fabricCanvas.current) return;
      const el = containerRef.current;
      const canvasEl = el.querySelector('.canvas-container') as HTMLElement;
      if (!canvasEl) return;

      const isMobile = el.clientWidth < 768;
      const padding = isMobile ? 24 : 40;
      const availableW = el.clientWidth - padding;
      const availableH = el.clientHeight - padding;

      const scaleX = availableW / width;
      const scaleY = availableH / height;

      let scale;
      if (isMobile) {
        // On mobile, scale to fit the width so it's readable, and allow vertical scrolling
        scale = Math.min(scaleX, 1.0);
      } else {
        // On desktop, scale to fit both dimensions
        scale = Math.min(scaleX, scaleY, 1.0);
      }

      canvasEl.style.transform = `scale(${scale})`;
      canvasEl.style.transformOrigin = 'top left';

      // Update canvas scaler size to allow perfect scroll footprint
      const scalerEl = el.querySelector('.canvas-scaler') as HTMLElement;
      if (scalerEl) {
        scalerEl.style.width = `${width * scale}px`;
        scalerEl.style.height = `${height * scale}px`;
      }
    };

    // Resize listener
    window.addEventListener('resize', resizeCanvasContainer);
    setTimeout(resizeCanvasContainer, 100);

    return () => {
      console.log('[CanvasEditor] Disposing Fabric.js canvas');
      window.removeEventListener('resize', resizeCanvasContainer);
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

    // Gather existing canvas objects (excluding grid lines)
    const objects = canvas.getObjects().filter(o => !o.data?.isGridLine);

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

    // Add or update active objects
    // --- Slots ---
    slots.forEach((slot) => {
      const existing = objects.find(o => o.data?.id === slot.id);
      const isVisible = slot.visible !== false;
      const isLocked = slot.locked === true;

      if (existing) {
        existing.set({
          left: slot.x,
          top: slot.y,
          width: slot.width / (existing.scaleX || 1),
          height: slot.height / (existing.scaleY || 1),
          angle: slot.rotation,
          visible: isVisible
        });
        applyLockStatus(existing, isLocked);
      } else {
        const rect = new fabric.Rect({
          left: slot.x,
          top: slot.y,
          width: slot.width,
          height: slot.height,
          angle: slot.rotation,
          fill: 'rgba(16, 185, 129, 0.15)', // Light emerald green tint hệt photobooth-react
          stroke: '#10b981', // Emerald border
          strokeWidth: 2,
          strokeDashArray: [6, 4],
          rx: 8,
          ry: 8,
          visible: isVisible,
          data: { id: slot.id, type: 'slot', order: slot.order }
        });

        applyLockStatus(rect, isLocked);
        canvas.add(rect);
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

        if (elem.type === 'text') {
          const textObj = existing as fabric.Text;
          textObj.set({
            text: elem.content,
            fill: elem.style?.color || '#ffffff',
            fontSize: elem.style?.fontSize || 24,
            fontFamily: elem.style?.fontFamily || 'Outfit'
          });
        }
      } else {
        if (elem.type === 'text') {
          const text = new fabric.Text(elem.content, {
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
          canvas.add(text);
        } else if (elem.type === 'icon') {
          fabric.Image.fromURL(elem.content, (img) => {
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
            canvas.add(img);
            canvas.renderAll();
          }, { crossOrigin: 'anonymous' });
        } else if (elem.type === 'image') {
          fabric.Image.fromURL(elem.content, (img) => {
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
            canvas.add(img);
            canvas.renderAll();
          }, { crossOrigin: 'anonymous' });
        } else if (elem.type === 'qr') {
          // Dynamic QR Code link visual generator
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(elem.content)}&size=150x150`;
          fabric.Image.fromURL(qrUrl, (img) => {
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
            canvas.add(img);
            canvas.renderAll();
          }, { crossOrigin: 'anonymous' });
        }
      }
    });

    // 4. Update selection border visualization
    if (selectedId) {
      const activeObject = canvas.getObjects().find(o => o.data?.id === selectedId);
      if (activeObject && canvas.getActiveObject() !== activeObject) {
        canvas.setActiveObject(activeObject);
      }
    } else {
      canvas.discardActiveObject();
    }

    canvas.renderAll();
    isUpdatingFromProps.current = false;
  }, [slots, elements, selectedId]);

  const hasImages = !!backgroundImageUrl || elements.some(el => el.type === 'image' && el.visible !== false && el.content);

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full flex items-center justify-center overflow-y-auto bg-[#f0f3ff] relative p-4 py-8 custom-scrollbar"
    >
      {/* Visual background grid pattern for Precision Engineering look */}
      <div className="absolute inset-0 bg-[radial-gradient(#cfdaf2_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

      <div className="canvas-scaler relative shrink-0">
        <div className="canvas-container shadow-xl shadow-slate-200/50 absolute top-0 left-0">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Floating suggestion panel or button for slot detection */}
      {hasImages && (
        dismissed ? (
          <button
            onClick={() => setDismissed(false)}
            className="absolute top-4 right-4 z-10 bg-white/95 hover:bg-white backdrop-blur-md border border-[#dee8ff] hover:border-[#0058be]/30 text-[#0058be] font-extrabold text-[11px] px-3.5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all font-sans"
            title="Tự động nhận diện các ô chứa ảnh từ thiết kế"
          >
            <Sparkles className="w-4 h-4 text-[#0058be]" />
            Tự động phát hiện ô ảnh
          </button>
        ) : (
          <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md border border-[#dee8ff] rounded-2xl p-4 shadow-xl max-w-sm flex flex-col gap-3 animate-fade-in font-sans">
            <div className="flex items-center justify-between gap-6">
              <h4 className="text-xs font-black text-[#0058be] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#0058be]" />
                Tự động phát hiện ô ảnh
              </h4>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Bỏ qua"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-bold leading-normal">
              Phát hiện và tạo tự động các ô chứa ảnh (slots) từ khung thiết kế hoặc hình ảnh bạn vừa thêm?
            </p>
            <div className="flex items-center gap-2">
              <select
                value={detectType}
                onChange={(e) => setDetectType(e.target.value as any)}
                className="flex-1 px-2.5 py-2 bg-white border border-[#dee8ff] rounded-xl text-[11px] font-bold text-[#111c2d] focus:outline-none"
              >
                <option value="transparency">Ô Trong Suốt (PNG)</option>
                <option value="solid-green">Ô Phông Xanh (Green Screen)</option>
                <option value="solid-white">Ô Màu Trắng (White Card)</option>
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
                className="px-3.5 py-2 rounded-xl bg-[#0058be] hover:bg-[#004b9e] disabled:opacity-50 text-white font-extrabold text-[11px] active:scale-95 transition-all shadow-xs flex items-center gap-1.5 shrink-0"
              >
                {isDetectingSlots ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    Nhận diện
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
