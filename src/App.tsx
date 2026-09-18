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
import { SelectRegionModal } from './components/SelectRegionModal';
import { TransparentSlotPickerModal } from './components/TransparentSlotPickerModal';
import { FrameSlot } from './types/canvas';
import { useCanvasState } from './hooks/useCanvasState';
import { useCanvasLayers } from './hooks/useCanvasLayers';
import { useExport } from './hooks/useExport';
import { useTemplateDB } from './hooks/useTemplateDB';
import { DEFAULT_PERSONALIZATION } from './utils/personalization';
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
  const [isCreateFrameOpen, setIsCreateFrameOpen] = useState(false);
  const [isSaveFrameOpen, setIsSaveFrameOpen] = useState(false);
  const [isSelectRegionOpen, setIsSelectRegionOpen] = useState(false);
  const [isTransparentSlotPickerOpen, setIsTransparentSlotPickerOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [isUsingSystemTemplate, setIsUsingSystemTemplate] = useState(false);
  const [personalization, setPersonalization] = useState(DEFAULT_PERSONALIZATION);
  const canvasSnapshotRef = useRef<(() => string | null) | null>(null);
  const handleCanvasSnapshotReady = useCallback((capture: (() => string | null) | null) => {
    canvasSnapshotRef.current = capture;
  }, []);

  const cs = useCanvasState();
  const layers = useCanvasLayers({ width: cs.width, height: cs.height });
  const { showToast, showConfirm, showPrompt } = useUI();

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
      tpl.setEditingTemplateId(fullFrame.id && !String(fullFrame.id).startsWith('template_') && !String(fullFrame.id).startsWith('demo_') ? fullFrame.id : null);
      setIsUsingSystemTemplate(true);
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
    if (!frame.id || String(frame.id).startsWith('demo_')) {
      showToast('Đây là mẫu minh họa, không có bản ghi để xóa.', 'info');
      return;
    }
    // Bỏ check phân quyền ở frontend để user luôn thấy ô nhập pass admin
    // if (tpl.userRole !== 'admin') {
    //   showToast('Chỉ quản trị viên mới có quyền xóa mẫu.', 'error');
    //   return;
    // }
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
    if (isUsingSystemTemplate) {
      showToast('Bạn đang sử dụng khung mẫu hệ thống. Không thể lưu lại để tránh trùng lặp khung hình.', 'info');
      return;
    }
    setIsSaveFrameOpen(true);
  };

  const handleSaveFrameName = async (name: string, category: string = 'wedding') => {
    if (isUsingSystemTemplate) {
      showToast('Bạn đang sử dụng khung mẫu hệ thống. Không thể lưu lại để tránh trùng lặp khung hình.', 'info');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Vui lòng nhập tên frame!', 'error');
      return;
    }

    const isDuplicate = tpl.savedFrames.some(
      (f) => f.name && f.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      showToast(`Tên khung hình "${trimmedName}" đã tồn tại trong hệ thống. Vui lòng đặt tên khác để tránh trùng lặp!`, 'error');
      return;
    }

    if (tpl.editingTemplateId) {
      const ok = await tpl.handleUpdateTemplateInDb(trimmedName, category);
      if (ok) {
        cs.setFrameName(trimmedName);
        setIsSaveFrameOpen(false);
      }
    } else {
      const ok = await tpl.handleSaveNewTemplateToDb(trimmedName, category);
      if (ok) {
        cs.setFrameName(trimmedName);
        setIsSaveFrameOpen(false);
      }
    }
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

  const getSelectRegionTargetElement = () =>
    layers.elements.find((el) => el.id === layers.selectedId && el.type === 'image') || null;

  const getSelectRegionTargetImage = (): string | null => {
    const selectedElement = getSelectRegionTargetElement();
    return selectedElement ? selectedElement.content : cs.bgImageUrl;
  };

  const handleOpenSelectRegion = () => {
    if (!getSelectRegionTargetImage()) {
      showToast('Vui lòng chọn một ảnh trên giao diện hoặc tải lên ảnh nền để đục lỗ', 'error');
      return;
    }
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

  const handleApplySelectRegion = (dataUrl: string, resetToCanvasSize: boolean) => {
    const selectedElement = getSelectRegionTargetElement();
    if (selectedElement) {
      // Sync bgImageUrl if we are punching holes in the background element
      if (selectedElement.content === cs.bgImageUrl || selectedElement.id.startsWith('background_frame')) {
        cs.setBgImageUrl(dataUrl);
      }
      
      layers.setElements((prev) =>
        prev.map((el) =>
          el.id === selectedElement.id
            ? resetToCanvasSize
              ? {
                  ...el,
                  content: dataUrl,
                  x: 0,
                  y: 0,
                  width: cs.width,
                  height: cs.height,
                  rotation: 0,
                  aspectRatio: cs.width / cs.height
                }
              : { ...el, content: dataUrl }
            : el
        )
      );
      showToast('Đã đục lỗ ảnh đang chọn thành công!', 'success');
    } else if (cs.bgImageUrl) {
      const previousBg = cs.bgImageUrl;
      cs.setBgImageUrl(dataUrl);
      if (resetToCanvasSize) cs.setBackgroundType('color');
      layers.setElements((prev) =>
        prev.map((el) =>
          el.type === 'image' && el.content === previousBg
            ? resetToCanvasSize
              ? { ...el, content: dataUrl, x: 0, y: 0, width: cs.width, height: cs.height, aspectRatio: cs.width / cs.height }
              : { ...el, content: dataUrl }
            : el
        )
      );
      showToast('Đã đục lỗ ảnh nền thành công!', 'success');
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
        editingTemplateId={tpl.editingTemplateId}
        isSavingTemplate={tpl.isSavingTemplate}
        onUpdateTemplateInDb={handleRequestSave}
        isExporting={exp.isExporting}
        onExportPNG={exp.handleExportPNG}
        isExportingZip={exp.isExportingZip}
        zipExportSuccess={exp.zipExportSuccess}
        onExportDslrboothZip={exp.handleExportDslrboothZip}
        onNewFrame={handleNewFrame}
        onOpenPreview={() => setView('preview')}
        frameName={cs.frameName}
        onEditFrameName={() => {
          if (isUsingSystemTemplate) {
            showToast('Bạn đang sử dụng khung mẫu hệ thống. Không thể lưu lại để tránh trùng lặp.', 'info');
            return;
          }
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
          onPaperSizeChange={cs.handlePaperSizeChange}
          orientation={cs.orientation}
          onOrientationChange={cs.handleOrientationChange}
          width={cs.width}
          onWidthChange={cs.setWidth}
          height={cs.height}
          onHeightChange={cs.setHeight}
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
              onSelectElement={(id, type) => {
                layers.setSelectedId(id);
                layers.setSelectedType(type);
              }}
              showGrid={cs.showGrid}
              snapToGrid={cs.snapToGrid}
              backgroundColor={cs.backgroundColor}
              backgroundType={cs.backgroundType}
              bgGradient={cs.bgGradient}
              onCanvasSnapshotReady={handleCanvasSnapshotReady}
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
          selectedType={layers.selectedType}
          activeElement={layers.activeElement}
          onUpdateProp={layers.handleUpdateSelectedProp}
          onDeleteElement={layers.handleDeleteElement}
          onDuplicateElement={layers.handleDuplicateElement}
          onMoveLayerOrder={layers.handleMoveLayerOrder}
          onAlignElement={layers.handleAlignElement}
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
      <AppNav />

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
          onExportPNG={exp.handleExportPNG}
          onExportZip={exp.handleExportDslrboothZip}
        />
      )}

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
        existingNames={tpl.savedFrames.map((f) => f.name || '')}
        onClose={() => setIsSaveFrameOpen(false)}
        onSave={handleSaveFrameName}
      />
      <SelectRegionModal
        isOpen={isSelectRegionOpen}
        imageUrl={getSelectRegionTargetImage()}
        canvasWidth={cs.width}
        canvasHeight={cs.height}
        slots={layers.slots}
        targetElement={getSelectRegionTargetElement()}
        onClose={() => setIsSelectRegionOpen(false)}
        onApply={handleApplySelectRegion}
      />
      <TransparentSlotPickerModal
        isOpen={isTransparentSlotPickerOpen}
        imageUrl={getSelectRegionTargetImage()}
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
