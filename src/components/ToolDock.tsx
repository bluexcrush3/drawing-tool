import React from 'react';
import {
    Square,
    Minus,
    Stamp,
    Tag,
    Hand,
    MousePointer,
    RotateCw,
    FlipHorizontal,
    ChevronRight,
} from 'lucide-react';
import type {
    CadToolType,
    HandToolType,
    LayerType,
    PenPreset,
    Settings,
} from '../types/drawing';
import { FIXTURE_LIBRARY } from '../constants/fixtureLibrary';
import { PenPalette } from './PenPalette';
import { COMMON_ROOM_PRESETS } from '../constants/defaultSettings';

interface ToolDockProps {
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    activeLayer: LayerType;
    // Hand tools
    activeHandTool: HandToolType;
    setActiveHandTool: (t: HandToolType) => void;
    activePenPresetId: string;
    selectPenPreset: (id: string) => void;
    penPresets: PenPreset[];
    penColor: string;
    setPenColor: (c: string) => void;
    penWidth: number;
    setPenWidth: (w: number) => void;
    eraserWidth: number;
    setEraserWidth: (w: number) => void;
    // CAD tools
    activeCadTool: CadToolType;
    setActiveCadTool: (t: CadToolType) => void;
    activeFixtureId: string;
    fixtureRotation: number;
    onRotateFixture: () => void;
    fixtureFlipH: boolean;
    onFlipFixtureH: () => void;
    onOpenFixtureDrawer: () => void;
    activeRoomName: string;
    setActiveRoomName: (n: string) => void;
    activeTatami: number;
    setActiveTatami: (t: number) => void;
}

export const ToolDock: React.FC<ToolDockProps> = ({
    settings,
    setSettings,
    activeLayer,
    activeHandTool,
    setActiveHandTool,
    activePenPresetId,
    selectPenPreset,
    penPresets,
    penColor,
    setPenColor,
    penWidth,
    setPenWidth,
    eraserWidth,
    setEraserWidth,
    activeCadTool,
    setActiveCadTool,
    activeFixtureId,
    fixtureRotation,
    onRotateFixture,
    fixtureFlipH,
    onFlipFixtureH,
    onOpenFixtureDrawer,
    activeRoomName,
    setActiveRoomName,
    activeTatami,
    setActiveTatami,
}) => {
    const activeDef = FIXTURE_LIBRARY.find((f) => f.id === activeFixtureId);

    return (
        <aside className={`tool-dock-container dock-${settings.handedness}`}>
            {/* Hand-Drawn Tools Mode */}
            {activeLayer === 'rough' ? (
                <div className="dock-section rough-section">
                    <div className="dock-mode-header">
                        <span className="mode-tag tag-rough">下書きモード</span>
                    </div>

                    <PenPalette
                        activeHandTool={activeHandTool}
                        setActiveHandTool={setActiveHandTool}
                        activePenPresetId={activePenPresetId}
                        selectPenPreset={selectPenPreset}
                        penPresets={penPresets}
                        penColor={penColor}
                        setPenColor={setPenColor}
                        penWidth={penWidth}
                        setPenWidth={setPenWidth}
                        eraserWidth={eraserWidth}
                        setEraserWidth={setEraserWidth}
                    />
                </div>
            ) : (
                /* CAD Tools Mode */
                <div className="dock-section cad-section">
                    <div className="dock-mode-header">
                        <span className="mode-tag tag-cad">CAD清書モード</span>
                    </div>

                    <div className="cad-tool-grid">
                        {/* Select / Move Tool */}
                        <button
                            className={`cad-tool-btn ${activeCadTool === 'select' ? 'active' : ''}`}
                            onClick={() => setActiveCadTool('select')}
                            title="選択・移動 (線や建具をクリックして位置変更)"
                        >
                            <div className="btn-icon-wrapper">
                                <MousePointer size={20} />
                            </div>
                            <span className="tool-title">選択・移動</span>
                            <span className="tool-sub">位置変更・削除</span>
                        </button>

                        {/* Wall Tool */}
                        <button
                            className={`cad-tool-btn ${activeCadTool === 'wall' ? 'active' : ''}`}
                            onClick={() => setActiveCadTool('wall')}
                            title="壁作成 (厚み付き自動線)"
                        >
                            <div className="btn-icon-wrapper">
                                <Square size={20} className="icon-wall" />
                            </div>
                            <span className="tool-title">壁ツール</span>
                            <span className="tool-sub">厚{settings.wallThicknessMm}mm</span>
                        </button>

                        {/* Line Tool */}
                        <button
                            className={`cad-tool-btn ${activeCadTool === 'line' ? 'active' : ''}`}
                            onClick={() => setActiveCadTool('line')}
                            title="基準線・直線"
                        >
                            <div className="btn-icon-wrapper">
                                <Minus size={20} />
                            </div>
                            <span className="tool-title">直線</span>
                            <span className="tool-sub">芯線・補助線</span>
                        </button>

                        {/* Rect Tool */}
                        <button
                            className={`cad-tool-btn ${activeCadTool === 'rect' ? 'active' : ''}`}
                            onClick={() => setActiveCadTool('rect')}
                            title="四角・部屋外枠"
                        >
                            <div className="btn-icon-wrapper">
                                <Square size={20} />
                            </div>
                            <span className="tool-title">部屋矩形</span>
                            <span className="tool-sub">外枠一括</span>
                        </button>

                        {/* Fixture Stamp Tool */}
                        <button
                            className={`cad-tool-btn ${activeCadTool === 'fixture' ? 'active' : ''}`}
                            onClick={() => setActiveCadTool('fixture')}
                            title="建具スタンプ (扉・窓・設備)"
                        >
                            <div className="btn-icon-wrapper">
                                <Stamp size={20} />
                            </div>
                            <span className="tool-title">建具スタンプ</span>
                            <span className="tool-sub">{activeDef?.name || '建具選択'}</span>
                        </button>

                        {/* Room Label Tool */}
                        <button
                            className={`cad-tool-btn ${activeCadTool === 'room' ? 'active' : ''}`}
                            onClick={() => setActiveCadTool('room')}
                            title="部屋名・帖数タグ"
                        >
                            <div className="btn-icon-wrapper">
                                <Tag size={20} />
                            </div>
                            <span className="tool-title">部屋名</span>
                            <span className="tool-sub">{activeRoomName}</span>
                        </button>

                        {/* Pan Tool */}
                        <button
                            className={`cad-tool-btn ${activeCadTool === 'pan' ? 'active' : ''}`}
                            onClick={() => setActiveCadTool('pan')}
                            title="画面移動 (パン)"
                        >
                            <div className="btn-icon-wrapper">
                                <Hand size={20} />
                            </div>
                            <span className="tool-title">画面移動</span>
                            <span className="tool-sub">ドラッグ移動</span>
                        </button>
                    </div>

                    {/* Context Controls: Select mode guidance */}
                    {activeCadTool === 'select' && (
                        <div className="cad-context-box">
                            <div className="context-title">
                                <span>選択・移動モード</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                線や建具をクリックして選択します。<br />
                                選択した要素をドラッグして移動できます。<br />
                                画面上のボタンやキーで操作：<br />
                                • <strong>ドラッグ</strong>: 位置移動<br />
                                • <strong>Delete / BS</strong>: 削除<br />
                                • <strong>Esc</strong>: 選択解除
                            </div>
                        </div>
                    )}

                    {/* Context Controls: Fixture Controls when Fixture Tool is active */}
                    {activeCadTool === 'fixture' && (
                        <div className="cad-context-box">
                            <div className="context-title">
                                <span>選択建具</span>
                                <button className="open-drawer-btn" onClick={onOpenFixtureDrawer}>
                                    一覧変更 <ChevronRight size={14} />
                                </button>
                            </div>

                            <div className="current-fixture-card" onClick={onOpenFixtureDrawer}>
                                <span className="current-name">{activeDef?.name}</span>
                                <span className="current-size">
                                    {activeDef?.defaultWidthMm} × {activeDef?.defaultDepthMm}mm
                                </span>
                            </div>

                            <div className="fixture-quick-actions">
                                <button className="quick-action-btn" onClick={onRotateFixture} title="90度回転">
                                    <RotateCw size={16} />
                                    <span>{fixtureRotation}°回転</span>
                                </button>
                                <button
                                    className={`quick-action-btn ${fixtureFlipH ? 'active' : ''}`}
                                    onClick={onFlipFixtureH}
                                    title="左右反転"
                                >
                                    <FlipHorizontal size={16} />
                                    <span>左右反転</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Context Controls: Room presets when Room Tool is active */}
                    {activeCadTool === 'room' && (
                        <div className="cad-context-box">
                            <div className="context-title">
                                <span>部屋名クイック選択</span>
                            </div>
                            <div className="room-preset-chips">
                                {COMMON_ROOM_PRESETS.map((room) => (
                                    <button
                                        key={room.name}
                                        className={`room-chip ${activeRoomName === room.name ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveRoomName(room.name);
                                            setActiveTatami(room.defaultTatami);
                                        }}
                                    >
                                        {room.name}
                                    </button>
                                ))}
                            </div>
                            <div className="tatami-input-row">
                                <span>帖数:</span>
                                {[4.5, 6, 8, 10, 16].map((tatami) => (
                                    <button
                                        key={tatami}
                                        className={`tatami-pill ${activeTatami === tatami ? 'active' : ''}`}
                                        onClick={() => setActiveTatami(tatami)}
                                    >
                                        {tatami}帖
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Wall Thickness Selector when Wall Tool is active */}
                    {activeCadTool === 'wall' && (
                        <div className="cad-context-box">
                            <div className="context-title">
                                <span>壁厚設定</span>
                            </div>
                            <div className="wall-thickness-pills">
                                {[100, 120, 150].map((th) => (
                                    <button
                                        key={th}
                                        className={`th-pill ${settings.wallThicknessMm === th ? 'active' : ''}`}
                                        onClick={() => setSettings((prev) => ({ ...prev, wallThicknessMm: th }))}
                                    >
                                        {th}mm {th === 120 ? '(標準)' : ''}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
};
