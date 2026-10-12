import React from 'react';
import { Edit3, Compass, Eye, EyeOff, Lock, Unlock, Sliders } from 'lucide-react';
import type { LayerState, LayerType } from '../types/drawing';

interface LayerBarProps {
    activeLayer: LayerType;
    setActiveLayer: (layer: LayerType) => void;
    layerState: LayerState;
    setLayerState: React.Dispatch<React.SetStateAction<LayerState>>;
}

export const LayerBar: React.FC<LayerBarProps> = ({
    activeLayer,
    setActiveLayer,
    layerState,
    setLayerState,
}) => {
    const toggleRoughVisible = () => {
        setLayerState((prev) => ({ ...prev, roughVisible: !prev.roughVisible }));
    };

    const toggleCadVisible = () => {
        setLayerState((prev) => ({ ...prev, cadVisible: !prev.cadVisible }));
    };

    const toggleRoughLock = () => {
        setLayerState((prev) => ({ ...prev, roughLocked: !prev.roughLocked }));
    };

    const toggleCadLock = () => {
        setLayerState((prev) => ({ ...prev, cadLocked: !prev.cadLocked }));
    };

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setLayerState((prev) => ({ ...prev, roughOpacity: val }));
    };

    return (
        <div className="layer-bar-container">
            {/* Fast 1-Tap Dual-Layer Segmented Switcher */}
            <div className="layer-pill-selector">
                <button
                    className={`layer-pill-btn ${activeLayer === 'rough' ? 'active rough-active' : ''}`}
                    onClick={() => setActiveLayer('rough')}
                    title="手書き下書きレイヤーに切り替え"
                >
                    <Edit3 size={18} className="pill-icon" />
                    <div className="pill-text-block">
                        <span className="pill-main-title">手書き下書き</span>
                        <span className="pill-sub-title">フリーハンド・素描</span>
                    </div>
                    {activeLayer === 'rough' && <span className="active-dot dot-rough" />}
                </button>

                <button
                    className={`layer-pill-btn ${activeLayer === 'cad' ? 'active cad-active' : ''}`}
                    onClick={() => setActiveLayer('cad')}
                    title="正確なCADレイヤーに切り替え"
                >
                    <Compass size={18} className="pill-icon" />
                    <div className="pill-text-block">
                        <span className="pill-main-title">正確な線 (CAD)</span>
                        <span className="pill-sub-title">壁・建具スタンプ・清書</span>
                    </div>
                    {activeLayer === 'cad' && <span className="active-dot dot-cad" />}
                </button>
            </div>

            {/* Layer Visibility & Opacity Quick Controls */}
            <div className="layer-controls-panel">
                {/* Rough Layer Sub-controls */}
                <div className={`layer-sub-control ${activeLayer === 'rough' ? 'current' : ''}`}>
                    <span className="sub-label">下書き表示:</span>
                    <button
                        className={`icon-toggle-btn ${layerState.roughVisible ? 'active' : 'muted'}`}
                        onClick={toggleRoughVisible}
                        title={layerState.roughVisible ? '下書きを非表示' : '下書きを表示'}
                    >
                        {layerState.roughVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                        className={`icon-toggle-btn ${layerState.roughLocked ? 'locked' : ''}`}
                        onClick={toggleRoughLock}
                        title={layerState.roughLocked ? 'ロック解除' : '下書きをロック'}
                    >
                        {layerState.roughLocked ? <Lock size={15} /> : <Unlock size={15} />}
                    </button>
                    <div className="opacity-slider-wrap" title="下書き不透明度調整 (トレース時に便利)">
                        <Sliders size={14} className="slider-icon" />
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={layerState.roughOpacity}
                            onChange={handleOpacityChange}
                            className="layer-slider"
                        />
                        <span className="opacity-value">{Math.round(layerState.roughOpacity * 100)}%</span>
                    </div>
                </div>

                {/* CAD Layer Sub-controls */}
                <div className={`layer-sub-control ${activeLayer === 'cad' ? 'current' : ''}`}>
                    <span className="sub-label">CAD表示:</span>
                    <button
                        className={`icon-toggle-btn ${layerState.cadVisible ? 'active' : 'muted'}`}
                        onClick={toggleCadVisible}
                        title={layerState.cadVisible ? 'CAD線を非表示' : 'CAD線を表示'}
                    >
                        {layerState.cadVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                        className={`icon-toggle-btn ${layerState.cadLocked ? 'locked' : ''}`}
                        onClick={toggleCadLock}
                        title={layerState.cadLocked ? 'ロック解除' : 'CAD線をロック'}
                    >
                        {layerState.cadLocked ? <Lock size={15} /> : <Unlock size={15} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
