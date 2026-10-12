import React, { useState, useRef, useEffect } from 'react';
import { useDrawingState } from './hooks/useDrawingState';
import { HeaderBar } from './components/HeaderBar';
import { LayerBar } from './components/LayerBar';
import { ToolDock } from './components/ToolDock';
import { CanvasViewport } from './components/CanvasViewport';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { FixtureDrawer } from './components/FixtureDrawer';
import { loadProjectFromFile } from './utils/fileIO';
import type { CADElement, HandStroke } from './types/drawing';

export function App() {
  const drawingState = useDrawingState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFixtureDrawerOpen, setIsFixtureDrawerOpen] = useState(false);

  // Load sample starter template if canvas is empty
  useEffect(() => {
    // Initial demo layout: living-dining with bedroom, door, sliding window, and sample rough sketch
    const sampleCad: CADElement[] = [
      // Outer walls (LDK room 5460mm x 3640mm = 6x4 grids)
      {
        id: 'wall_1',
        type: 'wall',
        p1: { x: 3640, y: 2730 },
        p2: { x: 9100, y: 2730 },
        thickness: 120,
      },
      {
        id: 'wall_2',
        type: 'wall',
        p1: { x: 9100, y: 2730 },
        p2: { x: 9100, y: 6370 },
        thickness: 120,
      },
      {
        id: 'wall_3',
        type: 'wall',
        p1: { x: 9100, y: 6370 },
        p2: { x: 3640, y: 6370 },
        thickness: 120,
      },
      {
        id: 'wall_4',
        type: 'wall',
        p1: { x: 3640, y: 6370 },
        p2: { x: 3640, y: 2730 },
        thickness: 120,
      },
      // Partition wall
      {
        id: 'wall_5',
        type: 'wall',
        p1: { x: 6370, y: 2730 },
        p2: { x: 6370, y: 6370 },
        thickness: 120,
      },
      // Entrance Single Door
      {
        id: 'fixture_door1',
        type: 'fixture',
        fixtureId: 'door_single',
        name: '片開きドア',
        position: { x: 4550, y: 6370 },
        rotation: 0,
        flipH: false,
        flipV: false,
        widthMm: 910,
        depthMm: 910,
      },
      // Interior Door
      {
        id: 'fixture_door2',
        type: 'fixture',
        fixtureId: 'door_single',
        name: '片開きドア',
        position: { x: 6370, y: 4550 },
        rotation: 90,
        flipH: false,
        flipV: false,
        widthMm: 910,
        depthMm: 910,
      },
      // Balcony Sliding Window
      {
        id: 'fixture_win1',
        type: 'fixture',
        fixtureId: 'window_sliding',
        name: '引違い窓',
        position: { x: 7735, y: 2730 },
        rotation: 0,
        flipH: false,
        flipV: false,
        widthMm: 1650,
        depthMm: 120,
      },
      // Room Names
      {
        id: 'room_1',
        type: 'room',
        position: { x: 7735, y: 4550 },
        name: 'LDK',
        tatami: 10,
      },
      {
        id: 'room_2',
        type: 'room',
        position: { x: 5005, y: 4550 },
        name: '洋室',
        tatami: 6,
      },
      // Dimension line
      {
        id: 'dim_1',
        type: 'dimension',
        p1: { x: 3640, y: 2300 },
        p2: { x: 9100, y: 2300 },
        offsetMm: 200,
      },
    ];

    // Sample blue rough sketch stroke (representing on-site preliminary notes/dimensions)
    const sampleRough: HandStroke[] = [
      {
        id: 'sample_stroke_1',
        tool: 'pen',
        color: '#2563eb',
        width: 35,
        opacity: 0.85,
        points: [
          { x: 3700, y: 3100 },
          { x: 3900, y: 3050 },
          { x: 4100, y: 3100 },
          { x: 4300, y: 3080 },
          { x: 4500, y: 3050 },
        ],
        timestamp: Date.now(),
      },
      {
        id: 'sample_stroke_2',
        tool: 'highlighter',
        color: '#eab308',
        width: 250,
        opacity: 0.45,
        points: [
          { x: 7200, y: 4400 },
          { x: 8200, y: 4400 },
        ],
        timestamp: Date.now(),
      },
    ];

    sampleCad.forEach((el) => drawingState.addCadElement(el));
    sampleRough.forEach((s) => drawingState.addStroke(s));
    // Center viewport
    drawingState.setViewport({
      panX: 80,
      panY: 80,
      zoom: 0.08,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const project = await loadProjectFromFile(file);
        drawingState.loadProject(project);
        alert(`図面「${project.title}」を読み込みました`);
      } catch (err) {
        alert('読み込みエラー: ' + (err as Error).message);
      }
    }
    // reset input
    e.target.value = '';
  };

  return (
    <div className="app-root">
      {/* Hidden file input for project import */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".madori,.json"
        onChange={handleFileInputChange}
      />

      {/* Top Header Bar */}
      <HeaderBar
        projectTitle={drawingState.projectTitle}
        setProjectTitle={drawingState.setProjectTitle}
        settings={drawingState.settings}
        setSettings={drawingState.setSettings}
        viewport={drawingState.viewport}
        setViewport={drawingState.setViewport}
        canUndo={drawingState.canUndo}
        canRedo={drawingState.canRedo}
        onUndo={drawingState.undo}
        onRedo={drawingState.redo}
        onClearLayer={drawingState.clearCurrentLayer}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenFile={() => fileInputRef.current?.click()}
      />

      {/* Prominent Layer Switcher Bar right below Header */}
      <LayerBar
        activeLayer={drawingState.activeLayer}
        setActiveLayer={drawingState.setActiveLayer}
        layerState={drawingState.layerState}
        setLayerState={drawingState.setLayerState}
      />

      {/* Main Workspace Layout (Canvas + Dock) */}
      <main className={`workspace-main layout-${drawingState.settings.handedness}`}>
        {/* The Canvas Viewport */}
        <div className="canvas-wrapper">
          <CanvasViewport
            settings={drawingState.settings}
            activeLayer={drawingState.activeLayer}
            layerState={drawingState.layerState}
            roughStrokes={drawingState.roughStrokes}
            cadElements={drawingState.cadElements}
            activeHandTool={drawingState.activeHandTool}
            penColor={drawingState.penColor}
            penWidth={drawingState.penWidth}
            eraserWidth={drawingState.eraserWidth}
            activeCadTool={drawingState.activeCadTool}
            activeFixtureId={drawingState.activeFixtureId}
            fixtureRotation={drawingState.fixtureRotation}
            fixtureFlipH={drawingState.fixtureFlipH}
            fixtureFlipV={drawingState.fixtureFlipV}
            activeRoomName={drawingState.activeRoomName}
            activeTatami={drawingState.activeTatami}
            viewport={drawingState.viewport}
            setViewport={drawingState.setViewport}
            onAddStroke={drawingState.addStroke}
            onUpdateStroke={drawingState.updateStroke}
            onRemoveStroke={drawingState.removeStroke}
            onClearStrokesByEraser={drawingState.clearStrokesByEraser}
            onAddCadElement={drawingState.addCadElement}
            onUpdateCadElement={drawingState.updateCadElement}
            onRemoveCadElement={drawingState.removeCadElement}
            onPushHistory={drawingState.pushHistory}
            onSelectLayer={drawingState.setActiveLayer}
            onSelectCadTool={drawingState.setActiveCadTool}
            onSelectFixture={drawingState.setActiveFixtureId}
            onRotateFixture={drawingState.rotateFixture}
            onFlipFixtureH={drawingState.flipFixtureHorizontal}
            onOpenFixtureDrawer={() => setIsFixtureDrawerOpen(true)}
            onSelectHandTool={drawingState.setActiveHandTool}
            penPresets={drawingState.penPresets}
            activePenPresetId={drawingState.activePenPresetId}
            onSelectPenPreset={drawingState.selectPenPreset}
            onSelectPenColor={drawingState.setPenColor}
          />

          {/* Floating Canvas Quick Tips / Status Pill */}
          <div className="canvas-quick-info">
            <span className="info-item">
              {drawingState.activeLayer === 'rough' ? '✏️ 手書き描画中' : '📐 CAD作図中'}
            </span>
            <span className="info-divider">|</span>
            <span className="info-item">
              {drawingState.activeLayer === 'rough'
                ? 'スタイラス/指で自由に描画'
                : drawingState.activeCadTool === 'fixture'
                  ? '画面タップで建具を吸着スタンプ'
                  : drawingState.activeCadTool === 'wall'
                    ? 'ドラッグして壁を配置'
                    : 'グリッド吸着ON'}
            </span>
            <span className="info-divider">|</span>
            <span className="info-item">2本指またはホイールで拡大縮小</span>
          </div>
        </div>

        {/* Speed-First Tablet Tool Dock */}
        <ToolDock
          settings={drawingState.settings}
          setSettings={drawingState.setSettings}
          activeLayer={drawingState.activeLayer}
          activeHandTool={drawingState.activeHandTool}
          setActiveHandTool={drawingState.setActiveHandTool}
          activePenPresetId={drawingState.activePenPresetId}
          selectPenPreset={drawingState.selectPenPreset}
          penPresets={drawingState.penPresets}
          penColor={drawingState.penColor}
          setPenColor={drawingState.setPenColor}
          penWidth={drawingState.penWidth}
          setPenWidth={drawingState.setPenWidth}
          eraserWidth={drawingState.eraserWidth}
          setEraserWidth={drawingState.setEraserWidth}
          activeCadTool={drawingState.activeCadTool}
          setActiveCadTool={drawingState.setActiveCadTool}
          activeFixtureId={drawingState.activeFixtureId}
          fixtureRotation={drawingState.fixtureRotation}
          onRotateFixture={drawingState.rotateFixture}
          fixtureFlipH={drawingState.fixtureFlipH}
          onFlipFixtureH={drawingState.flipFixtureHorizontal}
          onOpenFixtureDrawer={() => setIsFixtureDrawerOpen(true)}
          activeRoomName={drawingState.activeRoomName}
          setActiveRoomName={drawingState.setActiveRoomName}
          activeTatami={drawingState.activeTatami}
          setActiveTatami={drawingState.setActiveTatami}
        />
      </main>

      {/* Fixture Selection Drawer Modal */}
      <FixtureDrawer
        isOpen={isFixtureDrawerOpen}
        onClose={() => setIsFixtureDrawerOpen(false)}
        activeFixtureId={drawingState.activeFixtureId}
        onSelectFixture={(id) => {
          drawingState.setActiveFixtureId(id);
          drawingState.setActiveCadTool('fixture');
        }}
        fixtureRotation={drawingState.fixtureRotation}
        onRotate={drawingState.rotateFixture}
        fixtureFlipH={drawingState.fixtureFlipH}
        onFlipH={drawingState.flipFixtureHorizontal}
        fixtureFlipV={drawingState.fixtureFlipV}
        onFlipV={drawingState.flipFixtureVertical}
      />

      {/* Configurable Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={drawingState.settings}
        setSettings={drawingState.setSettings}
        penPresets={drawingState.penPresets}
        setPenPresets={drawingState.setPenPresets}
      />

      {/* CAD File Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectTitle={drawingState.projectTitle}
        settings={drawingState.settings}
        cadElements={drawingState.cadElements}
        roughStrokes={drawingState.roughStrokes}
        onGetFullProject={drawingState.getProjectExport}
      />
    </div>
  );
}

export default App;
