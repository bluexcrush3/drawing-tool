import React from 'react';
import { X, Sliders, Monitor, Grid, Ruler, PenTool, Check, RotateCcw, FileText } from 'lucide-react';
import type { PenPreset, Settings, TabletPreset, PaperSize } from '../types/drawing';
import { TABLET_PRESETS, DEFAULT_SETTINGS, DEFAULT_PEN_PRESETS, PAPER_PRESETS } from '../constants/defaultSettings';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    penPresets: PenPreset[];
    setPenPresets: React.Dispatch<React.SetStateAction<PenPreset[]>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    settings,
    setSettings,
    penPresets,
    setPenPresets,
}) => {
    if (!isOpen) return null;

    const handlePaperSizeChange = (paperSize: PaperSize) => {
        const info = PAPER_PRESETS[paperSize];
        setSettings((prev) => ({
            ...prev,
            paperSize,
            canvasWidthMm: info.sheetWidthMm,
            canvasHeightMm: info.sheetHeightMm,
        }));
    };

    const handleTabletPresetChange = (preset: TabletPreset) => {
        const info = TABLET_PRESETS[preset];
        setSettings((prev) => ({
            ...prev,
            tabletPreset: preset,
            canvasWidthMm: info.recommendedWidthMm,
            canvasHeightMm: info.recommendedHeightMm,
        }));
    };

    const handleScaleChange = (scale: number) => {
        setSettings((prev) => ({ ...prev, scale }));
    };

    const handleGridModuleChange = (gridModuleMm: number) => {
        setSettings((prev) => ({ ...prev, gridModuleMm }));
    };

    const handlePenWidthChange = (presetId: string, width: number) => {
        setPenPresets((prev) =>
            prev.map((p) => (p.id === presetId ? { ...p, width: Math.max(5, width) } : p))
        );
    };

    const handleResetDefaults = () => {
        if (window.confirm('設定をデフォルト（初期値）に戻しますか？')) {
            setSettings(DEFAULT_SETTINGS);
            setPenPresets(DEFAULT_PEN_PRESETS);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card settings-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title-wrap">
                        <Sliders size={22} className="modal-icon" />
                        <div>
                            <h2>作図・環境設定</h2>
                            <p className="modal-subtitle">
                                タブレットサイズ、図面縮尺、グリッドモジュール、ペンの太さを自由に調整できます
                            </p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    {/* SECTION: 用紙サイズ選択 (A4 / A3) */}
                    <div className="settings-section">
                        <div className="section-head">
                            <FileText size={18} />
                            <h3>図面用紙サイズ (規格選択)</h3>
                        </div>
                        <div className="preset-radio-grid">
                            {(['A4', 'A3'] as PaperSize[]).map((key) => {
                                const info = PAPER_PRESETS[key];
                                const isSelected = settings.paperSize === key;
                                return (
                                    <div
                                        key={key}
                                        className={`setting-choice-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handlePaperSizeChange(key)}
                                    >
                                        <div className="card-top-row">
                                            <span className="choice-name">{info.name}</span>
                                            {isSelected && <Check size={16} className="check-mark" />}
                                        </div>
                                        <span className="choice-desc">{info.description}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 1: タブレット・キャンバス端末サイズ */}
                    <div className="settings-section">
                        <div className="section-head">
                            <Monitor size={18} />
                            <h3>タブレットサイズ・作図領域</h3>
                        </div>
                        <div className="preset-radio-grid">
                            {(Object.keys(TABLET_PRESETS) as TabletPreset[]).map((key) => {
                                const info = TABLET_PRESETS[key];
                                const isSelected = settings.tabletPreset === key;
                                return (
                                    <div
                                        key={key}
                                        className={`setting-choice-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleTabletPresetChange(key)}
                                    >
                                        <div className="card-top-row">
                                            <span className="choice-name">{info.name}</span>
                                            {isSelected && <Check size={16} className="check-mark" />}
                                        </div>
                                        <span className="choice-desc">
                                            作図領域: {(info.recommendedWidthMm / 1000).toFixed(1)}m ×{' '}
                                            {(info.recommendedHeightMm / 1000).toFixed(1)}m
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {settings.tabletPreset === 'custom' && (
                            <div className="custom-dim-row">
                                <label>
                                    <span>横幅 (mm):</span>
                                    <input
                                        type="number"
                                        value={settings.canvasWidthMm}
                                        onChange={(e) =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                canvasWidthMm: parseInt(e.target.value) || 20000,
                                            }))
                                        }
                                    />
                                </label>
                                <label>
                                    <span>縦幅 (mm):</span>
                                    <input
                                        type="number"
                                        value={settings.canvasHeightMm}
                                        onChange={(e) =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                canvasHeightMm: parseInt(e.target.value) || 15000,
                                            }))
                                        }
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: 縮尺 & モジュール設定 */}
                    <div className="settings-section">
                        <div className="section-head">
                            <Ruler size={18} />
                            <h3>図面縮尺 (スケール) & グリッドモジュール</h3>
                        </div>
                        <div className="form-grid-2col">
                            {/* Scale selector */}
                            <div className="form-group">
                                <label className="form-label">図面縮尺 (Scale)</label>
                                <div className="pill-selector">
                                    {[50, 100, 30, 200].map((s) => (
                                        <button
                                            key={s}
                                            className={`pill-choice ${settings.scale === s ? 'active' : ''}`}
                                            onClick={() => handleScaleChange(s)}
                                        >
                                            1:{s} {s === 100 ? '(標準)' : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Module selector */}
                            <div className="form-group">
                                <label className="form-label">グリッド基準モジュール</label>
                                <div className="pill-selector">
                                    {[
                                        { mm: 910, label: '910mm (尺モジュール)' },
                                        { mm: 1000, label: '1000mm (メーター)' },
                                        { mm: 455, label: '455mm (半間)' },
                                    ].map((m) => (
                                        <button
                                            key={m.mm}
                                            className={`pill-choice ${settings.gridModuleMm === m.mm ? 'active' : ''}`}
                                            onClick={() => handleGridModuleChange(m.mm)}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sub-divisions & Snapping Sensitivity */}
                        <div className="form-grid-2col" style={{ marginTop: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">
                                    サブグリッド分割 (455mm/500mmの補助線)
                                </label>
                                <div className="pill-selector">
                                    {[
                                        { div: 1, label: 'なし (1モジュール毎)' },
                                        { div: 2, label: '2分割 (半分単位)' },
                                        { div: 4, label: '4分割 (細密)' },
                                    ].map((d) => (
                                        <button
                                            key={d.div}
                                            className={`pill-choice ${settings.subDivisions === d.div ? 'active' : ''}`}
                                            onClick={() => setSettings((prev) => ({ ...prev, subDivisions: d.div }))}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    マグネット吸着 (スナップ) 感度: {settings.snapThresholdPx}px
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="40"
                                    step="2"
                                    value={settings.snapThresholdPx}
                                    onChange={(e) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            snapThresholdPx: parseInt(e.target.value),
                                        }))
                                    }
                                    className="range-input"
                                />
                                <div className="range-hints">
                                    <span>弱め (10px)</span>
                                    <span>強め (40px)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: ペンサイズ設定 */}
                    <div className="settings-section">
                        <div className="section-head">
                            <PenTool size={18} />
                            <h3>ペンの太さ・サイズ詳細設定 (mm換算)</h3>
                        </div>
                        <div className="pen-setting-list">
                            {penPresets.map((preset) => (
                                <div key={preset.id} className="pen-setting-row">
                                    <div className="pen-info">
                                        <span
                                            className="pen-color-dot"
                                            style={{ backgroundColor: preset.color }}
                                        />
                                        <span className="pen-name">{preset.name}</span>
                                    </div>
                                    <div className="pen-slider-wrap">
                                        <input
                                            type="range"
                                            min={preset.tool === 'highlighter' ? 100 : preset.tool === 'eraser' ? 50 : 10}
                                            max={preset.tool === 'highlighter' ? 500 : preset.tool === 'eraser' ? 600 : 150}
                                            step="5"
                                            value={preset.width}
                                            onChange={(e) =>
                                                handlePenWidthChange(preset.id, parseInt(e.target.value))
                                            }
                                            className="range-input"
                                        />
                                        <span className="width-badge">{preset.width} mm</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECTION 4: タブレット操作・利き手 */}
                    <div className="settings-section">
                        <div className="section-head">
                            <Grid size={18} />
                            <h3>UI・タブレット操作性</h3>
                        </div>
                        <div className="form-grid-2col">
                            <div className="form-group">
                                <label className="form-label">ツールバー利き手配置</label>
                                <div className="pill-selector">
                                    <button
                                        className={`pill-choice ${settings.handedness === 'right' ? 'active' : ''}`}
                                        onClick={() => setSettings((prev) => ({ ...prev, handedness: 'right' }))}
                                    >
                                        右手操作 (右側ドック)
                                    </button>
                                    <button
                                        className={`pill-choice ${settings.handedness === 'left' ? 'active' : ''}`}
                                        onClick={() => setSettings((prev) => ({ ...prev, handedness: 'left' }))}
                                    >
                                        左手操作 (左側ドック)
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">作図表示オプション</label>
                                <div className="toggle-list">
                                    <label className="toggle-item">
                                        <input
                                            type="checkbox"
                                            checked={settings.showGrid}
                                            onChange={(e) =>
                                                setSettings((prev) => ({ ...prev, showGrid: e.target.checked }))
                                            }
                                        />
                                        <span>方眼グリッドを表示</span>
                                    </label>
                                    <label className="toggle-item">
                                        <input
                                            type="checkbox"
                                            checked={settings.palmRejection}
                                            onChange={(e) =>
                                                setSettings((prev) => ({ ...prev, palmRejection: e.target.checked }))
                                            }
                                        />
                                        <span>パームガード (スタイラス優先)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="reset-btn outline-btn" onClick={handleResetDefaults}>
                        <RotateCcw size={16} />
                        <span>初期設定に戻す</span>
                    </button>
                    <button className="confirm-btn primary-btn" onClick={onClose}>
                        設定を適用して閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};
