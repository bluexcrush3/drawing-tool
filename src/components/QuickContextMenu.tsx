import React, { useEffect, useRef, useState } from 'react';
import {
    Edit3,
    Compass,
    Square,
    Minus,
    Stamp,
    Tag,
    Hand,
    MousePointer,
    RotateCw,
    FlipHorizontal,
    X,
    Eraser,
    Highlighter,
    Pen,
    Check,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import type { CadToolType, HandToolType, LayerType, PenPreset } from '../types/drawing';
import { FIXTURE_LIBRARY } from '../constants/fixtureLibrary';

export interface QuickMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    // Layer
    activeLayer: LayerType;
    onSelectLayer: (layer: LayerType) => void;
    // CAD Tools
    activeCadTool: CadToolType;
    onSelectCadTool: (tool: CadToolType) => void;
    // Fixtures
    activeFixtureId: string;
    fixtureRotation: number;
    fixtureFlipH: boolean;
    fixtureFlipV?: boolean;
    onSelectFixture: (fixtureId: string) => void;
    onRotateFixture: () => void;
    onFlipFixtureH: () => void;
    onOpenFixtureDrawer: () => void;
    // Pens
    activeHandTool: HandToolType;
    onSelectHandTool: (tool: HandToolType) => void;
    penPresets: PenPreset[];
    activePenPresetId: string;
    onSelectPenPreset: (id: string) => void;
    penColor: string;
    onSelectPenColor: (color: string) => void;
}

// 9 Most Common Fixtures for speed stamping
const COMMON_FIXTURE_IDS = [
    'door_single',
    'door_sliding_single',
    'door_sliding_double',
    'window_sliding',
    'window_sweep',
    'toilet',
    'kitchen',
    'washbasin',
    'unit_bath',
];

const QUICK_COLORS = [
    { color: '#0f172a', name: '墨黒', ring: '#475569' },
    { color: '#2563eb', name: '青 (メモ)', ring: '#60a5fa' },
    { color: '#dc2626', name: '赤 (指示)', ring: '#f87171' },
    { color: '#16a34a', name: '緑 (確認)', ring: '#4ade80' },
    { color: '#eab308', name: '黄 (蛍光)', ring: '#fde047' },
    { color: '#9333ea', name: '紫 (修正)', ring: '#c084fc' },
];

export const QuickContextMenu: React.FC<QuickMenuProps> = ({
    isOpen,
    position,
    onClose,
    activeLayer,
    onSelectLayer,
    activeCadTool,
    onSelectCadTool,
    activeFixtureId,
    fixtureRotation,
    fixtureFlipH,
    fixtureFlipV = false,
    onSelectFixture,
    onRotateFixture,
    onFlipFixtureH,
    onOpenFixtureDrawer,
    activeHandTool,
    onSelectHandTool,
    penPresets,
    activePenPresetId,
    onSelectPenPreset,
    penColor,
    onSelectPenColor,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [overrideSubTab, setOverrideSubTab] = useState<'tools' | 'fixtures' | null>(null);
    const cadSubTab = overrideSubTab ?? (activeCadTool === 'fixture' ? 'fixtures' : 'tools');

    // Close on click outside or Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (e: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Boundary constraints: ensure menu doesn't overflow screen
    const menuWidth = 370;
    const menuHeight = 520;
    const left = Math.min(Math.max(12, position.x - menuWidth / 2), window.innerWidth - menuWidth - 12);
    const top = Math.min(Math.max(12, position.y - 20), window.innerHeight - menuHeight - 12);

    const commonFixtures = FIXTURE_LIBRARY.filter((f) => COMMON_FIXTURE_IDS.includes(f.id));

    return (
        <div
            ref={menuRef}
            className="quick-menu-backdrop"
            style={{
                position: 'fixed',
                left: `${left}px`,
                top: `${top}px`,
                zIndex: 1000,
            }}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="quick-menu-card"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Title, Mode Pill and Close Button */}
                <div className="quick-menu-header">
                    <div className="quick-menu-title-group">
                        <div className="quick-menu-icon-badge">
                            <Sparkles size={16} className="sparkle-icon" />
                        </div>
                        <div>
                            <div className="quick-menu-heading">クイック作図メニュー</div>
                            <div className="quick-menu-subheading">ペン/タッチ操作対応 HUD</div>
                        </div>
                    </div>
                    <button
                        className="quick-menu-close-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        title="閉じる (Esc)"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Layer Selector Twin Pills */}
                <div className="quick-layer-pill-container">
                    <button
                        className={`quick-layer-pill rough ${activeLayer === 'rough' ? 'selected' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectLayer('rough');
                        }}
                    >
                        <div className="pill-icon-box">
                            <Edit3 size={17} />
                        </div>
                        <div className="pill-text-block">
                            <span className="pill-title">手書き下書き</span>
                            <span className="pill-hint">吸着なし・フリーハンド</span>
                        </div>
                        {activeLayer === 'rough' && <Check size={16} className="pill-check-icon" />}
                    </button>

                    <button
                        className={`quick-layer-pill cad ${activeLayer === 'cad' ? 'selected' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectLayer('cad');
                        }}
                    >
                        <div className="pill-icon-box">
                            <Compass size={17} />
                        </div>
                        <div className="pill-text-block">
                            <span className="pill-title">CAD清書</span>
                            <span className="pill-hint">グリッド吸着・正確作図</span>
                        </div>
                        {activeLayer === 'cad' && <Check size={16} className="pill-check-icon" />}
                    </button>
                </div>

                {/* Content Section: CAD vs Rough */}
                {activeLayer === 'cad' ? (
                    <div className="quick-menu-body">
                        {/* CAD Sub-Tabs: 作図ツール / 建具スタンプ */}
                        <div className="quick-cad-subtabs">
                            <button
                                className={`subtab-btn ${cadSubTab === 'tools' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOverrideSubTab('tools');
                                }}
                            >
                                <span>🛠️ 作図ツール</span>
                            </button>
                            <button
                                className={`subtab-btn ${cadSubTab === 'fixtures' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOverrideSubTab('fixtures');
                                    onSelectCadTool('fixture');
                                    // Keep menu open for fixture selection!
                                }}
                            >
                                <span>🚪 建具スタンプ</span>
                            </button>
                        </div>

                        {cadSubTab === 'tools' ? (
                            /* CAD Tools Grid */
                            <div className="quick-tools-panel">
                                <div className="quick-tile-grid">
                                    {/* 1. Select & Move Tool */}
                                    <button
                                        className={`quick-tile ${activeCadTool === 'select' ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCadTool('select');
                                            onClose();
                                        }}
                                    >
                                        <div className="tile-icon-wrap select-glow">
                                            <MousePointer size={22} />
                                        </div>
                                        <div className="tile-info">
                                            <span className="tile-title">選択・移動</span>
                                            <span className="tile-desc">配置後の修正</span>
                                        </div>
                                    </button>

                                    {/* 2. Wall Tool */}
                                    <button
                                        className={`quick-tile ${activeCadTool === 'wall' ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCadTool('wall');
                                            onClose();
                                        }}
                                    >
                                        <div className="tile-icon-wrap wall-glow">
                                            <Square size={22} />
                                        </div>
                                        <div className="tile-info">
                                            <span className="tile-title">壁ツール</span>
                                            <span className="tile-desc">柱間ピッチ吸着</span>
                                        </div>
                                    </button>

                                    {/* 3. Fixture Stamp Tool -> DOES NOT CLOSE MENU, opens fixture picker! */}
                                    <button
                                        className={`quick-tile ${activeCadTool === 'fixture' ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCadTool('fixture');
                                            setOverrideSubTab('fixtures');
                                            // Keep open so user can pick fixture!
                                        }}
                                    >
                                        <div className="tile-icon-wrap fixture-glow">
                                            <Stamp size={22} />
                                        </div>
                                        <div className="tile-info">
                                            <span className="tile-title">建具スタンプ</span>
                                            <span className="tile-desc">ドア・窓・設備を選択</span>
                                        </div>
                                    </button>

                                    {/* 4. Rect Tool */}
                                    <button
                                        className={`quick-tile ${activeCadTool === 'rect' ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCadTool('rect');
                                            onClose();
                                        }}
                                    >
                                        <div className="tile-icon-wrap rect-glow">
                                            <Square size={22} />
                                        </div>
                                        <div className="tile-info">
                                            <span className="tile-title">四角枠 (部屋)</span>
                                            <span className="tile-desc">ドラッグで部屋枠</span>
                                        </div>
                                    </button>

                                    {/* 5. Line Tool */}
                                    <button
                                        className={`quick-tile ${activeCadTool === 'line' ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCadTool('line');
                                            onClose();
                                        }}
                                    >
                                        <div className="tile-icon-wrap line-glow">
                                            <Minus size={22} />
                                        </div>
                                        <div className="tile-info">
                                            <span className="tile-title">直線</span>
                                            <span className="tile-desc">間仕切り・区切り</span>
                                        </div>
                                    </button>

                                    {/* 6. Room Tag */}
                                    <button
                                        className={`quick-tile ${activeCadTool === 'room' ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCadTool('room');
                                            onClose();
                                        }}
                                    >
                                        <div className="tile-icon-wrap room-glow">
                                            <Tag size={22} />
                                        </div>
                                        <div className="tile-info">
                                            <span className="tile-title">部屋名・帖数</span>
                                            <span className="tile-desc">居室タグ配置</span>
                                        </div>
                                    </button>

                                    {/* 7. Pan Tool */}
                                    <button
                                        className={`quick-tile ${activeCadTool === 'pan' ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCadTool('pan');
                                            onClose();
                                        }}
                                    >
                                        <div className="tile-icon-wrap pan-glow">
                                            <Hand size={22} />
                                        </div>
                                        <div className="tile-info">
                                            <span className="tile-title">移動 (パン)</span>
                                            <span className="tile-desc">画面スクロール</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Fixtures Panel */
                            <div className="quick-fixtures-panel">
                                {/* Transform quick actions for selected fixture */}
                                <div className="quick-fixture-ops-bar">
                                    <div className="ops-label">建具の向き調整:</div>
                                    <div className="ops-buttons">
                                        <button
                                            className="quick-op-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRotateFixture();
                                            }}
                                            title="90°回転"
                                        >
                                            <RotateCw size={15} />
                                            <span>回転 ({fixtureRotation}°)</span>
                                        </button>
                                        <button
                                            className={`quick-op-btn ${fixtureFlipH ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onFlipFixtureH();
                                            }}
                                            title="左右反転"
                                        >
                                            <FlipHorizontal size={15} />
                                            <span>反転 {fixtureFlipH ? 'ON' : ''}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Common Fixtures Grid */}
                                <div className="quick-fixtures-grid">
                                    {commonFixtures.map((fixture) => {
                                        const isSelected =
                                            activeCadTool === 'fixture' && activeFixtureId === fixture.id;
                                        return (
                                            <button
                                                key={fixture.id}
                                                className={`fixture-quick-card ${isSelected ? 'selected' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectCadTool('fixture');
                                                    onSelectFixture(fixture.id);
                                                    onClose();
                                                }}
                                            >
                                                <div className="fixture-svg-box">
                                                    <svg
                                                        viewBox="-600 -600 1200 1200"
                                                        className="fixture-mini-svg"
                                                    >
                                                        {/* Synchronized rotation and flip with live orientation */}
                                                        <g
                                                            transform={`rotate(${fixtureRotation}) scale(${fixtureFlipH ? -1 : 1}, ${fixtureFlipV ? -1 : 1})`}
                                                        >
                                                            {fixture.geometry.map((geom, idx) => {
                                                                if (geom.type === 'line' && geom.p1 && geom.p2) {
                                                                    return (
                                                                        <line
                                                                            key={idx}
                                                                            x1={geom.p1.x * 750}
                                                                            y1={geom.p1.y * 750}
                                                                            x2={geom.p2.x * 750}
                                                                            y2={geom.p2.y * 750}
                                                                            stroke="#38bdf8"
                                                                            strokeWidth={geom.dashed ? 45 : 60}
                                                                            strokeDasharray={geom.dashed ? '80,50' : undefined}
                                                                        />
                                                                    );
                                                                } else if (geom.type === 'rect' && geom.rect) {
                                                                    return (
                                                                        <rect
                                                                            key={idx}
                                                                            x={geom.rect.x * 750}
                                                                            y={geom.rect.y * 750}
                                                                            width={geom.rect.w * 750}
                                                                            height={geom.rect.h * 750}
                                                                            fill={geom.filled ? '#38bdf8' : 'none'}
                                                                            stroke="#38bdf8"
                                                                            strokeWidth={50}
                                                                        />
                                                                    );
                                                                } else if (geom.type === 'arc' && geom.center && geom.radius) {
                                                                    const cx = geom.center.x * 750;
                                                                    const cy = geom.center.y * 750;
                                                                    const r = geom.radius * 750;
                                                                    const sA = geom.startAngle || 0;
                                                                    const eA = geom.endAngle || Math.PI / 2;
                                                                    const x1 = cx + r * Math.cos(sA);
                                                                    const y1 = cy + r * Math.sin(sA);
                                                                    const x2 = cx + r * Math.cos(eA);
                                                                    const y2 = cy + r * Math.sin(eA);
                                                                    return (
                                                                        <path
                                                                            key={idx}
                                                                            d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                                                                            fill="none"
                                                                            stroke="#60a5fa"
                                                                            strokeWidth={50}
                                                                            strokeDasharray="60,40"
                                                                        />
                                                                    );
                                                                } else if (geom.type === 'circle' && geom.center && geom.radius) {
                                                                    return (
                                                                        <circle
                                                                            key={idx}
                                                                            cx={geom.center.x * 750}
                                                                            cy={geom.center.y * 750}
                                                                            r={geom.radius * 750}
                                                                            fill="none"
                                                                            stroke="#38bdf8"
                                                                            strokeWidth={50}
                                                                        />
                                                                    );
                                                                }
                                                                return null;
                                                            })}
                                                        </g>
                                                    </svg>
                                                </div>
                                                <span className="fixture-quick-name">{fixture.name}</span>
                                                {isSelected && <Check size={14} className="fixture-check-badge" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    className="quick-open-library-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenFixtureDrawer();
                                        onClose();
                                    }}
                                >
                                    <Stamp size={16} />
                                    <span>建具ライブラリ全一覧を開く...</span>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Hand-Drawn Mode Section */
                    <div className="quick-menu-body">
                        {/* 4 Large Tool Pills */}
                        <div className="quick-hand-tools-grid">
                            <button
                                className={`quick-hand-btn ${activeHandTool === 'pen' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectHandTool('pen');
                                }}
                            >
                                <Pen size={18} />
                                <span>通常ペン</span>
                            </button>
                            <button
                                className={`quick-hand-btn ${activeHandTool === 'highlighter' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectHandTool('highlighter');
                                }}
                            >
                                <Highlighter size={18} />
                                <span>蛍光ペン</span>
                            </button>
                            <button
                                className={`quick-hand-btn ${activeHandTool === 'eraser' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectHandTool('eraser');
                                }}
                            >
                                <Eraser size={18} />
                                <span>消しゴム</span>
                            </button>
                            <button
                                className={`quick-hand-btn ${activeCadTool === 'select' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCadTool('select');
                                    onClose();
                                }}
                            >
                                <MousePointer size={18} />
                                <span>選択・移動</span>
                            </button>
                        </div>

                        {/* Pen Preset Cards */}
                        <div className="quick-subheading-bar">ペンプリセット</div>
                        <div className="quick-presets-vertical">
                            {penPresets.map((preset) => {
                                const isCurrent = activePenPresetId === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        className={`quick-preset-row ${isCurrent ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectPenPreset(preset.id);
                                            onClose();
                                        }}
                                    >
                                        <div
                                            className="preset-preview-line"
                                            style={{
                                                backgroundColor: preset.color,
                                                height: `${Math.max(2, Math.min(10, preset.width / 5))}px`,
                                            }}
                                        />
                                        <div className="preset-meta-block">
                                            <span className="preset-name">{preset.name}</span>
                                            <span className="preset-badge">{preset.width}mm</span>
                                        </div>
                                        {isCurrent && <Check size={16} className="preset-check" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Large Color Swatches */}
                        <div className="quick-subheading-bar">クイックカラー</div>
                        <div className="quick-colors-row">
                            {QUICK_COLORS.map((c) => {
                                const isSelected = penColor === c.color;
                                return (
                                    <button
                                        key={c.color}
                                        className={`quick-color-bubble ${isSelected ? 'selected' : ''}`}
                                        style={{
                                            backgroundColor: c.color,
                                            boxShadow: isSelected ? `0 0 12px ${c.ring}` : undefined,
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectPenColor(c.color);
                                            if (activeHandTool === 'eraser') onSelectHandTool('pen');
                                        }}
                                        title={c.name}
                                    >
                                        {isSelected && (
                                            <Check
                                                size={16}
                                                color={c.color === '#0f172a' ? '#ffffff' : '#0f172a'}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer Hint */}
                <div className="quick-menu-footer">
                    <span>💡 画面タップまたは [Esc] キーで閉じます</span>
                </div>
            </div>
        </div>
    );
};
