import React from 'react';
import { PenTool, Highlighter, Eraser, Palette } from 'lucide-react';
import type { HandToolType, PenPreset } from '../types/drawing';

interface PenPaletteProps {
    activeHandTool: HandToolType;
    setActiveHandTool?: (t: HandToolType) => void;
    activePenPresetId: string;
    selectPenPreset: (id: string) => void;
    penPresets: PenPreset[];
    penColor: string;
    setPenColor: (c: string) => void;
    penWidth: number;
    setPenWidth: (w: number) => void;
    eraserWidth: number;
    setEraserWidth: (w: number) => void;
}

const QUICK_COLORS = ['#1a1f2c', '#2563eb', '#dc2626', '#16a34a', '#ea580c', '#eab308'];

export const PenPalette: React.FC<PenPaletteProps> = ({
    activeHandTool,
    activePenPresetId,
    selectPenPreset,
    penPresets,
    penColor,
    setPenColor,
    penWidth,
    setPenWidth,
    eraserWidth,
    setEraserWidth,
}) => {
    return (
        <div className="pen-palette-container">
            <div className="palette-section-title">
                <PenTool size={14} />
                <span>ペンプリセット (1タップ切替)</span>
            </div>

            {/* 1-Tap Quick Presets */}
            <div className="pen-preset-grid">
                {penPresets.map((preset) => {
                    const isSelected = activePenPresetId === preset.id;
                    return (
                        <button
                            key={preset.id}
                            className={`preset-btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => selectPenPreset(preset.id)}
                            title={`${preset.name} (${preset.width}mm)`}
                        >
                            <div className="preset-color-indicator" style={{ backgroundColor: preset.color }}>
                                {preset.tool === 'highlighter' && <Highlighter size={12} color="#ffffff" />}
                                {preset.tool === 'eraser' && <Eraser size={12} color="#334155" />}
                            </div>
                            <span className="preset-name">{preset.name}</span>
                        </button>
                    );
                })}
            </div>

            {/* Color Swatches */}
            {activeHandTool !== 'eraser' && (
                <div className="color-swatch-row">
                    <Palette size={14} className="swatch-icon" />
                    {QUICK_COLORS.map((c) => (
                        <button
                            key={c}
                            className={`color-dot ${penColor === c ? 'active' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setPenColor(c)}
                            title={c}
                        />
                    ))}
                </div>
            )}

            {/* Thickness Quick Selector */}
            <div className="size-slider-row">
                <span className="size-label">
                    {activeHandTool === 'eraser' ? '消しゴム径:' : '線の太さ:'}
                </span>
                {activeHandTool === 'eraser' ? (
                    <div className="quick-size-pills">
                        {[100, 200, 400].map((size) => (
                            <button
                                key={size}
                                className={`size-pill ${eraserWidth === size ? 'active' : ''}`}
                                onClick={() => setEraserWidth(size)}
                            >
                                {size}mm
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="quick-size-pills">
                        {[20, 35, 50, 90].map((size) => (
                            <button
                                key={size}
                                className={`size-pill ${penWidth === size ? 'active' : ''}`}
                                onClick={() => setPenWidth(size)}
                            >
                                {size}mm
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
