import React, { useState } from 'react';
import { RotateCw, FlipHorizontal, FlipVertical, X, Check } from 'lucide-react';
import { FIXTURE_LIBRARY } from '../constants/fixtureLibrary';
import type { FixtureCategory } from '../types/fixtures';

interface FixtureDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    activeFixtureId: string;
    onSelectFixture: (id: string) => void;
    fixtureRotation: number;
    onRotate: () => void;
    fixtureFlipH: boolean;
    onFlipH: () => void;
    fixtureFlipV: boolean;
    onFlipV: () => void;
}

const CATEGORIES: { id: FixtureCategory; label: string }[] = [
    { id: 'doors', label: '扉・ドア' },
    { id: 'windows', label: '窓・サッシ' },
    { id: 'openings', label: '開口部' },
    { id: 'facilities', label: '設備・水回り' },
];

export const FixtureDrawer: React.FC<FixtureDrawerProps> = ({
    isOpen,
    onClose,
    activeFixtureId,
    onSelectFixture,
    fixtureRotation,
    onRotate,
    fixtureFlipH,
    onFlipH,
    fixtureFlipV,
    onFlipV,
}) => {
    const [activeCategory, setActiveCategory] = useState<FixtureCategory>('doors');

    if (!isOpen) return null;

    const currentCategoryFixtures = FIXTURE_LIBRARY.filter((f) => f.category === activeCategory);
    const activeDef = FIXTURE_LIBRARY.find((f) => f.id === activeFixtureId);

    return (
        <div className="fixture-drawer-overlay" onClick={onClose}>
            <div className="fixture-drawer-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="fixture-drawer-header">
                    <div className="header-title-block">
                        <h3>建具スタンプライブラリ</h3>
                        <span className="header-subtitle">
                            図面にワンタップで配置。グリッドに自動吸着します
                        </span>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Orientation & Quick Transform Bar */}
                <div className="fixture-transform-bar">
                    <div className="selected-fixture-preview">
                        <span className="preview-label">選択中:</span>
                        <span className="preview-name">{activeDef?.name || '未選択'}</span>
                        <span className="preview-dim">
                            ({activeDef?.defaultWidthMm} × {activeDef?.defaultDepthMm}mm)
                        </span>
                    </div>

                    <div className="transform-actions">
                        <button className="transform-btn" onClick={onRotate} title="90度回転">
                            <RotateCw size={16} />
                            <span>回転 ({fixtureRotation}°)</span>
                        </button>
                        <button
                            className={`transform-btn ${fixtureFlipH ? 'active' : ''}`}
                            onClick={onFlipH}
                            title="左右反転"
                        >
                            <FlipHorizontal size={16} />
                            <span>左右反転</span>
                        </button>
                        <button
                            className={`transform-btn ${fixtureFlipV ? 'active' : ''}`}
                            onClick={onFlipV}
                            title="上下反転"
                        >
                            <FlipVertical size={16} />
                            <span>上下反転</span>
                        </button>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="fixture-category-tabs">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Fixture Grid Cards */}
                <div className="fixture-grid">
                    {currentCategoryFixtures.map((fixture) => {
                        const isSelected = activeFixtureId === fixture.id;
                        return (
                            <div
                                key={fixture.id}
                                className={`fixture-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                    onSelectFixture(fixture.id);
                                }}
                            >
                                <div className="card-top">
                                    <span className="card-name">{fixture.name}</span>
                                    {isSelected && <Check size={16} className="selected-check" />}
                                </div>
                                {/* SVG Schematic Preview */}
                                <div className="card-preview">
                                    <svg viewBox="-600 -600 1200 1200" className="preview-svg">
                                        {fixture.geometry.map((geom, idx) => {
                                            if (geom.type === 'line' && geom.p1 && geom.p2) {
                                                return (
                                                    <line
                                                        key={idx}
                                                        x1={geom.p1.x * 800}
                                                        y1={geom.p1.y * 800}
                                                        x2={geom.p2.x * 800}
                                                        y2={geom.p2.y * 800}
                                                        stroke="#0f172a"
                                                        strokeWidth={geom.dashed ? 30 : 40}
                                                        strokeDasharray={geom.dashed ? '60,40' : undefined}
                                                    />
                                                );
                                            } else if (geom.type === 'rect' && geom.rect) {
                                                return (
                                                    <rect
                                                        key={idx}
                                                        x={geom.rect.x * 800}
                                                        y={geom.rect.y * 800}
                                                        width={geom.rect.w * 800}
                                                        height={geom.rect.h * 800}
                                                        fill={geom.filled ? '#0f172a' : 'none'}
                                                        stroke="#0f172a"
                                                        strokeWidth={35}
                                                    />
                                                );
                                            } else if (geom.type === 'arc' && geom.center && geom.radius) {
                                                const cx = geom.center.x * 800;
                                                const cy = geom.center.y * 800;
                                                const r = geom.radius * 800;
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
                                                        stroke="#2563eb"
                                                        strokeWidth={35}
                                                        strokeDasharray="50,30"
                                                    />
                                                );
                                            } else if (geom.type === 'circle' && geom.center && geom.radius) {
                                                return (
                                                    <circle
                                                        key={idx}
                                                        cx={geom.center.x * 800}
                                                        cy={geom.center.y * 800}
                                                        r={geom.radius * 800}
                                                        fill="none"
                                                        stroke="#0f172a"
                                                        strokeWidth={35}
                                                    />
                                                );
                                            }
                                            return null;
                                        })}
                                    </svg>
                                </div>
                                <div className="card-meta">
                                    <span className="card-size">
                                        W:{fixture.defaultWidthMm} D:{fixture.defaultDepthMm}
                                    </span>
                                    <span className="card-desc">{fixture.description}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="fixture-drawer-footer">
                    <button className="confirm-btn primary-btn" onClick={onClose}>
                        この建具を選択して作図へ
                    </button>
                </div>
            </div>
        </div>
    );
};
