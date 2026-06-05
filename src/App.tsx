import { useState } from 'react';
import { CanvasEditor } from './components/CanvasEditor';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { ExportModal } from './components/ExportModal';
import { AISettingsModal } from './components/AISettingsModal';
import { EditorToolbar } from './components/EditorToolbar';
import { ViewportControls } from './components/ViewportControls';
import { usePWA } from './hooks/usePWA';
import { useCanvasState } from './hooks/useCanvasState';
import { useCanvasLayers } from './hooks/useCanvasLayers';
import { useExport } from './hooks/useExport';
import { useTemplateDB } from './hooks/useTemplateDB';
import { applyPersonalizationToElements, DEFAULT_PERSONALIZATION } from './utils/personalization';

export function App() {
  const { isOnline, isInstalled, isInstallable, triggerInstall } = usePWA();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [personalization, setPersonalization] = useState(DEFAULT_PERSONALIZATION);

  const cs = useCanvasState();
  const layers = useCanvasLayers({ width: cs.width, height: cs.height });

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
    prompt: cs.prompt,
    personalization,
    setBgImageUrl: cs.setBgImageUrl,
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

  const closeMobilePanels = () => {
    setIsMobileSidebarOpen(false);
    setIsMobileInspectorOpen(false);
  };

  const loadTemplateIntoStudio = (frame: any) => {
    tpl.handleLoadSavedFrame(frame);
    tpl.setEditingTemplateId(frame.id && !String(frame.id).startsWith('template_') ? frame.id : null);
    setIsMobileSidebarOpen(false);
    setIsMobileInspectorOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('lumibooth_auth_token');
    localStorage.removeItem('lumibooth_username');
    window.location.reload();
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#f9f9ff] text-[#111c2d]">
      <Header
        isOnline={isOnline}
        isInstalled={isInstalled}
        isInstallable={isInstallable}
        onTriggerInstall={triggerInstall}
        frameName={cs.frameName}
        onFrameNameChange={cs.setFrameName}
        onLogout={handleLogout}
        onToggleSidebar={() => {
          setIsMobileSidebarOpen(!isMobileSidebarOpen);
          setIsMobileInspectorOpen(false);
        }}
        onToggleInspector={() => {
          setIsMobileInspectorOpen(!isMobileInspectorOpen);
          setIsMobileSidebarOpen(false);
        }}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 transform md:static md:translate-x-0 md:flex md:z-10 h-full flex shrink-0 ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
            }`}
        >
          <Sidebar
            onOpenAISettings={() => setIsAISettingsOpen(true)}
            onAddSticker={(url) => {
              layers.handleAddSticker(url);
              setIsMobileSidebarOpen(false);
            }}
            onAddImage={(file) => {
              layers.handleAddImage(file);
              setIsMobileSidebarOpen(false);
            }}
            slots={layers.slots}
            elements={layers.elements}
            onSlotsChange={layers.setSlots}
            onElementsChange={layers.setElements}
            selectedId={layers.selectedId}
            onSelectElement={(id, type) => {
              layers.setSelectedId(id);
              layers.setSelectedType(type);
              if (id) {
                setIsMobileInspectorOpen(true);
                setIsMobileSidebarOpen(false);
              }
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
            onApplyPersonalization={() => {
              layers.setElements(applyPersonalizationToElements(layers.elements, personalization));
              layers.setActiveSidebarTab('layers');
            }}
            savedFrames={tpl.savedFrames}
            onLoadSavedFrame={loadTemplateIntoStudio}
            isExporting={exp.isExporting}
            onExportPNG={exp.handleExportPNG}
            isExportingZip={exp.isExportingZip}
            zipExportSuccess={exp.zipExportSuccess}
            onExportDslrboothZip={exp.handleExportDslrboothZip}
            userRole={tpl.userRole}
            editingTemplateId={tpl.editingTemplateId}
            isSavingTemplate={tpl.isSavingTemplate}
            onUpdateTemplateInDb={tpl.handleUpdateTemplateInDb}
            onSaveNewTemplateToDb={tpl.handleSaveNewTemplateToDb}
          />
        </div>

        <main className="flex-1 min-w-0 flex flex-col relative bg-[#f0f3ff]">
          <EditorToolbar
            selectedId={layers.selectedId}
            onAddSlot={layers.handleAddSlot}
            onAddText={layers.handleAddText}
            onAddSticker={layers.handleAddSticker}
            onAddImage={layers.handleAddImage}
            onAddQr={layers.handleAddQr}
            onAddBackgroundFrame={(file) => layers.handleAddBackgroundFrame(file, cs.setBgImageUrl, cs.setBackgroundType)}
            onDeleteElement={layers.handleDeleteElement}
            onClearCanvas={() => {
              if (layers.handleClearCanvas()) cs.setBgImageUrl(null);
            }}
            onUndo={layers.handleUndo}
            onRedo={layers.handleRedo}
            canUndo={layers.canUndo}
            canRedo={layers.canRedo}
            userRole={tpl.userRole}
            editingTemplateId={tpl.editingTemplateId}
            isSavingTemplate={tpl.isSavingTemplate}
            onUpdateTemplateInDb={tpl.handleUpdateTemplateInDb}
            onSaveNewTemplateToDb={tpl.handleSaveNewTemplateToDb}
            isExporting={exp.isExporting}
            onExportPNG={exp.handleExportPNG}
            isExportingZip={exp.isExportingZip}
            zipExportSuccess={exp.zipExportSuccess}
            onExportDslrboothZip={exp.handleExportDslrboothZip}
          />
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
            onAutoDetectSlots={exp.handleAutoDetectSlots}
            isDetectingSlots={exp.isDetectingSlots}
          />
          <ViewportControls
            showGrid={cs.showGrid}
            snapToGrid={cs.snapToGrid}
            onToggleGrid={() => cs.setShowGrid(!cs.showGrid)}
            onToggleSnap={() => cs.setSnapToGrid(!cs.snapToGrid)}
          />
          <ExportModal exportResult={exp.exportResult} onClose={() => exp.setExportResult(null)} />
          <AISettingsModal isOpen={isAISettingsOpen} onClose={() => setIsAISettingsOpen(false)} />
        </main>

        {isMobileInspectorOpen && (
          <div
            onClick={() => {
              closeMobilePanels();
              layers.setSelectedId(null);
              layers.setSelectedType(null);
            }}
            className="md:hidden fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          />
        )}

        <div
          className={`fixed inset-y-0 right-0 z-30 transition-transform duration-300 transform md:static md:translate-x-0 md:flex md:z-10 h-full flex shrink-0 ${isMobileInspectorOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full md:translate-x-0'
            }`}
        >
          <Inspector
            selectedId={layers.selectedId}
            selectedType={layers.selectedType}
            activeElement={layers.activeElement}
            onUpdateProp={layers.handleUpdateSelectedProp}
            onDeleteElement={(id) => {
              layers.handleDeleteElement(id);
              setIsMobileInspectorOpen(false);
            }}
            onDuplicateElement={layers.handleDuplicateElement}
            onMoveLayerOrder={layers.handleMoveLayerOrder}
            onAlignElement={layers.handleAlignElement}
            isExporting={exp.isExporting}
            onExportPNG={() => {
              exp.handleExportPNG();
              setIsMobileInspectorOpen(false);
            }}
            isExportingZip={exp.isExportingZip}
            zipExportSuccess={exp.zipExportSuccess}
            onExportDslrboothZip={() => {
              exp.handleExportDslrboothZip();
              setIsMobileInspectorOpen(false);
            }}
            savedFrames={tpl.savedFrames}
            onLoadSavedFrame={loadTemplateIntoStudio}
            slotsCount={layers.slots.length}
            elementsCount={layers.elements.length}
            canvasWidth={cs.width}
            canvasHeight={cs.height}
            onClose={() => {
              layers.setSelectedId(null);
              layers.setSelectedType(null);
              setIsMobileInspectorOpen(false);
            }}
            userRole={tpl.userRole}
            editingTemplateId={tpl.editingTemplateId}
            isSavingTemplate={tpl.isSavingTemplate}
            onUpdateTemplateInDb={tpl.handleUpdateTemplateInDb}
            onSaveNewTemplateToDb={tpl.handleSaveNewTemplateToDb}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
