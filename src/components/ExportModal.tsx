import React, { useState } from 'react';
import { X, Download, FileCode, Check, Layers, AlertCircle } from 'lucide-react';
import type { CADElement, HandStroke, Settings } from '../types/drawing';
import { generateDXF } from '../utils/dxfExporter';
import { generateSVG } from '../utils/svgExporter';
import { exportToPNG, downloadDataUrl, downloadText } from '../utils/imageExporter';
import { saveProjectToFile } from '../utils/fileIO';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectTitle: string;
    settings: Settings;
    cadElements: CADElement[];
    roughStrokes: HandStroke[];
    onGetFullProject: () => any;
}

type ExportFormat = 'dxf' | 'svg' | 'png' | 'json';
type ExportLayerScope = 'cad_only' | 'rough_only' | 'merged';

export const ExportModal: React.FC<ExportModalProps> = ({
    isOpen,
    onClose,
    projectTitle,
    settings,
    cadElements,
    roughStrokes,
    onGetFullProject,
}) => {
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('dxf');
    const [layerScope, setLayerScope] = useState<ExportLayerScope>('cad_only');
    const [includeGrid, setIncludeGrid] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);

    if (!isOpen) return null;

    const handleDownload = async () => {
        setIsExporting(true);
        const dateStr = new Date().toISOString().slice(0, 10);
        const safeTitle = projectTitle.replace(/[\\/:*?"<>|]/g, '_') || '図面';

        try {
            const includeCad = layerScope === 'cad_only' || layerScope === 'merged';
            const includeRough = layerScope === 'rough_only' || layerScope === 'merged';

            if (selectedFormat === 'dxf') {
                const dxfContent = generateDXF(cadElements, roughStrokes, {
                    includeCad,
                    includeRough,
                    drawingTitle: projectTitle,
                    scale: settings.scale,
                });
                const filename = `${safeTitle}_${layerScope}_${dateStr}.dxf`;
                downloadText(dxfContent, filename, 'application/dxf');
            } else if (selectedFormat === 'svg') {
                const svgContent = generateSVG(cadElements, roughStrokes, settings, {
                    includeCad,
                    includeRough,
                    includeGrid,
                });
                const filename = `${safeTitle}_${layerScope}_${dateStr}.svg`;
                downloadText(svgContent, filename, 'image/svg+xml');
            } else if (selectedFormat === 'png') {
                const dataUrl = await exportToPNG(cadElements, roughStrokes, settings, {
                    includeCad,
                    includeRough,
                    includeGrid,
                    resolutionScale: 2,
                });
                const filename = `${safeTitle}_${layerScope}_${dateStr}.png`;
                downloadDataUrl(dataUrl, filename);
            } else if (selectedFormat === 'json') {
                const project = onGetFullProject();
                saveProjectToFile(project, `${safeTitle}_${dateStr}.madori`);
            }

            setExportSuccess(true);
            setTimeout(() => {
                setExportSuccess(false);
                onClose();
            }, 1200);
        } catch (err) {
            alert('出力処理中にエラーが発生しました: ' + (err as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card export-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title-wrap">
                        <Download size={22} className="modal-icon" />
                        <div>
                            <h2>図面形式ファイル出力</h2>
                            <p className="modal-subtitle">
                                レイヤー単位（CADのみ・下書きのみ）または結合して各種図面形式でダウンロードできます
                            </p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* STEP 1: レイヤー選択 (ユーザー指定の最重要機能) */}
                    <div className="export-section">
                        <label className="section-step-label">
                            <Layers size={16} />
                            <span>STEP 1: 出力対象レイヤーを選択</span>
                        </label>
                        <div className="layer-scope-selector">
                            <button
                                className={`scope-card ${layerScope === 'cad_only' ? 'selected' : ''}`}
                                onClick={() => setLayerScope('cad_only')}
                            >
                                <div className="scope-badge badge-cad">CADレイヤーのみ</div>
                                <div className="scope-title">正確な線 (CAD清書)</div>
                                <div className="scope-desc">
                                    壁、建具、寸法線、部屋名のみ出力。建築CADや申請書類向け
                                </div>
                                <div className="scope-count">CAD要素: {cadElements.length}件</div>
                            </button>

                            <button
                                className={`scope-card ${layerScope === 'rough_only' ? 'selected' : ''}`}
                                onClick={() => setLayerScope('rough_only')}
                            >
                                <div className="scope-badge badge-rough">下書きレイヤーのみ</div>
                                <div className="scope-title">手書き下書き (フリーハンド)</div>
                                <div className="scope-desc">
                                    手書きスケッチの線のみ出力。現場メモや初期構想の共有用
                                </div>
                                <div className="scope-count">手書きストローク: {roughStrokes.length}件</div>
                            </button>

                            <button
                                className={`scope-card ${layerScope === 'merged' ? 'selected' : ''}`}
                                onClick={() => setLayerScope('merged')}
                            >
                                <div className="scope-badge badge-merged">全レイヤー結合</div>
                                <div className="scope-title">CAD ＋ 下書き 結合出力</div>
                                <div className="scope-desc">
                                    手書き下書きとCAD図面を合成した状態ですべて出力
                                </div>
                                <div className="scope-count">合計: {cadElements.length + roughStrokes.length}件</div>
                            </button>
                        </div>
                    </div>

                    {/* STEP 2: ファイル形式選択 */}
                    <div className="export-section">
                        <label className="section-step-label">
                            <FileCode size={16} />
                            <span>STEP 2: 出力ファイル形式を選択</span>
                        </label>
                        <div className="format-grid">
                            {/* DXF */}
                            <div
                                className={`format-card ${selectedFormat === 'dxf' ? 'selected' : ''}`}
                                onClick={() => setSelectedFormat('dxf')}
                            >
                                <div className="format-card-header">
                                    <span className="format-ext">DXF</span>
                                    <span className="format-tag tag-cad">CAD標準</span>
                                    {selectedFormat === 'dxf' && <Check size={16} className="check-mark" />}
                                </div>
                                <div className="format-name">AutoCAD / Jw_cad 互換</div>
                                <div className="format-desc">
                                    mm実寸・レイヤー情報（WALL, FIXTURE, ROUGH）付きの業界標準CADファイル
                                </div>
                            </div>

                            {/* SVG */}
                            <div
                                className={`format-card ${selectedFormat === 'svg' ? 'selected' : ''}`}
                                onClick={() => setSelectedFormat('svg')}
                            >
                                <div className="format-card-header">
                                    <span className="format-ext">SVG</span>
                                    <span className="format-tag tag-vector">ベクター</span>
                                    {selectedFormat === 'svg' && <Check size={16} className="check-mark" />}
                                </div>
                                <div className="format-name">SVG ベクター図面</div>
                                <div className="format-desc">
                                    拡大しても劣化しないベクターデータ。IllustratorやWebでそのまま活用可能
                                </div>
                            </div>

                            {/* PNG */}
                            <div
                                className={`format-card ${selectedFormat === 'png' ? 'selected' : ''}`}
                                onClick={() => setSelectedFormat('png')}
                            >
                                <div className="format-card-header">
                                    <span className="format-ext">PNG</span>
                                    <span className="format-tag tag-raster">高画質画像</span>
                                    {selectedFormat === 'png' && <Check size={16} className="check-mark" />}
                                </div>
                                <div className="format-name">高解像度 PNG 画像</div>
                                <div className="format-desc">
                                    プレゼン資料、施主提示用、チャット添付に最適な印刷用高精細画像
                                </div>
                            </div>

                            {/* JSON */}
                            <div
                                className={`format-card ${selectedFormat === 'json' ? 'selected' : ''}`}
                                onClick={() => setSelectedFormat('json')}
                            >
                                <div className="format-card-header">
                                    <span className="format-ext">JSON</span>
                                    <span className="format-tag tag-project">プロジェクト保存</span>
                                    {selectedFormat === 'json' && <Check size={16} className="check-mark" />}
                                </div>
                                <div className="format-name">プロジェクトファイル (.madori)</div>
                                <div className="format-desc">
                                    いつでも本ツールに再読み込みして編集を再開できる完全データ
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 3: オプション設定 */}
                    {(selectedFormat === 'svg' || selectedFormat === 'png') && (
                        <div className="export-section">
                            <label className="section-step-label">
                                <span>出力オプション</span>
                            </label>
                            <div className="export-options-row">
                                <label className="toggle-item">
                                    <input
                                        type="checkbox"
                                        checked={includeGrid}
                                        onChange={(e) => setIncludeGrid(e.target.checked)}
                                    />
                                    <span>背景の方眼グリッドを含める</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Status info */}
                    <div className="export-summary-box">
                        <AlertCircle size={16} />
                        <span>
                            出力先: <strong>{selectedFormat.toUpperCase()}</strong> / 対象:{' '}
                            <strong>
                                {layerScope === 'cad_only'
                                    ? 'CADレイヤーのみ'
                                    : layerScope === 'rough_only'
                                        ? '下書きレイヤーのみ'
                                        : '全レイヤー結合'}
                            </strong>{' '}
                            / 縮尺: <strong>1:{settings.scale}</strong>
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="cancel-btn outline-btn" onClick={onClose}>
                        キャンセル
                    </button>
                    <button
                        className="confirm-btn primary-btn export-action-btn"
                        onClick={handleDownload}
                        disabled={isExporting}
                    >
                        <Download size={18} />
                        <span>{isExporting ? '生成中...' : exportSuccess ? '出力完了！' : 'ダウンロード'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
