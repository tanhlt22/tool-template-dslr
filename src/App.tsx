import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { ExportModal } from './components/ExportModal';
import { EditorToolbar } from './components/EditorToolbar';
import { ViewportControls } from './components/ViewportControls';
import { AppNav } from './components/AppNav';
import { CreateFrameModal, NewFrameConfig } from './components/CreateFrameModal';
import { FrameLibrary } from './components/FrameLibrary';
import { FramePreviewStep } from './components/FramePreviewStep';
import { SaveFrameModal } from './components/SaveFrameModal';
import { SelectRegionModal, RegionModalMode } from './components/SelectRegionModal';
import { TransparentSlotPickerModal } from './components/TransparentSlotPickerModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { FrameSlot } from './types/canvas';
import { useCanvasState } from './hooks/useCanvasState';
import { useCanvasLayers } from './hooks/useCanvasLayers';
import { useExport } from './hooks/useExport';
import { useTemplateDB } from './hooks/useTemplateDB';
import { DEFAULT_PERSONALIZATION } from './utils/personalization';
import { PAPER_SIZES } from './constants/templates';
import { apiService } from './services/api';
import { useUI } from './contexts/UIContext';

type AppView = 'library' | 'editor' | 'preview';

const CanvasEditor = lazy(() =>
  import('./components/CanvasEditor').then((module) => ({ default: module.CanvasEditor }))
);

const AISettingsModal = lazy(() =>
  import('./components/AISettingsModal').then((module) => ({ default: module.AISettingsModal }))
);

export function App({ initialView = 'editor' }: { initialView?: AppView }) {
  const [view, setView] = useState<AppView>(initialView);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('photobooth_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [isCreateFrameOpen, setIsCreateFrameOpen] = useState(false);
  const [isSaveFrameOpen, setIsSaveFrameOpen] = useState(false);
  const [isSelectRegionOpen, setIsSelectRegionOpen] = useState(false);
  const [selectRegionInitialMode, setSelectRegionInitialMode] = useState<RegionModalMode>('punch_color');
  const [isTransparentSlotPickerOpen, setIsTransparentSlotPickerOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [isUsingSystemTemplate, setIsUsingSystemTemplate] = useState(false);
  const [pendingExportAfterSave, setPendingExportAfterSave] = useState(false);
  const [personalization, setPersonalization] = useState(DEFAULT_PERSONALIZATION);
  const canvasSnapshotRef = useRef<(() => string | null) | null>(null);

  const handleCanvasSnapshotReady = useCallback((capture: (() => string | null) | null) => {
    canvasSnapshotRef.current = capture;
  }, []);

  const cs = useCanvasState();
  const layers = useCanvasLayers({ width: cs.width, height: cs.height });
  const { showToast, showConfirm, showPrompt } = useUI();

  const handleDimensionChange = useCallback((newW: number, newH: number) => {
    if (!newW || !newH || isNaN(newW) || isNaN(newH)) return;
    const oldW = cs.width;
    const oldH = cs.height;
    if (newW === oldW && newH === oldH) return;

    cs.setWidth(newW);
    cs.setHeight(newH);

    if (oldW > 0 && oldH > 0) {
      const scaleX = newW / oldW;
      const scaleY = newH / oldH;

      layers.setSlots((prev) =>
        prev.map((s) => ({
          ...s,
          x: Math.round(s.x * scaleX),
          y: Math.round(s.y * scaleY),
          width: Math.max(20, Math.round(s.width * scaleX)),
          height: Math.max(20, Math.round(s.height * scaleY))
        }))
      );

      layers.setElements((prev) =>
        prev.map((e) => {
          if (e.id === 'background_frame' || (e.id && e.id.startsWith('background_frame_'))) {
            return {
              ...e,
              x: 0,
              y: 0,
              width: newW,
              height: newH
            };
          }
          return {
            ...e,
            x: Math.round(e.x * scaleX),
            y: Math.round(e.y * scaleY),
            width: Math.max(10, Math.round(e.width * scaleX)),
            height: Math.max(10, Math.round(e.height * scaleY)),
            style: e.style
              ? {
                  ...e.style,
                  fontSize: e.style.fontSize
                    ? Math.max(8, Math.round(e.style.fontSize * Math.min(scaleX, scaleY)))
                    : undefined
                }
              : undefined
          };
        })
      );
    }
  }, [cs.width, cs.height, cs.setWidth, cs.setHeight, layers.setSlots, layers.setElements]);

  const handlePaperSizeChange = useCallback(
    (sizeId: string) => {
      cs.setPaperSize(sizeId);
      const found = PAPER_SIZES.find((p) => p.id === sizeId);
      if (found) {
        let newW = found.width;
        let newH = found.height;
        if (cs.orientation === 'horizontal') {
          newW = found.height;
          newH = found.width;
        }
        handleDimensionChange(newW, newH);
      }
    },
    [cs.orientation, cs.setPaperSize, handleDimensionChange]
  );

  const handleOrientationChange = useCallback(
    (orient: 'vertical' | 'horizontal') => {
      cs.setOrientation(orient);
      if (
        (orient === 'horizontal' && cs.width < cs.height) ||
        (orient === 'vertical' && cs.width > cs.height)
      ) {
        handleDimensionChange(cs.height, cs.width);
      }
    },
    [cs.width, cs.height, cs.setOrientation, handleDimensionChange]
  );

  const exp = useExport({
    width: cs.width,
    height: cs.height,
    slots: layers.slots,
    elements: layers.elements,
    frameName: cs.frameName,
    backgroundType: cs.backgroundType,
    backgroundColor: cs.backgroundColor,
    bgGradient: cs.bgGradient,
    bgImageUrl: cs.bgImageUrl,
    resolution: cs.resolution,
    prompt: cs.prompt,
    personalization,
    getCanvasSnapshot: () => canvasSnapshotRef.current?.() ?? null,
    setBgImageUrl: cs.setBgImageUrl,
    setBackgroundType: cs.setBackgroundType,
    setSlots: layers.setSlots,
    setActiveSidebarTab: layers.setActiveSidebarTab
  });

  const tpl = useTemplateDB(
    {
      setFrameName: cs.setFrameName,
      setWidth: cs.setWidth,
      setHeight: cs.setHeight,
      setPrompt: cs.setPrompt,
      setSlots: layers.setSlots,
      setElements: layers.setElements,
      setBgImageUrl: cs.setBgImageUrl,
      setBackgroundType: cs.setBackgroundType,
      setSelectedId: layers.setSelectedId,
      setSelectedType: layers.setSelectedType,
      setExportResult: exp.setExportResult
    },
    {
      frameName: cs.frameName,
      width: cs.width,
      height: cs.height,
      prompt: cs.prompt,
      bgImageUrl: cs.bgImageUrl,
      slots: layers.slots,
      elements: layers.elements
    }
  );

  const resetFrame = (config: NewFrameConfig) => {
    cs.setFrameName(config.name);
    cs.setPaperSize(config.paperSize);
    cs.setOrientation(config.orientation);
    cs.setWidth(config.width);
    cs.setHeight(config.height);
    cs.setBgImageUrl(null);
    cs.setBackgroundType('color');
    cs.setBackgroundColor('#ffffff');
    cs.setPrompt('');
    layers.setSlots([]);
    layers.setElements([]);
    layers.setSelectedId(null);
    layers.setSelectedType(null);
    layers.setActiveSidebarTab('layers');
    tpl.setEditingTemplateId(null);
    setIsUsingSystemTemplate(false);
    exp.setExportResult(null);
    setView('editor');
  };

  const handleCreateFrame = (config: NewFrameConfig) => {
    resetFrame(config);
    setIsCreateFrameOpen(false);
  };

  const handleNewFrame = async () => {
    if (layers.slots.length > 0 || layers.elements.length > 0) {
      const ok = await showConfirm({
        title: 'Tạo khung mới',
        message: 'Tạo khung mới? Các thay đổi chưa lưu sẽ bị xóa khỏi canvas hiện tại.',
        confirmText: 'Đồng ý',
        cancelText: 'Hủy'
      });
      if (!ok) return;
    }
    setIsCreateFrameOpen(true);
  };

  const resolveFrameDetail = async (frame: any) => {
    if (!frame?.id || (!frame.is_list_item && Array.isArray(frame.elements))) {
      return frame;
    }

    return apiService.getFrame(frame.id);
  };

  const loadTemplateIntoEditor = async (frame: any) => {
    try {
      const fullFrame = await resolveFrameDetail(frame);
      tpl.handleLoadSavedFrame(fullFrame);
      const isSystemPreset = !fullFrame.id || String(fullFrame.id).startsWith('template_') || String(fullFrame.id).startsWith('demo_');
      tpl.setEditingTemplateId(!isSystemPreset ? fullFrame.id : null);
      setIsUsingSystemTemplate(isSystemPreset);
      layers.setActiveSidebarTab('layers');
      setView('editor');
    } catch (error) {
      showToast('Không thể tải chi tiết khung hình: ' + String(error), 'error');
    }
  };

  const handleDuplicateFrame = async (frame: any) => {
    const fullFrame = await resolveFrameDetail(frame);
    const clone = {
      ...fullFrame,
      id: `draft_${Date.now()}`,
      name: `${fullFrame.name || 'Khung hình'} (Bản sao)`,
      slots: (fullFrame.slots || []).map((slot: any) => ({ ...slot, id: `${slot.id || 'slot'}_copy_${Date.now()}` })),
      elements: (fullFrame.elements || []).map((element: any) => ({ ...element, id: `${element.id || element.type}_copy_${Date.now()}` }))
    };
    await loadTemplateIntoEditor(clone);
    tpl.setEditingTemplateId(null);
    setIsUsingSystemTemplate(false);
  };

  const handleDeleteFrame = async (frame: any) => {
    if (!isAdminAuthenticated && tpl.userRole !== 'admin') {
      showToast('Chỉ tài khoản Admin mới có quyền xóa mẫu khỏi hệ thống.', 'error');
      setIsAdminPasswordModalOpen(true);
      return;
    }

    if (!frame.id || String(frame.id).startsWith('demo_')) {
      showToast('Đây là mẫu minh họa, không có bản ghi để xóa.', 'info');
      return;
    }
    const ok = await showConfirm({
      title: 'Xác nhận xóa',
      message: `Bạn có chắc chắn muốn xóa mẫu "${frame.name}"? Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy'
    });
    if (!ok) return;

    try {
      await apiService.deleteFrame(frame.id);
      showToast('Đã xóa mẫu thành công!', 'success');
      await tpl.fetchSavedFrames();
    } catch (error) {
      showToast('Không thể xóa mẫu: ' + String(error), 'error');
    }
  };

  const handleRequestSave = async () => {
    // Chỉ Admin mới được quyền cập nhật đè trực tiếp lên mẫu có sẵn trong database
    const canUpdate = Boolean(isAdminAuthenticated || tpl.userRole === 'admin');
    if (tpl.editingTemplateId && canUpdate) {
      const ok = await tpl.handleUpdateTemplateInDb(cs.frameName, tpl.editingCategory || 'wedding');
      if (ok && pendingExportAfterSave) {
        setPendingExportAfterSave(false);
        setView('preview');
      }
      return;
    }
    // Chưa lưu hoặc tài khoản thường -> mở modal để lưu thành mẫu mới
    setIsSaveFrameOpen(true);
  };

  const handleSaveFrameName = async (name: string, category: string = 'wedding') => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Vui lòng nhập tên frame!', 'error');
      return;
    }

    const isDuplicate = tpl.savedFrames.some(
      (f) => f.id !== tpl.editingTemplateId && f.name && f.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      showToast(`Tên khung hình "${trimmedName}" đã tồn tại trong hệ thống. Vui lòng đặt tên khác để tránh trùng lặp!`, 'error');
      return;
    }

    const canUpdate = Boolean(isAdminAuthenticated || tpl.userRole === 'admin');
    let ok = false;
    if (tpl.editingTemplateId && canUpdate) {
      ok = await tpl.handleUpdateTemplateInDb(trimmedName, category);
      if (ok) {
        cs.setFrameName(trimmedName);
        setIsSaveFrameOpen(false);
      }
    } else {
      ok = await tpl.handleSaveNewTemplateToDb(trimmedName, category);
      if (ok) {
        cs.setFrameName(trimmedName);
        setIsSaveFrameOpen(false);
      }
    }

    if (ok && pendingExportAfterSave) {
      setPendingExportAfterSave(false);
      setView('preview');
    }
  };

  const handleOpenPreview = () => {
    const hasContent = layers.slots.length > 0 || layers.elements.length > 0 || Boolean(cs.bgImageUrl);
    if (!hasContent) {
      showToast('Vui lòng thêm ô ảnh hoặc tải ảnh nền lên khung hình trước khi xuất file!', 'info');
      return;
    }

    // Nếu là khung mẫu có sẵn trong hệ thống -> cho phép xuất file ngay
    if (isUsingSystemTemplate) {
      setView('preview');
      return;
    }

    // Bắt buộc phải lưu khung ảnh trước khi xuất file
    if (!tpl.editingTemplateId) {
      showToast('Vui lòng lưu khung hình vào hệ thống trước khi xuất file!', 'info');
      setPendingExportAfterSave(true);
      setIsSaveFrameOpen(true);
      return;
    }

    setView('preview');
  };

  const handleExportPNGWithGuard = () => {
    if (!isUsingSystemTemplate && !tpl.editingTemplateId) {
      showToast('Vui lòng lưu khung hình vào hệ thống trước khi xuất file!', 'info');
      setView('editor');
      setPendingExportAfterSave(true);
      setIsSaveFrameOpen(true);
      return;
    }
    exp.handleExportPNG();
  };

  const handleExportZipWithGuard = () => {
    if (!isUsingSystemTemplate && !tpl.editingTemplateId) {
      showToast('Vui lòng lưu khung hình vào hệ thống trước khi xuất file!', 'info');
      setView('editor');
      setPendingExportAfterSave(true);
      setIsSaveFrameOpen(true);
      return;
    }
    exp.handleExportDslrboothZip();
  };

  const handleRenameFrame = async (frameId: string, newName: string, password?: string) => {
    try {
      const frameSummary = tpl.savedFrames.find(f => f.id === frameId);
      if (!frameSummary) return false;
      const frame = await resolveFrameDetail(frameSummary);

      await apiService.updateFrame({
        id: frameId,
        name: newName,
        width: frame.width,
        height: frame.height,
        backgroundPrompt: frame.background_prompt,
        backgroundImageUrl: frame.background_image_url,
        slots: frame.slots,
        elements: frame.elements,
        password: password
      });
      showToast('Đã đổi tên frame thành công!', 'success');
      
      // If we are currently editing this frame, update canvas state too
      if (tpl.editingTemplateId === frameId) {
        cs.setFrameName(newName);
      }
      
      await tpl.fetchSavedFrames();
      return true;
    } catch (error) {
      showToast('Lỗi đổi tên frame: ' + String(error), 'error');
      return false;
    }
  };

  const getSelectRegionTargetElement = () => {
    const selected = layers.elements.find((el) => el.id === layers.selectedId && el.type === 'image');
    if (selected) return selected;
    const bgFrame = layers.elements.find((el) => el.id.startsWith('background_frame') && el.type === 'image');
    if (bgFrame) return bgFrame;
    const anyImage = layers.elements.find((el) => el.type === 'image' && el.content);
    if (anyImage) return anyImage;
    return null;
  };

  const getSelectRegionTargetBounds = () => {
    const el = getSelectRegionTargetElement();
    if (el) {
      return { x: el.x, y: el.y, width: el.width, height: el.height };
    }
    return { x: 0, y: 0, width: cs.width, height: cs.height };
  };

  const getSelectRegionTargetImage = (): string | null => {
    const selectedElement = getSelectRegionTargetElement();
    return selectedElement ? selectedElement.content : cs.bgImageUrl;
  };

  const handleOpenSelectRegion = (initialMode: RegionModalMode = 'punch_color') => {
    if (!getSelectRegionTargetImage()) {
      showToast('Vui lòng chọn một ảnh trên giao diện hoặc tải lên ảnh nền để chỉnh sửa', 'error');
      return;
    }
    setSelectRegionInitialMode(initialMode);
    setIsSelectRegionOpen(true);
  };

  const handleOpenTransparentSlotPicker = () => {
    if (!getSelectRegionTargetImage()) {
      showToast('Vui lòng chọn một ảnh trên giao diện hoặc tải lên ảnh nền để nhận diện ô ảnh', 'error');
      return;
    }
    setIsTransparentSlotPickerOpen(true);
  };

  const handleApplyTransparentSlots = (newSlots: FrameSlot[]) => {
    if (newSlots.length > 0) {
      layers.setSlots(newSlots);
      layers.setActiveSidebarTab('layers');
      showToast(`Đã nhận diện và áp dụng ${newSlots.length} ô ảnh!`, 'success');
    }
    setIsTransparentSlotPickerOpen(false);
  };

  const handleApplySelectRegion = (
    dataUrl: string,
    resetToCanvasSize: boolean,
    dimensions?: { width: number; height: number }
  ) => {
    const selectedElement = getSelectRegionTargetElement();
    if (selectedElement) {
      if (selectedElement.content === cs.bgImageUrl || selectedElement.id.startsWith('background_frame')) {
        cs.setBgImageUrl(dataUrl);
      }
      
      layers.setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElement.id) return el;
          if (resetToCanvasSize) {
            return {
              ...el,
              content: dataUrl,
              x: 0,
              y: 0,
              width: cs.width,
              height: cs.height,
              rotation: 0,
              aspectRatio: cs.width / cs.height
            };
          }
          if (dimensions) {
            const ar = dimensions.width / Math.max(1, dimensions.height);
            let w = dimensions.width;
            let h = dimensions.height;
            if (w > cs.width || h > cs.height) {
              const fitScale = Math.min(cs.width / w, cs.height / h);
              w = Math.round(w * fitScale);
              h = Math.round(h * fitScale);
            }
            return {
              ...el,
              content: dataUrl,
              width: w,
              height: h,
              aspectRatio: ar
            };
          }
          return { ...el, content: dataUrl };
        })
      );
      showToast('Đã chỉnh sửa ảnh thành công!', 'success');
    } else if (cs.bgImageUrl) {
      const previousBg = cs.bgImageUrl;
      cs.setBgImageUrl(dataUrl);
      if (resetToCanvasSize) cs.setBackgroundType('color');
      layers.setElements((prev) =>
        prev.map((el) => {
          if (el.type !== 'image' || el.content !== previousBg) return el;
          if (resetToCanvasSize) {
            return {
              ...el,
              content: dataUrl,
              x: 0,
              y: 0,
              width: cs.width,
              height: cs.height,
              aspectRatio: cs.width / cs.height
            };
          }
          if (dimensions) {
            const ar = dimensions.width / Math.max(1, dimensions.height);
            let w = dimensions.width;
            let h = dimensions.height;
            if (w > cs.width || h > cs.height) {
              const fitScale = Math.min(cs.width / w, cs.height / h);
              w = Math.round(w * fitScale);
              h = Math.round(h * fitScale);
            }
            return { ...el, content: dataUrl, width: w, height: h, aspectRatio: ar };
          }
          return { ...el, content: dataUrl };
        })
      );
      showToast('Đã chỉnh sửa ảnh nền thành công!', 'success');
    }
    setIsSelectRegionOpen(false);
  };

  const renderEditor = () => (
    <main className="flex min-w-0 min-h-0 flex-1 flex-col bg-slate-50">
      <EditorToolbar
        selectedId={layers.selectedId}
        onAddSlot={layers.handleAddSlot}
        onAddText={layers.handleAddText}
        onAddSticker={layers.handleAddSticker}
        onAddImage={layers.handleAddImage}
        onAddQr={layers.handleAddQr}
        onAddBackgroundFrame={(file) => layers.handleAddBackgroundFrame(file, cs.setBgImageUrl, cs.setBackgroundType)}
        onDeleteElement={layers.handleDeleteElement}
        onDuplicateElement={layers.handleDuplicateElement}
        onClearCanvas={async () => {

          if (await layers.handleClearCanvas()) {
            cs.setBgImageUrl(null);
            setIsUsingSystemTemplate(false);
          }
        }}
        onUndo={layers.handleUndo}
        onRedo={layers.handleRedo}
        canUndo={layers.canUndo}
        canRedo={layers.canRedo}
        userRole={tpl.userRole}
        isAdmin={isAdminAuthenticated}
        editingTemplateId={tpl.editingTemplateId}
        isSavingTemplate={tpl.isSavingTemplate}
        onUpdateTemplateInDb={handleRequestSave}
        isExporting={exp.isExporting}
        onExportPNG={handleExportPNGWithGuard}
        isExportingZip={exp.isExportingZip}
        zipExportSuccess={exp.zipExportSuccess}
        onExportDslrboothZip={handleExportZipWithGuard}
        onNewFrame={handleNewFrame}
        onOpenPreview={handleOpenPreview}
        frameName={cs.frameName}
        onEditFrameName={() => {
          setIsSaveFrameOpen(true);
        }}
        onSaveNewTemplateToDb={() => {
          setIsSaveFrameOpen(true);
        }}
        savedFrames={tpl.savedFrames}
        isLoadingFrames={tpl.isLoadingFrames}
        onLoadSavedFrame={loadTemplateIntoEditor}
        onSelectRegion={handleOpenSelectRegion}
        onOpenTransparentSlotPicker={handleOpenTransparentSlotPicker}
        isUsingSystemTemplate={isUsingSystemTemplate}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          onOpenAISettings={() => setIsAISettingsOpen(true)}
          onAddSticker={layers.handleAddSticker}
          onAddImage={layers.handleAddImage}
          slots={layers.slots}
          elements={layers.elements}
          onSlotsChange={layers.setSlots}
          onElementsChange={layers.setElements}
          selectedId={layers.selectedId}
          onSelectElement={(id, type) => {
            layers.setSelectedId(id);
            layers.setSelectedType(type);
          }}
          onDeleteElement={layers.handleDeleteElement}
          paperSize={cs.paperSize}
          onPaperSizeChange={handlePaperSizeChange}
          orientation={cs.orientation}
          onOrientationChange={handleOrientationChange}
          width={cs.width}
          onWidthChange={(w) => handleDimensionChange(w, cs.height)}
          height={cs.height}
          onHeightChange={(h) => handleDimensionChange(cs.width, h)}
          resolution={cs.resolution}
          onResolutionChange={cs.setResolution}
          backgroundType={cs.backgroundType}
          onBackgroundTypeChange={cs.setBackgroundType}
          backgroundColor={cs.backgroundColor}
          onBackgroundColorChange={cs.setBackgroundColor}
          onBgGradientChange={cs.setBgGradient}
          bgImageUrl={cs.bgImageUrl}
          onBgImageUrlChange={cs.setBgImageUrl}
          activeTab={layers.activeSidebarTab}
          onActiveTabChange={layers.setActiveSidebarTab}
          personalization={personalization}
          onPersonalizationChange={setPersonalization}
          onApplyPersonalization={() => undefined}
          savedFrames={tpl.savedFrames}
          isLoadingFrames={tpl.isLoadingFrames}
          onLoadSavedFrame={loadTemplateIntoEditor}
          isExporting={exp.isExporting}
          onExportPNG={exp.handleExportPNG}
          isExportingZip={exp.isExportingZip}
          zipExportSuccess={exp.zipExportSuccess}
          onExportDslrboothZip={exp.handleExportDslrboothZip}
          userRole={tpl.userRole}
          editingTemplateId={tpl.editingTemplateId}
          isSavingTemplate={tpl.isSavingTemplate}
          onUpdateTemplateInDb={handleRequestSave}
        />

        <section className="relative flex min-w-0 min-h-0 flex-1 flex-col">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center bg-slate-900 text-sm font-bold text-slate-300">
                Đang tải khung vẽ...
              </div>
            }
          >
            <CanvasEditor
              width={cs.width}
              height={cs.height}
              backgroundImageUrl={cs.bgImageUrl}
              slots={layers.slots}
              elements={layers.elements}
              onSlotsChange={layers.setSlots}
              onElementsChange={layers.setElements}
              selectedId={layers.selectedId}
              selectedIds={layers.selectedIds}
              onSelectElement={(id, type) => {
                layers.setSelectedId(id);
                layers.setSelectedType(type);
              }}
              onSelectElements={(ids, type) => {
                layers.setSelectedIds(ids);
                layers.setSelectedType(type);
              }}
              showGrid={cs.showGrid}
              snapToGrid={cs.snapToGrid}
              backgroundColor={cs.backgroundColor}
              backgroundType={cs.backgroundType}
              bgGradient={cs.bgGradient}
              onCanvasSnapshotReady={handleCanvasSnapshotReady}
              onDuplicateElement={layers.handleDuplicateElement}
              onDeleteElement={layers.handleDeleteElement}
              onCopy={layers.handleCopy}
              onPaste={layers.handlePaste}
              onUndo={layers.handleUndo}
              onRedo={layers.handleRedo}
            />

          </Suspense>
          <ViewportControls
            showGrid={cs.showGrid}
            snapToGrid={cs.snapToGrid}
            onToggleGrid={() => cs.setShowGrid(!cs.showGrid)}
            onToggleSnap={() => cs.setSnapToGrid(!cs.snapToGrid)}
          />
          <ExportModal exportResult={exp.exportResult} onClose={() => exp.setExportResult(null)} />
        </section>

        <Inspector
          selectedId={layers.selectedId}
          selectedIds={layers.selectedIds}
          selectedType={layers.selectedType}
          activeElement={layers.activeElement}
          onUpdateProp={layers.handleUpdateSelectedProp}
          onDeleteElement={layers.handleDeleteElement}
          onDuplicateElement={layers.handleDuplicateElement}
          onCopy={layers.handleCopy}
          onPaste={layers.handlePaste}
          onMoveLayerOrder={layers.handleMoveLayerOrder}
          onAlignElement={layers.handleAlignElement}
          onOpenImageEditor={() => handleOpenSelectRegion('crop')}

          isExporting={exp.isExporting}
          onExportPNG={exp.handleExportPNG}
          isExportingZip={exp.isExportingZip}
          zipExportSuccess={exp.zipExportSuccess}
          onExportDslrboothZip={exp.handleExportDslrboothZip}
          savedFrames={tpl.savedFrames}
          onLoadSavedFrame={loadTemplateIntoEditor}
          slotsCount={layers.slots.length}
          elementsCount={layers.elements.length}
          canvasWidth={cs.width}
          canvasHeight={cs.height}
          userRole={tpl.userRole}
          editingTemplateId={tpl.editingTemplateId}
          isSavingTemplate={tpl.isSavingTemplate}
          onUpdateTemplateInDb={handleRequestSave}
        />
      </div>
    </main>
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-slate-950">
      <AppNav
        currentView={view}
        isAdminAuthenticated={isAdminAuthenticated}
        onOpenAdminLogin={() => setIsAdminPasswordModalOpen(true)}
        onLogoutAdmin={() => {
          try {
            sessionStorage.removeItem('photobooth_admin_auth');
          } catch {}
          setIsAdminAuthenticated(false);
          setView('editor');
          showToast('Đã đăng xuất quyền Quản trị viên!', 'info');
        }}
        onNavigateView={(targetView) => setView(targetView)}
      />

      {view === 'library' && (
        <FrameLibrary
          frames={tpl.savedFrames}
          onCreateNew={() => setIsCreateFrameOpen(true)}
          onEditFrame={loadTemplateIntoEditor}
          onRefresh={tpl.fetchSavedFrames}
          onDuplicateFrame={handleDuplicateFrame}
          onDeleteFrame={handleDeleteFrame}
          onRenameFrame={handleRenameFrame}
          onOpenEditor={() => setView('editor')}
          isAdmin={isAdminAuthenticated}
        />
      )}

      {view === 'editor' && renderEditor()}

      {view === 'preview' && (
        <FramePreviewStep
          frameName={cs.frameName}
          width={cs.width}
          height={cs.height}
          slots={layers.slots}
          elements={layers.elements}
          backgroundType={cs.backgroundType}
          backgroundColor={cs.backgroundColor}
          bgGradient={cs.bgGradient}
          bgImageUrl={cs.bgImageUrl}
          isExporting={exp.isExporting}
          isExportingZip={exp.isExportingZip}
          onBack={() => setView('editor')}
          onExportPNG={handleExportPNGWithGuard}
          onExportZip={handleExportZipWithGuard}
        />
      )}

      <AdminPasswordModal
        isOpen={isAdminPasswordModalOpen}
        onClose={() => setIsAdminPasswordModalOpen(false)}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setIsAdminPasswordModalOpen(false);
          setView('library');
          showToast('Xác thực quyền Quản trị viên thành công!', 'success');
        }}
      />

      <CreateFrameModal
        isOpen={isCreateFrameOpen}
        onClose={() => setIsCreateFrameOpen(false)}
        onCreate={handleCreateFrame}
      />
      <SaveFrameModal
        isOpen={isSaveFrameOpen}
        defaultName={cs.frameName}
        defaultCategory={tpl.editingCategory}
        isSaving={tpl.isSavingTemplate}
        existingNames={tpl.savedFrames.filter(f => f.id !== tpl.editingTemplateId).map((f) => f.name || '')}
        isForExport={pendingExportAfterSave}
        onClose={() => {
          setIsSaveFrameOpen(false);
          setPendingExportAfterSave(false);
        }}
        onSave={handleSaveFrameName}
      />
      <SelectRegionModal
        isOpen={isSelectRegionOpen}
        imageUrl={getSelectRegionTargetImage()}
        canvasWidth={cs.width}
        canvasHeight={cs.height}
        slots={layers.slots}
        targetElement={getSelectRegionTargetElement()}
        initialMode={selectRegionInitialMode}
        onClose={() => setIsSelectRegionOpen(false)}
        onApply={handleApplySelectRegion}
      />
      <TransparentSlotPickerModal
        isOpen={isTransparentSlotPickerOpen}
        imageUrl={getSelectRegionTargetImage()}
        targetBounds={getSelectRegionTargetBounds()}
        canvasWidth={cs.width}
        canvasHeight={cs.height}
        onClose={() => setIsTransparentSlotPickerOpen(false)}
        onApply={handleApplyTransparentSlots}
      />
      {isAISettingsOpen && (
        <Suspense fallback={null}>
          <AISettingsModal isOpen={isAISettingsOpen} onClose={() => setIsAISettingsOpen(false)} />
        </Suspense>
      )}
      {view !== 'editor' && <ExportModal exportResult={exp.exportResult} onClose={() => exp.setExportResult(null)} />}
    </div>
  );

}

export default App;
