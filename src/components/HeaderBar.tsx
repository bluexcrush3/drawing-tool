import React from 'react';
import {
    Undo2,
    Redo2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Settings as SettingsIcon,
    Download,
    FolderOpen,
    Trash2,
    Magnet,
} from 'lucide-react';
import type { Settings, ViewportTransform } from '../types/drawing';

interface HeaderBarProps {
    projectTitle: string;
    setProjectTitle: (t: string) => void;
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    viewport: ViewportTransform;
    setViewport: React.Dispatch<React.SetStateAction<ViewportTransform>>;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onClearLayer: () => void;
    onOpenSettings: () => void;
    onOpenExport: () => void;
    onOpenFile: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    projectTitle,
    setProjectTitle,
    settings,
    setSettings,
    viewport,
    setViewport,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onClearLayer,
    onOpenSettings,
    onOpenExport,
    onOpenFile,
}) => {
    const zoomIn = () => {
        setViewport((prev) => ({ ...prev, zoom: Math.min(prev.zoom * 1.25, 0.5) }));
    };

    const zoomOut = () => {
        setViewport((prev) => ({ ...prev, zoom: Math.max(prev.zoom * 0.8, 0.01) }));
    };

    const resetView = () => {
        setViewport({ panX: 120, panY: 80, zoom: 0.05 });
    };

    const toggleSnap = () => {
        setSettings((prev) => ({ ...prev, snapEnabled: !prev.snapEnabled }));
    };

    return (
        <header className="header-bar">
            {/* Left: App Logo & Editable Title */}
            <div className="header-left">
                <div className="app-logo">
                    <span className="logo-badge">まどり</span>
                    <span className="logo-text">CAD Pad</span>
                </div>
                <input
                    type="text"
                    className="title-input"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="図面タイトルを入力"
                    title="クリックして図面名を編集"
                />
                <div className="status-badges">
                    <span className="badge scale-badge">縮尺 1:{settings.scale}</span>
                    <span className="badge grid-badge">{settings.gridModuleMm}mm 尺モジュール</span>
                    <button
                        className={`badge snap-toggle-badge ${settings.snapEnabled ? 'active' : ''}`}
                        onClick={toggleSnap}
                        title="グリッド吸着 (スナップ) のON/OFF"
                    >
                        <Magnet size={14} />
                        <span>吸着 {settings.snapEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                </div>
            </div>

            {/* Center: Undo / Redo / Zoom */}
            <div className="header-center">
                <div className="btn-group">
                    <button
                        className="header-icon-btn"
                        onClick={onUndo}
                        disabled={!canUndo}
                        title="元に戻す (Undo)"
                    >
                        <Undo2 size={20} />
                    </button>
                    <button
                        className="header-icon-btn"
                        onClick={onRedo}
                        disabled={!canRedo}
                        title="やり直す (Redo)"
                    >
                        <Redo2 size={20} />
                    </button>
                </div>

                <div className="btn-group">
                    <button className="header-icon-btn" onClick={zoomOut} title="縮小">
                        <ZoomOut size={18} />
                    </button>
                    <span className="zoom-text">{Math.round(viewport.zoom * 1000)}%</span>
                    <button className="header-icon-btn" onClick={zoomIn} title="拡大">
                        <ZoomIn size={18} />
                    </button>
                    <button className="header-icon-btn" onClick={resetView} title="全体表示 (リセット)">
                        <Maximize2 size={18} />
                    </button>
                </div>
            </div>

            {/* Right: Layer Clear, Open, Settings, Export */}
            <div className="header-right">
                <button className="action-btn outline-btn" onClick={onClearLayer} title="現在のレイヤーを消去">
                    <Trash2 size={16} />
                    <span>レイヤー消去</span>
                </button>

                <button className="action-btn outline-btn" onClick={onOpenFile} title="プロジェクトファイルを開く">
                    <FolderOpen size={16} />
                    <span>開く</span>
                </button>

                <button className="action-btn outline-btn" onClick={onOpenSettings} title="詳細設定 (縮尺・モジュール・ペン)">
                    <SettingsIcon size={16} />
                    <span>設定</span>
                </button>

                <button className="action-btn primary-btn export-trigger" onClick={onOpenExport} title="CAD (DXF/SVG/PNG) 出力">
                    <Download size={18} />
                    <span>図面出力</span>
                </button>
            </div>
        </header>
    );
};
