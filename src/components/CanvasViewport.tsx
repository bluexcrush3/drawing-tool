import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    RotateCw,
    FlipHorizontal,
    Trash2,
    X,
} from 'lucide-react';
import type {
    CADElement,
    CadToolType,
    HandStroke,
    HandToolType,
    LayerState,
    LayerType,
    PenPreset,
    Point,
    Settings,
    ViewportTransform,
    WallElement,
    LineElement,
    RectElement,
    FixtureElement,
    RoomElement,
} from '../types/drawing';
import { FIXTURE_LIBRARY } from '../constants/fixtureLibrary';
import {
    worldToScreen,
    screenToWorld,
    getMagneticSnap,
    distance,
} from '../utils/coordinate';
import {
    hitTestCadElement,
    hitTestHandStroke,
    boxSelectCadElements,
    boxSelectStrokes,
    type BoxRegion,
} from '../utils/hitTest';
import { QuickContextMenu } from './QuickContextMenu';

// Helper to hit-test endpoints (p1 / p2) of lines, walls, dimensions, and rects
const getHitHandle = (
    screenPt: Point,
    element: CADElement,
    viewportTransform: ViewportTransform,
    hitRadiusPx = 20
): 'p1' | 'p2' | null => {
    if (
        element.type === 'wall' ||
        element.type === 'line' ||
        element.type === 'dimension' ||
        element.type === 'rect'
    ) {
        const p1Scr = worldToScreen(element.p1, viewportTransform);
        const p2Scr = worldToScreen(element.p2, viewportTransform);
        const d1 = Math.hypot(screenPt.x - p1Scr.x, screenPt.y - p1Scr.y);
        const d2 = Math.hypot(screenPt.x - p2Scr.x, screenPt.y - p2Scr.y);

        if (d1 <= hitRadiusPx && d1 <= d2) return 'p1';
        if (d2 <= hitRadiusPx) return 'p2';
    }
    return null;
};

interface CanvasViewportProps {
    settings: Settings;
    activeLayer: LayerType;
    layerState: LayerState;
    roughStrokes: HandStroke[];
    cadElements: CADElement[];
    activeHandTool: 'pen' | 'highlighter' | 'eraser';
    penColor: string;
    penWidth: number;
    eraserWidth: number;
    activeCadTool: 'wall' | 'line' | 'rect' | 'fixture' | 'dimension' | 'room' | 'select' | 'pan';
    activeFixtureId: string;
    fixtureRotation: number;
    fixtureFlipH: boolean;
    fixtureFlipV: boolean;
    activeRoomName: string;
    activeTatami: number;
    viewport: ViewportTransform;
    setViewport: React.Dispatch<React.SetStateAction<ViewportTransform>>;
    onAddStroke: (stroke: HandStroke) => void;
    onUpdateStroke?: (stroke: HandStroke, recordHistory?: boolean) => void;
    onRemoveStroke?: (strokeId: string) => void;
    onClearStrokesByEraser: (point: Point, radiusMm: number) => void;
    onAddCadElement: (element: CADElement) => void;
    onUpdateCadElement?: (element: CADElement, recordHistory?: boolean) => void;
    onRemoveCadElement?: (elementId: string) => void;
    onUpdateMultipleCadElements?: (elements: CADElement[], recordHistory?: boolean) => void;
    onUpdateMultipleStrokes?: (strokes: HandStroke[], recordHistory?: boolean) => void;
    onRemoveMultipleItems?: (cadIds: string[], strokeIds?: string[]) => void;
    onPushHistory?: () => void;
    // Quick Context Menu callbacks & states
    onSelectLayer?: (layer: LayerType) => void;
    onSelectCadTool?: (tool: CadToolType) => void;
    onSelectFixture?: (fixtureId: string) => void;
    onRotateFixture?: () => void;
    onFlipFixtureH?: () => void;
    onOpenFixtureDrawer?: () => void;
    onSelectHandTool?: (tool: HandToolType) => void;
    penPresets?: PenPreset[];
    activePenPresetId?: string;
    onSelectPenPreset?: (id: string) => void;
    onSelectPenColor?: (color: string) => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
    settings,
    activeLayer,
    layerState,
    roughStrokes,
    cadElements,
    activeHandTool,
    penColor,
    penWidth,
    eraserWidth,
    activeCadTool,
    activeFixtureId,
    fixtureRotation,
    fixtureFlipH,
    fixtureFlipV,
    activeRoomName,
    activeTatami,
    viewport,
    setViewport,
    onAddStroke,
    onUpdateStroke,
    onRemoveStroke,
    onClearStrokesByEraser,
    onAddCadElement,
    onUpdateCadElement,
    onRemoveCadElement,
    onUpdateMultipleCadElements,
    onUpdateMultipleStrokes,
    onRemoveMultipleItems,
    onPushHistory,
    onSelectLayer,
    onSelectCadTool,
    onSelectFixture,
    onRotateFixture,
    onFlipFixtureH,
    onOpenFixtureDrawer,
    onSelectHandTool,
    penPresets = [],
    activePenPresetId = '',
    onSelectPenPreset,
    onSelectPenColor,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const roughCanvasRef = useRef<HTMLCanvasElement>(null);
    const cadCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

    // Interaction State
    const [isInteracting, setIsInteracting] = useState(false);
    const [cursorWorld, setCursorWorld] = useState<Point>({ x: 0, y: 0 });
    const [snappedCursor, setSnappedCursor] = useState<Point>({ x: 0, y: 0 });
    const [isSnapped, setIsSnapped] = useState(false);

    // Selection Mode State (Single & Multi-selection)
    const [selectedItems, setSelectedItems] = useState<Array<{ id: string; type: 'cad' | 'stroke' }>>([]);
    const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null;

    const [hoveredItem, setHoveredItem] = useState<{ id: string; type: 'cad' | 'stroke' } | null>(null);
    const [hoveredHandle, setHoveredHandle] = useState<'p1' | 'p2' | null>(null);
    const dragHandleTarget = useRef<'p1' | 'p2' | null>(null);
    const dragStartWorld = useRef<Point | null>(null);
    const dragOriginalCad = useRef<CADElement | null>(null);
    const dragOriginalStroke = useRef<HandStroke | null>(null);
    const dragOriginalCadMap = useRef<Map<string, CADElement>>(new Map());
    const dragOriginalStrokesMap = useRef<Map<string, HandStroke>>(new Map());
    const isDraggingSelected = useRef(false);

    // Marquee Box Selection State
    const isMarqueeSelecting = useRef(false);
    const marqueeStartWorld = useRef<Point | null>(null);
    const marqueeCurrentWorld = useRef<Point | null>(null);

    // Quick Context Menu State
    const [contextMenuState, setContextMenuState] = useState<{ isOpen: boolean; pos: Point }>({
        isOpen: false,
        pos: { x: 0, y: 0 },
    });

    // Keyboard shortcuts for selection mode (Single & Batch)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedItems.length === 0) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const cadIds = selectedItems.filter((i) => i.type === 'cad').map((i) => i.id);
                const strokeIds = selectedItems.filter((i) => i.type === 'stroke').map((i) => i.id);

                if (onRemoveMultipleItems) {
                    onRemoveMultipleItems(cadIds, strokeIds);
                } else {
                    cadIds.forEach((id) => onRemoveCadElement?.(id));
                    strokeIds.forEach((id) => onRemoveStroke?.(id));
                }
                setSelectedItems([]);
                setHoveredHandle(null);
            } else if (e.key === 'Escape') {
                setSelectedItems([]);
                setHoveredHandle(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItems, onRemoveMultipleItems, onRemoveCadElement, onRemoveStroke]);

    // Active Drawing references
    const currentStrokePoints = useRef<{ x: number; y: number; pressure?: number }[]>([]);
    const startCadPoint = useRef<Point | null>(null);
    const isPanning = useRef(false);
    const panStart = useRef<Point>({ x: 0, y: 0 });
    const initialViewport = useRef<ViewportTransform>({ panX: 0, panY: 0, zoom: 1 });
    const lastPinchDist = useRef<number | null>(null);
    const lastTouchCenter = useRef<Point | null>(null);
    const isTwoFingerGesturing = useRef<boolean>(false);
    const lastTwoFingerGestureEndTime = useRef<number>(0);
    const activeDrawingPointerId = useRef<number | null>(null);

    // Collect candidate snap points from existing CAD elements
    const getCandidateSnapPoints = useCallback((): Point[] => {
        const points: Point[] = [];
        for (const el of cadElements) {
            if (el.type === 'wall' || el.type === 'line') {
                points.push(el.p1, el.p2);
                // Add midpoint
                points.push({ x: (el.p1.x + el.p2.x) / 2, y: (el.p1.y + el.p2.y) / 2 });
            } else if (el.type === 'rect') {
                points.push(
                    el.p1,
                    { x: el.p2.x, y: el.p1.y },
                    el.p2,
                    { x: el.p1.x, y: el.p2.y }
                );
            } else if (el.type === 'fixture') {
                points.push(el.position);
            }
        }
        return points;
    }, [cadElements]);

    const renderAllRef = useRef<() => void>(() => { });

    // Resize canvases
    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const canvases = [
                bgCanvasRef.current,
                roughCanvasRef.current,
                cadCanvasRef.current,
                overlayCanvasRef.current,
            ];
            canvases.forEach((c) => {
                if (c) {
                    c.width = rect.width * dpr;
                    c.height = rect.height * dpr;
                    c.style.width = `${rect.width}px`;
                    c.style.height = `${rect.height}px`;
                    const ctx = c.getContext('2d');
                    if (ctx) ctx.scale(dpr, dpr);
                }
            });
            renderAllRef.current();
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 1. Render Background & Grid
    const renderBackground = useCallback(() => {
        const canvas = bgCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();

        ctx.clearRect(0, 0, rect.width, rect.height);

        // Canvas background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Draw Architectural Sheet boundary
        const sheetTopLeft = worldToScreen({ x: 0, y: 0 }, viewport);
        const sheetBottomRight = worldToScreen(
            { x: settings.canvasWidthMm, y: settings.canvasHeightMm },
            viewport
        );
        const sheetW = sheetBottomRight.x - sheetTopLeft.x;
        const sheetH = sheetBottomRight.y - sheetTopLeft.y;

        // Sheet shadow and paper
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sheetTopLeft.x, sheetTopLeft.y, sheetW, sheetH);
        ctx.restore();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(sheetTopLeft.x, sheetTopLeft.y, sheetW, sheetH);

        // Draw Grid (if enabled)
        if (settings.showGrid) {
            const stepMm = settings.gridModuleMm;
            const subStepMm = stepMm / (settings.subDivisions > 0 ? settings.subDivisions : 1);

            // Sub-grid lines (faint)
            ctx.strokeStyle = '#f1f5f9';
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            for (let x = 0; x <= settings.canvasWidthMm; x += subStepMm) {
                const p1 = worldToScreen({ x, y: 0 }, viewport);
                const p2 = worldToScreen({ x, y: settings.canvasHeightMm }, viewport);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            }
            for (let y = 0; y <= settings.canvasHeightMm; y += subStepMm) {
                const p1 = worldToScreen({ x: 0, y }, viewport);
                const p2 = worldToScreen({ x: settings.canvasWidthMm, y }, viewport);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            }
            ctx.stroke();

            // Main grid lines (Module, e.g. 910mm)
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            for (let x = 0; x <= settings.canvasWidthMm; x += stepMm) {
                const p1 = worldToScreen({ x, y: 0 }, viewport);
                const p2 = worldToScreen({ x, y: settings.canvasHeightMm }, viewport);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            }
            for (let y = 0; y <= settings.canvasHeightMm; y += stepMm) {
                const p1 = worldToScreen({ x: 0, y }, viewport);
                const p2 = worldToScreen({ x: settings.canvasWidthMm, y }, viewport);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            }
            ctx.stroke();

            // Grid Intersection Crosses (Architectural aesthetic)
            if (viewport.zoom > 0.03) {
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1;
                const tick = 4;
                ctx.beginPath();
                for (let x = 0; x <= settings.canvasWidthMm; x += stepMm) {
                    for (let y = 0; y <= settings.canvasHeightMm; y += stepMm) {
                        const p = worldToScreen({ x, y }, viewport);
                        ctx.moveTo(p.x - tick, p.y);
                        ctx.lineTo(p.x + tick, p.y);
                        ctx.moveTo(p.x, p.y - tick);
                        ctx.lineTo(p.x, p.y + tick);
                    }
                }
                ctx.stroke();
            }
        }

        // Sheet Border Inner Line & Info
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        const margin = 200 * viewport.zoom;
        ctx.strokeRect(
            sheetTopLeft.x + margin,
            sheetTopLeft.y + margin,
            sheetW - margin * 2,
            sheetH - margin * 2
        );

        // Sheet Title Stamp in bottom-right corner of sheet
        const isA3 = settings.paperSize === 'A3';
        const stampW = Math.max(140, 2600 * viewport.zoom);
        const stampH = Math.max(38, 700 * viewport.zoom);
        const stampX = sheetBottomRight.x - margin - stampW;
        const stampY = sheetBottomRight.y - margin - stampH;

        ctx.save();
        ctx.fillStyle = 'rgba(248, 250, 252, 0.95)';
        ctx.fillRect(stampX, stampY, stampW, stampH);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.strokeRect(stampX, stampY, stampW, stampH);

        const titleFontSize = Math.max(10, 220 * viewport.zoom);
        ctx.font = `bold ${titleFontSize}px sans-serif`;
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(
            `用紙: ${isA3 ? 'A3 横 (420×297mm)' : 'A4 横 (297×210mm)'}`,
            stampX + 8,
            stampY + 5
        );

        const subFontSize = Math.max(9, 170 * viewport.zoom);
        ctx.font = `${subFontSize}px sans-serif`;
        ctx.fillStyle = '#64748b';
        ctx.fillText(
            `縮尺: 1:${settings.scale} | ${settings.gridModuleMm}mm 尺モジュール`,
            stampX + 8,
            stampY + stampH - subFontSize - 5
        );
        ctx.restore();
    }, [settings, viewport]);

    // 2. Render Rough Hand-Drawn Layer
    const renderRoughLayer = useCallback(() => {
        const canvas = roughCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        if (!layerState.roughVisible) return;

        ctx.save();
        ctx.globalAlpha = layerState.roughOpacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const stroke of roughStrokes) {
            if (stroke.points.length < 2) continue;
            ctx.save();
            ctx.strokeStyle = stroke.tool === 'highlighter' ? '#eab308' : stroke.color;
            ctx.lineWidth = Math.max(1, stroke.width * viewport.zoom);
            ctx.globalAlpha = layerState.roughOpacity * stroke.opacity;

            ctx.beginPath();
            const p0 = worldToScreen(stroke.points[0], viewport);
            ctx.moveTo(p0.x, p0.y);

            for (let i = 1; i < stroke.points.length; i++) {
                const p1 = worldToScreen(stroke.points[i], viewport);
                ctx.lineTo(p1.x, p1.y);
            }
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }, [roughStrokes, layerState.roughVisible, layerState.roughOpacity, viewport]);

    // 3. Render CAD Layer
    const renderCadLayer = useCallback(() => {
        const canvas = cadCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        if (!layerState.cadVisible) return;

        for (const el of cadElements) {
            if (el.type === 'wall') {
                const p1 = worldToScreen(el.p1, viewport);
                const p2 = worldToScreen(el.p2, viewport);
                ctx.save();
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = Math.max(2, el.thickness * viewport.zoom);
                ctx.lineCap = 'square';
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.restore();
            } else if (el.type === 'line') {
                const p1 = worldToScreen(el.p1, viewport);
                const p2 = worldToScreen(el.p2, viewport);
                ctx.save();
                ctx.strokeStyle = el.color;
                ctx.lineWidth = Math.max(1, el.width * viewport.zoom);
                if (el.lineStyle === 'dashed') {
                    ctx.setLineDash([8, 4]);
                }
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.restore();
            } else if (el.type === 'rect') {
                const p1 = worldToScreen(el.p1, viewport);
                const p2 = worldToScreen(el.p2, viewport);
                const rx = Math.min(p1.x, p2.x);
                const ry = Math.min(p1.y, p2.y);
                const rw = Math.abs(p2.x - p1.x);
                const rh = Math.abs(p2.y - p1.y);
                ctx.save();
                if (el.filled) {
                    ctx.fillStyle = el.fillColor || '#f8fafc';
                    ctx.fillRect(rx, ry, rw, rh);
                }
                ctx.strokeStyle = el.strokeColor || '#0f172a';
                ctx.lineWidth = Math.max(2, 120 * viewport.zoom);
                ctx.strokeRect(rx, ry, rw, rh);
                ctx.restore();
            } else if (el.type === 'fixture') {
                const def = FIXTURE_LIBRARY.find((f) => f.id === el.fixtureId);
                if (def) {
                    const center = worldToScreen(el.position, viewport);
                    ctx.save();
                    ctx.translate(center.x, center.y);
                    ctx.rotate((el.rotation * Math.PI) / 180);
                    ctx.scale(el.flipH ? -1 : 1, el.flipV ? -1 : 1);
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = Math.max(1.5, 40 * viewport.zoom);

                    for (const geom of def.geometry) {
                        if (geom.type === 'line' && geom.p1 && geom.p2) {
                            const x1 = geom.p1.x * el.widthMm * viewport.zoom;
                            const y1 = geom.p1.y * el.depthMm * viewport.zoom;
                            const x2 = geom.p2.x * el.widthMm * viewport.zoom;
                            const y2 = geom.p2.y * el.depthMm * viewport.zoom;
                            ctx.save();
                            if (geom.dashed) ctx.setLineDash([6, 3]);
                            ctx.beginPath();
                            ctx.moveTo(x1, y1);
                            ctx.lineTo(x2, y2);
                            ctx.stroke();
                            ctx.restore();
                        } else if (geom.type === 'rect' && geom.rect) {
                            const x = geom.rect.x * el.widthMm * viewport.zoom;
                            const y = geom.rect.y * el.depthMm * viewport.zoom;
                            const w = geom.rect.w * el.widthMm * viewport.zoom;
                            const h = geom.rect.h * el.depthMm * viewport.zoom;
                            if (geom.filled) {
                                ctx.fillStyle = '#0f172a';
                                ctx.fillRect(x, y, w, h);
                            } else {
                                ctx.strokeRect(x, y, w, h);
                            }
                        } else if (geom.type === 'arc' && geom.center && geom.radius) {
                            const cx = geom.center.x * el.widthMm * viewport.zoom;
                            const cy = geom.center.y * el.depthMm * viewport.zoom;
                            const r = geom.radius * el.widthMm * viewport.zoom;
                            ctx.save();
                            ctx.strokeStyle = '#2563eb';
                            ctx.lineWidth = Math.max(1.5, 35 * viewport.zoom);
                            ctx.setLineDash([4, 2]);
                            ctx.beginPath();
                            ctx.arc(cx, cy, r, geom.startAngle || 0, geom.endAngle || Math.PI / 2);
                            ctx.stroke();
                            ctx.restore();
                        } else if (geom.type === 'circle' && geom.center && geom.radius) {
                            const cx = geom.center.x * el.widthMm * viewport.zoom;
                            const cy = geom.center.y * el.depthMm * viewport.zoom;
                            const r = geom.radius * el.widthMm * viewport.zoom;
                            ctx.beginPath();
                            ctx.arc(cx, cy, r, 0, Math.PI * 2);
                            ctx.stroke();
                        } else if (geom.type === 'text' && geom.text && geom.center) {
                            const tx = geom.center.x * el.widthMm * viewport.zoom;
                            const ty = geom.center.y * el.depthMm * viewport.zoom;
                            const fontSize = Math.max(10, 110 * viewport.zoom);
                            ctx.save();
                            ctx.font = `bold ${fontSize}px sans-serif`;
                            ctx.fillStyle = '#475569';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(geom.text, tx, ty);
                            ctx.restore();
                        }
                    }
                    ctx.restore();
                }
            } else if (el.type === 'dimension') {
                const p1 = worldToScreen(el.p1, viewport);
                const p2 = worldToScreen(el.p2, viewport);
                const dx = el.p2.x - el.p1.x;
                const dy = el.p2.y - el.p1.y;
                const len = Math.round(Math.sqrt(dx * dx + dy * dy));
                const mx = (p1.x + p2.x) / 2;
                const my = (p1.y + p2.y) / 2;
                ctx.save();
                ctx.strokeStyle = '#dc2626';
                ctx.fillStyle = '#dc2626';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
                ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2);
                ctx.fill();

                const fontSize = Math.max(11, 130 * viewport.zoom);
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(`${len}mm`, mx, my - 8);
                ctx.restore();
            } else if (el.type === 'room') {
                const pos = worldToScreen(el.position, viewport);
                ctx.save();
                ctx.translate(pos.x, pos.y);
                const boxW = Math.max(60, 600 * viewport.zoom);
                const boxH = Math.max(34, 340 * viewport.zoom);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.5;
                ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
                ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

                const nameSize = Math.max(12, 140 * viewport.zoom);
                ctx.fillStyle = '#0f172a';
                ctx.font = `bold ${nameSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.name, 0, el.tatami ? -boxH * 0.15 : 0);

                if (el.tatami) {
                    const subSize = Math.max(10, 110 * viewport.zoom);
                    ctx.fillStyle = '#64748b';
                    ctx.font = `${subSize}px sans-serif`;
                    ctx.fillText(`${el.tatami} 帖`, 0, boxH * 0.22);
                }
                ctx.restore();
            }
        }
    }, [cadElements, layerState.cadVisible, viewport]);

    // 4. Render Live Preview / Guides Overlay
    const renderOverlay = useCallback(() => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        const activePt = isSnapped ? snappedCursor : cursorWorld;
        const activeScreen = worldToScreen(activePt, viewport);

        // Magnetic Snap Target Indicator (CAD Mode only, not in select/pan)
        if (
            activeLayer === 'cad' &&
            isSnapped &&
            settings.snapEnabled &&
            activeCadTool !== 'pan' &&
            activeCadTool !== 'select'
        ) {
            ctx.save();
            ctx.strokeStyle = '#10b981'; // emerald green magnetic snap
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(activeScreen.x, activeScreen.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Outer animated ring
            ctx.beginPath();
            ctx.arc(activeScreen.x, activeScreen.y, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Hover Outline (when in CAD select mode and not selected)
        if (
            activeLayer === 'cad' &&
            activeCadTool === 'select' &&
            hoveredItem &&
            (!selectedItem || hoveredItem.id !== selectedItem.id)
        ) {
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);

            if (hoveredItem.type === 'cad') {
                const el = cadElements.find((e) => e.id === hoveredItem.id);
                if (el) {
                    if (el.type === 'wall' || el.type === 'line' || el.type === 'dimension') {
                        const p1 = worldToScreen(el.p1, viewport);
                        const p2 = worldToScreen(el.p2, viewport);
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    } else if (el.type === 'rect') {
                        const p1 = worldToScreen(el.p1, viewport);
                        const p2 = worldToScreen(el.p2, viewport);
                        const rx = Math.min(p1.x, p2.x);
                        const ry = Math.min(p1.y, p2.y);
                        const rw = Math.abs(p2.x - p1.x);
                        const rh = Math.abs(p2.y - p1.y);
                        ctx.strokeRect(rx, ry, rw, rh);
                    } else if (el.type === 'fixture') {
                        const scr = worldToScreen(el.position, viewport);
                        ctx.translate(scr.x, scr.y);
                        ctx.rotate((el.rotation * Math.PI) / 180);
                        const w = el.widthMm * viewport.zoom;
                        const d = el.depthMm * viewport.zoom;
                        ctx.strokeRect(-w / 2, -d / 2, w, d);
                    } else if (el.type === 'room') {
                        const scr = worldToScreen(el.position, viewport);
                        const boxW = Math.max(60, 600 * viewport.zoom);
                        const boxH = Math.max(34, 340 * viewport.zoom);
                        ctx.strokeRect(scr.x - boxW / 2, scr.y - boxH / 2, boxW, boxH);
                    }
                }
            } else if (hoveredItem.type === 'stroke') {
                const stroke = roughStrokes.find((s) => s.id === hoveredItem.id);
                if (stroke && stroke.points.length > 1) {
                    ctx.beginPath();
                    const p0 = worldToScreen(stroke.points[0], viewport);
                    ctx.moveTo(p0.x, p0.y);
                    for (let i = 1; i < stroke.points.length; i++) {
                        const pt = worldToScreen(stroke.points[i], viewport);
                        ctx.lineTo(pt.x, pt.y);
                    }
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        // 1. Draw Marquee Box Selection Overlay (drag across canvas to select multiple items)
        if (
            activeLayer === 'cad' &&
            isMarqueeSelecting.current &&
            marqueeStartWorld.current &&
            marqueeCurrentWorld.current
        ) {
            const startScr = worldToScreen(marqueeStartWorld.current, viewport);
            const curScr = worldToScreen(marqueeCurrentWorld.current, viewport);
            const rx = Math.min(startScr.x, curScr.x);
            const ry = Math.min(startScr.y, curScr.y);
            const rw = Math.abs(curScr.x - startScr.x);
            const rh = Math.abs(curScr.y - startScr.y);

            ctx.save();
            ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
            ctx.fillRect(rx, ry, rw, rh);

            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.strokeRect(rx, ry, rw, rh);

            const wMm = Math.round(Math.abs(marqueeCurrentWorld.current.x - marqueeStartWorld.current.x));
            const hMm = Math.round(Math.abs(marqueeCurrentWorld.current.y - marqueeStartWorld.current.y));
            if (rw > 35 && rh > 25) {
                const badgeText = `${wMm} × ${hMm} mm`;
                ctx.font = '500 11px sans-serif';
                const tw = ctx.measureText(badgeText).width;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.setLineDash([]);
                ctx.fillRect(rx + rw - tw - 14, ry + rh + 4, tw + 12, 18);
                ctx.fillStyle = '#38bdf8';
                ctx.fillText(badgeText, rx + rw - tw - 8, ry + rh + 17);
            }
            ctx.restore();
        }

        // 2. Draw Selection Highlights (Glowing Cyan Outline & Anchor Handles - CAD mode only)
        if (activeLayer === 'cad' && selectedItems.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#06b6d4';
            ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
            ctx.lineWidth = 2.5;

            const isSingle = selectedItems.length === 1;
            let multiMinX = Infinity,
                multiMaxX = -Infinity,
                multiMinY = Infinity,
                multiMaxY = -Infinity;

            selectedItems.forEach((item) => {
                if (item.type === 'cad') {
                    const el = cadElements.find((e) => e.id === item.id);
                    if (!el) return;

                    if (el.type === 'wall' || el.type === 'line' || el.type === 'dimension') {
                        const p1 = worldToScreen(el.p1, viewport);
                        const p2 = worldToScreen(el.p2, viewport);
                        multiMinX = Math.min(multiMinX, p1.x, p2.x);
                        multiMaxX = Math.max(multiMaxX, p1.x, p2.x);
                        multiMinY = Math.min(multiMinY, p1.y, p2.y);
                        multiMaxY = Math.max(multiMaxY, p1.y, p2.y);

                        ctx.setLineDash([6, 4]);
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();

                        // Endpoint handles only when single element is selected
                        if (isSingle) {
                            ctx.setLineDash([]);
                            [
                                { key: 'p1' as const, pt: p1 },
                                { key: 'p2' as const, pt: p2 },
                            ].forEach(({ key, pt }) => {
                                const isAct =
                                    (hoveredHandle === key && !isDraggingSelected.current) ||
                                    (isDraggingSelected.current && dragHandleTarget.current === key);
                                const radius = isAct ? 9 : 6;

                                ctx.beginPath();
                                ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
                                ctx.fillStyle = isAct ? '#2563eb' : '#06b6d4';
                                ctx.fill();
                                ctx.strokeStyle = '#ffffff';
                                ctx.lineWidth = 2.5;
                                ctx.stroke();

                                if (isAct) {
                                    ctx.beginPath();
                                    ctx.arc(pt.x, pt.y, radius + 4, 0, Math.PI * 2);
                                    ctx.strokeStyle = 'rgba(37, 99, 235, 0.45)';
                                    ctx.lineWidth = 2.5;
                                    ctx.stroke();
                                }
                            });

                            // Real-time length dimension badge on single selection
                            const dx = el.p2.x - el.p1.x;
                            const dy = el.p2.y - el.p1.y;
                            const distMm = Math.round(Math.sqrt(dx * dx + dy * dy));
                            const gridUnits = (distMm / settings.gridModuleMm).toFixed(1);
                            const mx = (p1.x + p2.x) / 2;
                            const my = (p1.y + p2.y) / 2;
                            const text = `${distMm}mm (${gridUnits}グリッド)`;
                            ctx.font = 'bold 11px sans-serif';
                            const tw = ctx.measureText(text).width;
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                            ctx.fillRect(mx - tw / 2 - 6, my - 22, tw + 12, 20);
                            ctx.fillStyle = '#ffffff';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(text, mx, my - 12);
                        }
                    } else if (el.type === 'rect') {
                        const p1 = worldToScreen(el.p1, viewport);
                        const p2 = worldToScreen(el.p2, viewport);
                        const rx = Math.min(p1.x, p2.x);
                        const ry = Math.min(p1.y, p2.y);
                        const rw = Math.abs(p2.x - p1.x);
                        const rh = Math.abs(p2.y - p1.y);
                        multiMinX = Math.min(multiMinX, rx);
                        multiMaxX = Math.max(multiMaxX, rx + rw);
                        multiMinY = Math.min(multiMinY, ry);
                        multiMaxY = Math.max(multiMaxY, ry + rh);

                        ctx.fillRect(rx, ry, rw, rh);
                        ctx.setLineDash([6, 4]);
                        ctx.strokeRect(rx, ry, rw, rh);

                        if (isSingle) {
                            ctx.setLineDash([]);
                            ctx.fillStyle = '#06b6d4';
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 2;
                            [
                                { x: rx, y: ry },
                                { x: rx + rw, y: ry },
                                { x: rx + rw, y: ry + rh },
                                { x: rx, y: ry + rh },
                            ].forEach((p) => {
                                ctx.beginPath();
                                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.stroke();
                            });
                        }
                    } else if (el.type === 'fixture') {
                        const scr = worldToScreen(el.position, viewport);
                        const w = el.widthMm * viewport.zoom;
                        const d = el.depthMm * viewport.zoom;
                        multiMinX = Math.min(multiMinX, scr.x - w / 2);
                        multiMaxX = Math.max(multiMaxX, scr.x + w / 2);
                        multiMinY = Math.min(multiMinY, scr.y - d / 2);
                        multiMaxY = Math.max(multiMaxY, scr.y + d / 2);

                        ctx.save();
                        ctx.translate(scr.x, scr.y);
                        ctx.rotate((el.rotation * Math.PI) / 180);
                        ctx.fillRect(-w / 2, -d / 2, w, d);
                        ctx.setLineDash([6, 4]);
                        ctx.strokeRect(-w / 2, -d / 2, w, d);

                        if (isSingle) {
                            ctx.setLineDash([]);
                            ctx.fillStyle = '#06b6d4';
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 2;
                            [
                                { x: -w / 2, y: -d / 2 },
                                { x: w / 2, y: -d / 2 },
                                { x: w / 2, y: d / 2 },
                                { x: -w / 2, y: d / 2 },
                                { x: 0, y: 0 },
                            ].forEach((p) => {
                                ctx.beginPath();
                                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.stroke();
                            });
                        }
                        ctx.restore();
                    } else if (el.type === 'room') {
                        const scr = worldToScreen(el.position, viewport);
                        const boxW = Math.max(60, 600 * viewport.zoom) + 12;
                        const boxH = Math.max(34, 340 * viewport.zoom) + 12;
                        multiMinX = Math.min(multiMinX, scr.x - boxW / 2);
                        multiMaxX = Math.max(multiMaxX, scr.x + boxW / 2);
                        multiMinY = Math.min(multiMinY, scr.y - boxH / 2);
                        multiMaxY = Math.max(multiMaxY, scr.y + boxH / 2);

                        ctx.setLineDash([6, 4]);
                        ctx.strokeRect(scr.x - boxW / 2, scr.y - boxH / 2, boxW, boxH);
                    }
                } else if (item.type === 'stroke') {
                    const stroke = roughStrokes.find((s) => s.id === item.id);
                    if (stroke && stroke.points.length > 1) {
                        let minX = Infinity,
                            maxX = -Infinity,
                            minY = Infinity,
                            maxY = -Infinity;
                        ctx.beginPath();
                        const p0 = worldToScreen(stroke.points[0], viewport);
                        ctx.moveTo(p0.x, p0.y);
                        for (const pt of stroke.points) {
                            const scr = worldToScreen(pt, viewport);
                            if (scr.x < minX) minX = scr.x;
                            if (scr.x > maxX) maxX = scr.x;
                            if (scr.y < minY) minY = scr.y;
                            if (scr.y > maxY) maxY = scr.y;
                        }
                        multiMinX = Math.min(multiMinX, minX - 10);
                        multiMaxX = Math.max(multiMaxX, maxX + 10);
                        multiMinY = Math.min(multiMinY, minY - 10);
                        multiMaxY = Math.max(multiMaxY, maxY + 10);

                        ctx.setLineDash([6, 4]);
                        ctx.strokeRect(minX - 10, minY - 10, maxX - minX + 20, maxY - minY + 20);
                    }
                }
            });

            // Outer Bounding Box for Multi-selection
            if (!isSingle && multiMinX < Infinity) {
                const pad = 12;
                const bx = multiMinX - pad;
                const by = multiMinY - pad;
                const bw = multiMaxX - multiMinX + pad * 2;
                const bh = multiMaxY - multiMinY + pad * 2;

                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(bx, by, bw, bh);

                // Badge at top of multi-select box
                const badge = `📐 ${selectedItems.length}個の要素を選択中 (ドラッグで一括移動)`;
                ctx.font = 'bold 11px sans-serif';
                const tw = ctx.measureText(badge).width;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.setLineDash([]);
                ctx.fillRect(bx + bw / 2 - tw / 2 - 8, by - 24, tw + 16, 20);
                ctx.fillStyle = '#38bdf8';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(badge, bx + bw / 2, by - 14);
            }

            ctx.restore();
        }

        // CAD Live Drawing Ghost / Rubberband
        if (activeLayer === 'cad' && !layerState.cadLocked) {
            if (activeCadTool === 'wall' && startCadPoint.current) {
                const p1 = worldToScreen(startCadPoint.current, viewport);
                const p2 = activeScreen;
                const dx = activePt.x - startCadPoint.current.x;
                const dy = activePt.y - startCadPoint.current.y;
                const distMm = Math.round(Math.sqrt(dx * dx + dy * dy));
                const gridUnits = (distMm / settings.gridModuleMm).toFixed(1);

                ctx.save();
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = Math.max(3, settings.wallThicknessMm * viewport.zoom);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();

                // Dimension Badge
                const mx = (p1.x + p2.x) / 2;
                const my = (p1.y + p2.y) / 2;
                const text = `${distMm}mm (${gridUnits}グリッド)`;
                ctx.font = 'bold 12px sans-serif';
                const tw = ctx.measureText(text).width;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.fillRect(mx - tw / 2 - 8, my - 24, tw + 16, 22);
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, mx, my - 13);
                ctx.restore();
            } else if (activeCadTool === 'line' && startCadPoint.current) {
                const p1 = worldToScreen(startCadPoint.current, viewport);
                const p2 = activeScreen;
                ctx.save();
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.restore();
            } else if (activeCadTool === 'rect' && startCadPoint.current) {
                const p1 = worldToScreen(startCadPoint.current, viewport);
                const p2 = activeScreen;
                const rx = Math.min(p1.x, p2.x);
                const ry = Math.min(p1.y, p2.y);
                const rw = Math.abs(p2.x - p1.x);
                const rh = Math.abs(p2.y - p1.y);
                ctx.save();
                ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 2;
                ctx.fillRect(rx, ry, rw, rh);
                ctx.strokeRect(rx, ry, rw, rh);
                ctx.restore();
            } else if (activeCadTool === 'fixture') {
                // Ghost Preview of the Fixture Stamp
                const def = FIXTURE_LIBRARY.find((f) => f.id === activeFixtureId);
                if (def) {
                    ctx.save();
                    ctx.translate(activeScreen.x, activeScreen.y);
                    ctx.rotate((fixtureRotation * Math.PI) / 180);
                    ctx.scale(fixtureFlipH ? -1 : 1, fixtureFlipV ? -1 : 1);
                    ctx.strokeStyle = '#2563eb';
                    ctx.lineWidth = Math.max(1.5, 40 * viewport.zoom);
                    ctx.globalAlpha = 0.75;

                    for (const geom of def.geometry) {
                        if (geom.type === 'line' && geom.p1 && geom.p2) {
                            ctx.beginPath();
                            ctx.moveTo(
                                geom.p1.x * def.defaultWidthMm * viewport.zoom,
                                geom.p1.y * def.defaultDepthMm * viewport.zoom
                            );
                            ctx.lineTo(
                                geom.p2.x * def.defaultWidthMm * viewport.zoom,
                                geom.p2.y * def.defaultDepthMm * viewport.zoom
                            );
                            ctx.stroke();
                        } else if (geom.type === 'rect' && geom.rect) {
                            const x = geom.rect.x * def.defaultWidthMm * viewport.zoom;
                            const y = geom.rect.y * def.defaultDepthMm * viewport.zoom;
                            const w = geom.rect.w * def.defaultWidthMm * viewport.zoom;
                            const h = geom.rect.h * def.defaultDepthMm * viewport.zoom;
                            ctx.strokeRect(x, y, w, h);
                        } else if (geom.type === 'arc' && geom.center && geom.radius) {
                            const cx = geom.center.x * def.defaultWidthMm * viewport.zoom;
                            const cy = geom.center.y * def.defaultDepthMm * viewport.zoom;
                            const r = geom.radius * def.defaultWidthMm * viewport.zoom;
                            ctx.beginPath();
                            ctx.arc(cx, cy, r, geom.startAngle || 0, geom.endAngle || Math.PI / 2);
                            ctx.stroke();
                        } else if (geom.type === 'circle' && geom.center && geom.radius) {
                            const cx = geom.center.x * def.defaultWidthMm * viewport.zoom;
                            const cy = geom.center.y * def.defaultDepthMm * viewport.zoom;
                            const r = geom.radius * def.defaultWidthMm * viewport.zoom;
                            ctx.beginPath();
                            ctx.arc(cx, cy, r, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                    }
                    // Center Anchor Cross
                    ctx.strokeStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.moveTo(-6, 0);
                    ctx.lineTo(6, 0);
                    ctx.moveTo(0, -6);
                    ctx.lineTo(0, 6);
                    ctx.stroke();
                    ctx.restore();
                }
            } else if (activeCadTool === 'room') {
                ctx.save();
                ctx.translate(activeScreen.x, activeScreen.y);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 2;
                ctx.fillRect(-50, -25, 100, 50);
                ctx.strokeRect(-50, -25, 100, 50);
                ctx.font = 'bold 12px sans-serif';
                ctx.fillStyle = '#0f172a';
                ctx.textAlign = 'center';
                ctx.fillText(activeRoomName, 0, -4);
                ctx.font = '10px sans-serif';
                ctx.fillStyle = '#64748b';
                ctx.fillText(`${activeTatami}帖`, 0, 14);
                ctx.restore();
            }
        }

        // Active Hand Drawing Live Stroke
        if (activeLayer === 'rough' && isInteracting && currentStrokePoints.current.length > 1) {
            ctx.save();
            ctx.strokeStyle = activeHandTool === 'highlighter' ? '#eab308' : penColor;
            ctx.lineWidth = Math.max(1, penWidth * viewport.zoom);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            const p0 = worldToScreen(currentStrokePoints.current[0], viewport);
            ctx.moveTo(p0.x, p0.y);
            for (let i = 1; i < currentStrokePoints.current.length; i++) {
                const p1 = worldToScreen(currentStrokePoints.current[i], viewport);
                ctx.lineTo(p1.x, p1.y);
            }
            ctx.stroke();
            ctx.restore();
        }
    }, [
        isSnapped,
        snappedCursor,
        cursorWorld,
        settings,
        viewport,
        activeLayer,
        layerState.cadLocked,
        activeCadTool,
        activeFixtureId,
        fixtureRotation,
        fixtureFlipH,
        fixtureFlipV,
        activeRoomName,
        activeTatami,
        isInteracting,
        activeHandTool,
        penColor,
        penWidth,
        selectedItems,
        hoveredItem,
        hoveredHandle,
        cadElements,
        roughStrokes,
    ]);

    const renderAll = useCallback(() => {
        renderBackground();
        renderRoughLayer();
        renderCadLayer();
        renderOverlay();
    }, [renderBackground, renderRoughLayer, renderCadLayer, renderOverlay]);

    useEffect(() => {
        renderAll();
    }, [renderAll]);

    // Reset selection and transient interaction states when switching layers
    useEffect(() => {
        setSelectedItems([]);
        setHoveredItem(null);
        setHoveredHandle(null);
        dragHandleTarget.current = null;
        isDraggingSelected.current = false;
        dragOriginalCadMap.current.clear();
        dragOriginalStrokesMap.current.clear();
        isMarqueeSelecting.current = false;
        marqueeStartWorld.current = null;
        marqueeCurrentWorld.current = null;
        startCadPoint.current = null;
        currentStrokePoints.current = [];
        setIsInteracting(false);
    }, [activeLayer]);

    const lastMenuClosedTimeRef = useRef<number>(0);

    const handleCloseContextMenu = useCallback(() => {
        lastMenuClosedTimeRef.current = Date.now();
        setContextMenuState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    // Cancel active drawing / dragging without committing to prevent stray lines
    const cancelActiveDrawing = useCallback(() => {
        startCadPoint.current = null;
        currentStrokePoints.current = [];
        isPanning.current = false;
        if (isDraggingSelected.current) {
            // Restore original positions if batch dragging was interrupted
            if (dragOriginalCadMap.current.size > 0) {
                const originals = Array.from(dragOriginalCadMap.current.values());
                if (onUpdateMultipleCadElements) {
                    onUpdateMultipleCadElements(originals, false);
                } else {
                    originals.forEach((orig) => onUpdateCadElement?.(orig, false));
                }
            } else if (selectedItem?.type === 'cad' && dragOriginalCad.current) {
                onUpdateCadElement?.(dragOriginalCad.current, false);
            }

            if (dragOriginalStrokesMap.current.size > 0) {
                const originals = Array.from(dragOriginalStrokesMap.current.values());
                if (onUpdateMultipleStrokes) {
                    onUpdateMultipleStrokes(originals, false);
                } else {
                    originals.forEach((orig) => onUpdateStroke?.(orig, false));
                }
            } else if (selectedItem?.type === 'stroke' && dragOriginalStroke.current) {
                onUpdateStroke?.(dragOriginalStroke.current, false);
            }

            isDraggingSelected.current = false;
            dragStartWorld.current = null;
            dragOriginalCad.current = null;
            dragOriginalStroke.current = null;
            dragOriginalCadMap.current.clear();
            dragOriginalStrokesMap.current.clear();
            dragHandleTarget.current = null;
        }
        isMarqueeSelecting.current = false;
        marqueeStartWorld.current = null;
        marqueeCurrentWorld.current = null;
        setIsInteracting(false);
        activeDrawingPointerId.current = null;
        renderOverlay();
    }, [selectedItem, onUpdateCadElement, onUpdateStroke, onUpdateMultipleCadElements, onUpdateMultipleStrokes, renderOverlay]);

    // Pointer Event Handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Prevent interaction if clicking directly on toolbar or floating buttons
        const target = e.target as HTMLElement;
        if (target.closest('.selected-element-toolbar') || target.tagName === 'BUTTON') {
            return;
        }

        // Ignore pointers if 2-finger gesture is currently running or recently finished (cooldown)
        if (isTwoFingerGesturing.current || Date.now() - lastTwoFingerGestureEndTime.current < 300) {
            return;
        }

        // Right click (mouse or stylus button 2): open context menu
        if (e.button === 2) {
            setContextMenuState({
                isOpen: true,
                pos: { x: e.clientX, y: e.clientY },
            });
            return;
        }

        // If context menu is open, a canvas click should only close the menu, NOT stamp or interact!
        if (contextMenuState.isOpen) {
            handleCloseContextMenu();
            return;
        }

        // Prevent click-through right after closing the context menu (within 250ms)
        if (Date.now() - lastMenuClosedTimeRef.current < 250) {
            return;
        }

        // Left click or pen touch only
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        // If another touch arrives while already drawing (second finger down), interrupt drawing immediately!
        if (activeDrawingPointerId.current !== null && activeDrawingPointerId.current !== e.pointerId) {
            cancelActiveDrawing();
            return;
        }

        activeDrawingPointerId.current = e.pointerId;
        try {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
            // ignore
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        // Pan tool or middle click or spacebar held
        if ((activeLayer === 'cad' && activeCadTool === 'pan') || e.buttons === 4 || isPanning.current) {
            isPanning.current = true;
            panStart.current = screenPt;
            initialViewport.current = { ...viewport };
            return;
        }

        // Rough / Handwriting Mode: Strictly snap-free and completely independent from CAD tools!
        if (activeLayer === 'rough') {
            if (layerState.roughLocked) return;
            const rawWorldPt = screenToWorld(screenPt, viewport);
            setIsInteracting(true);
            if (activeHandTool === 'eraser') {
                onClearStrokesByEraser(rawWorldPt, eraserWidth);
            } else {
                currentStrokePoints.current = [{ ...rawWorldPt, pressure: e.pressure || 0.5 }];
            }
            return;
        }

        // CAD Select & Move Mode (Only active in CAD layer)
        if (activeLayer === 'cad' && activeCadTool === 'select') {
            const worldClickPt = screenToWorld(screenPt, viewport);

            // 1. If only 1 element is currently selected, check if user clicked its endpoint handles (p1 / p2)
            if (selectedItems.length === 1 && selectedItems[0].type === 'cad') {
                const currentSelectedCad = cadElements.find((el) => el.id === selectedItems[0].id);
                if (currentSelectedCad) {
                    const hitHandle = getHitHandle(screenPt, currentSelectedCad, viewport, 22);
                    if (hitHandle) {
                        dragHandleTarget.current = hitHandle;
                        dragOriginalCad.current = JSON.parse(JSON.stringify(currentSelectedCad));
                        dragStartWorld.current = worldClickPt;
                        isDraggingSelected.current = true;
                        setIsInteracting(true);
                        onPushHistory?.();
                        return;
                    }
                }
            }

            // 2. Element hit test
            const hitTolerance = Math.max(150, 16 / viewport.zoom);
            const hitCad = hitTestCadElement(worldClickPt, cadElements, hitTolerance);
            const hitStroke = !hitCad ? hitTestHandStroke(worldClickPt, roughStrokes, hitTolerance) : null;

            if (hitCad || hitStroke) {
                const clickedItem = hitCad
                    ? { id: hitCad.id, type: 'cad' as const }
                    : { id: hitStroke!.id, type: 'stroke' as const };

                const alreadySelected = selectedItems.some(
                    (i) => i.id === clickedItem.id && i.type === clickedItem.type
                );

                let targetSelected = selectedItems;
                if (!alreadySelected) {
                    if (e.shiftKey) {
                        targetSelected = [...selectedItems, clickedItem];
                    } else {
                        targetSelected = [clickedItem];
                    }
                    setSelectedItems(targetSelected);
                }

                // Prepare batch or single dragging
                dragOriginalCadMap.current.clear();
                dragOriginalStrokesMap.current.clear();
                targetSelected.forEach((item) => {
                    if (item.type === 'cad') {
                        const el = cadElements.find((e) => e.id === item.id);
                        if (el) dragOriginalCadMap.current.set(el.id, JSON.parse(JSON.stringify(el)));
                    } else if (item.type === 'stroke') {
                        const s = roughStrokes.find((st) => st.id === item.id);
                        if (s) dragOriginalStrokesMap.current.set(s.id, JSON.parse(JSON.stringify(s)));
                    }
                });

                if (hitCad) {
                    dragOriginalCad.current = JSON.parse(JSON.stringify(hitCad));
                }
                if (hitStroke) {
                    dragOriginalStroke.current = JSON.parse(JSON.stringify(hitStroke));
                }

                dragHandleTarget.current = null;
                dragStartWorld.current = worldClickPt;
                isDraggingSelected.current = true;
                setIsInteracting(true);
                onPushHistory?.();
                return;
            } else {
                // 3. Blank space clicked: Start Marquee Selection!
                isMarqueeSelecting.current = true;
                marqueeStartWorld.current = worldClickPt;
                marqueeCurrentWorld.current = worldClickPt;
                setIsInteracting(true);
                return;
            }
        }

        // CAD Mode with Snapping
        const snapResult = getMagneticSnap(
            screenPt,
            viewport,
            settings.gridModuleMm,
            settings.subDivisions,
            settings.snapThresholdPx,
            getCandidateSnapPoints()
        );

        const worldPt = snapResult.point;
        setIsInteracting(true);

        if (layerState.cadLocked) return;

        if (activeCadTool === 'wall' || activeCadTool === 'line' || activeCadTool === 'rect') {
            startCadPoint.current = worldPt;
        } else if (activeCadTool === 'fixture') {
            const def = FIXTURE_LIBRARY.find((f) => f.id === activeFixtureId);
            if (def) {
                const newFixture: FixtureElement = {
                    id: 'fixture_' + Date.now(),
                    type: 'fixture',
                    fixtureId: def.id,
                    name: def.name,
                    position: worldPt,
                    rotation: fixtureRotation,
                    flipH: fixtureFlipH,
                    flipV: fixtureFlipV,
                    widthMm: def.defaultWidthMm,
                    depthMm: def.defaultDepthMm,
                };
                onAddCadElement(newFixture);
            }
        } else if (activeCadTool === 'room') {
            const newRoom: RoomElement = {
                id: 'room_' + Date.now(),
                type: 'room',
                position: worldPt,
                name: activeRoomName,
                tatami: activeTatami,
            };
            onAddCadElement(newRoom);
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        // Suppress pointer updates during or immediately after 2-finger scroll
        if (isTwoFingerGesturing.current || Date.now() - lastTwoFingerGestureEndTime.current < 300) {
            return;
        }
        if (activeDrawingPointerId.current !== null && activeDrawingPointerId.current !== e.pointerId) {
            return;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        // Handle Pan
        if (isPanning.current) {
            const dx = screenPt.x - panStart.current.x;
            const dy = screenPt.y - panStart.current.y;
            setViewport((prev) => ({
                ...prev,
                panX: initialViewport.current.panX + dx,
                panY: initialViewport.current.panY + dy,
            }));
            return;
        }

        // Rough / Handwriting: Completely freehand without snap
        if (activeLayer === 'rough') {
            const rawWorldPt = screenToWorld(screenPt, viewport);
            setCursorWorld(rawWorldPt);
            setIsSnapped(false);

            if (isInteracting) {
                if (activeHandTool === 'eraser') {
                    onClearStrokesByEraser(rawWorldPt, eraserWidth);
                } else {
                    currentStrokePoints.current.push({
                        ...rawWorldPt,
                        pressure: e.pressure || 0.5,
                    });
                    renderOverlay();
                }
            }
            return;
        }

        // CAD Select & Move Mode Handling (CAD Layer Only)
        if (activeLayer === 'cad' && activeCadTool === 'select') {
            const currentWorld = screenToWorld(screenPt, viewport);
            setCursorWorld(currentWorld);

            // 1. Marquee drag updating
            if (isMarqueeSelecting.current) {
                marqueeCurrentWorld.current = currentWorld;
                renderOverlay();
                return;
            }

            // 2. Dragging element(s) or endpoint handle
            if (isDraggingSelected.current && dragStartWorld.current) {
                // Endpoint resize drag (single element length change)
                if (
                    selectedItems.length === 1 &&
                    selectedItems[0].type === 'cad' &&
                    dragOriginalCad.current &&
                    (dragHandleTarget.current === 'p1' || dragHandleTarget.current === 'p2')
                ) {
                    const orig = dragOriginalCad.current;
                    let targetPt = currentWorld;
                    if (settings.snapEnabled) {
                        const snapResult = getMagneticSnap(
                            screenPt,
                            viewport,
                            settings.gridModuleMm,
                            settings.subDivisions,
                            settings.snapThresholdPx,
                            getCandidateSnapPoints()
                        );
                        targetPt = snapResult.point;
                    }

                    let updated: CADElement = { ...orig };
                    if (
                        orig.type === 'wall' ||
                        orig.type === 'line' ||
                        orig.type === 'dimension' ||
                        orig.type === 'rect'
                    ) {
                        if (dragHandleTarget.current === 'p1') {
                            updated = { ...orig, p1: targetPt };
                        } else {
                            updated = { ...orig, p2: targetPt };
                        }
                    }
                    onUpdateCadElement?.(updated, false);
                } else {
                    // Whole element(s) batch translation
                    let dx = currentWorld.x - dragStartWorld.current.x;
                    let dy = currentWorld.y - dragStartWorld.current.y;

                    if (settings.snapEnabled) {
                        const step = settings.gridModuleMm / (settings.subDivisions || 1);
                        dx = Math.round(dx / step) * step;
                        dy = Math.round(dy / step) * step;
                    }

                    // Move all selected CAD elements
                    if (dragOriginalCadMap.current.size > 0) {
                        const updatedList: CADElement[] = [];
                        for (const orig of dragOriginalCadMap.current.values()) {
                            if (orig.type === 'wall' || orig.type === 'line' || orig.type === 'dimension') {
                                updatedList.push({
                                    ...orig,
                                    p1: { x: orig.p1.x + dx, y: orig.p1.y + dy },
                                    p2: { x: orig.p2.x + dx, y: orig.p2.y + dy },
                                });
                            } else if (orig.type === 'rect') {
                                updatedList.push({
                                    ...orig,
                                    p1: { x: orig.p1.x + dx, y: orig.p1.y + dy },
                                    p2: { x: orig.p2.x + dx, y: orig.p2.y + dy },
                                });
                            } else if (orig.type === 'fixture') {
                                updatedList.push({
                                    ...orig,
                                    position: { x: orig.position.x + dx, y: orig.position.y + dy },
                                });
                            } else if (orig.type === 'room') {
                                updatedList.push({
                                    ...orig,
                                    position: { x: orig.position.x + dx, y: orig.position.y + dy },
                                });
                            }
                        }
                        if (onUpdateMultipleCadElements) {
                            onUpdateMultipleCadElements(updatedList, false);
                        } else {
                            updatedList.forEach((el) => onUpdateCadElement?.(el, false));
                        }
                    } else if (selectedItem?.type === 'cad' && dragOriginalCad.current) {
                        const orig = dragOriginalCad.current;
                        let updated: CADElement = { ...orig };
                        if (orig.type === 'wall' || orig.type === 'line' || orig.type === 'dimension') {
                            updated = {
                                ...orig,
                                p1: { x: orig.p1.x + dx, y: orig.p1.y + dy },
                                p2: { x: orig.p2.x + dx, y: orig.p2.y + dy },
                            };
                        } else if (orig.type === 'rect') {
                            updated = {
                                ...orig,
                                p1: { x: orig.p1.x + dx, y: orig.p1.y + dy },
                                p2: { x: orig.p2.x + dx, y: orig.p2.y + dy },
                            };
                        } else if (orig.type === 'fixture') {
                            updated = {
                                ...orig,
                                position: { x: orig.position.x + dx, y: orig.position.y + dy },
                            };
                        } else if (orig.type === 'room') {
                            updated = {
                                ...orig,
                                position: { x: orig.position.x + dx, y: orig.position.y + dy },
                            };
                        }
                        onUpdateCadElement?.(updated, false);
                    }

                    // Move all selected strokes
                    if (dragOriginalStrokesMap.current.size > 0) {
                        const updatedStrokes: HandStroke[] = [];
                        for (const orig of dragOriginalStrokesMap.current.values()) {
                            updatedStrokes.push({
                                ...orig,
                                points: orig.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
                            });
                        }
                        if (onUpdateMultipleStrokes) {
                            onUpdateMultipleStrokes(updatedStrokes, false);
                        } else {
                            updatedStrokes.forEach((s) => onUpdateStroke?.(s, false));
                        }
                    } else if (selectedItem?.type === 'stroke' && dragOriginalStroke.current) {
                        const orig = dragOriginalStroke.current;
                        const updated: HandStroke = {
                            ...orig,
                            points: orig.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
                        };
                        onUpdateStroke?.(updated, false);
                    }
                }
            } else {
                // Hover hit-testing: endpoints first (only if single selection), then elements
                let hitH: 'p1' | 'p2' | null = null;
                if (selectedItems.length === 1 && selectedItems[0].type === 'cad') {
                    const currentSelectedCad = cadElements.find((el) => el.id === selectedItems[0].id);
                    if (currentSelectedCad) {
                        hitH = getHitHandle(screenPt, currentSelectedCad, viewport, 20);
                    }
                }
                setHoveredHandle(hitH);

                const hitTolerance = Math.max(150, 16 / viewport.zoom);
                const hoverCad = hitTestCadElement(currentWorld, cadElements, hitTolerance);
                const hoverStroke = !hoverCad ? hitTestHandStroke(currentWorld, roughStrokes, hitTolerance) : null;
                setHoveredItem(hoverCad ? { id: hoverCad.id, type: 'cad' } : hoverStroke ? { id: hoverStroke.id, type: 'stroke' } : null);
            }
            renderOverlay();
            return;
        }

        // CAD Mode Live Moving / Snapping
        const snapResult = getMagneticSnap(
            screenPt,
            viewport,
            settings.gridModuleMm,
            settings.subDivisions,
            settings.snapThresholdPx,
            getCandidateSnapPoints()
        );

        setCursorWorld(screenToWorld(screenPt, viewport));
        setSnappedCursor(snapResult.point);
        setIsSnapped(snapResult.snapped);
        renderOverlay();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        try {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }

        if (activeDrawingPointerId.current === e.pointerId) {
            activeDrawingPointerId.current = null;
        }

        // If 2-finger scroll was running or ended recently, cancel drawing and NEVER commit stray line
        if (isTwoFingerGesturing.current || Date.now() - lastTwoFingerGestureEndTime.current < 300) {
            cancelActiveDrawing();
            return;
        }

        if (isPanning.current) {
            isPanning.current = false;
            return;
        }

        // Finish marquee box selection
        if (isMarqueeSelecting.current) {
            isMarqueeSelecting.current = false;
            const start = marqueeStartWorld.current;
            const end = marqueeCurrentWorld.current;
            if (start && end) {
                const distMm = Math.hypot(end.x - start.x, end.y - start.y);
                if (distMm < 30) {
                    // Small click on blank area clears selection
                    setSelectedItems([]);
                    setHoveredHandle(null);
                } else {
                    const minX = Math.min(start.x, end.x);
                    const maxX = Math.max(start.x, end.x);
                    const minY = Math.min(start.y, end.y);
                    const maxY = Math.max(start.y, end.y);
                    const box: BoxRegion = { minX, maxX, minY, maxY };

                    const foundCad = boxSelectCadElements(box, cadElements);
                    const foundStrokes = boxSelectStrokes(box, roughStrokes);

                    const newSelected = [
                        ...foundCad.map((c) => ({ id: c.id, type: 'cad' as const })),
                        ...foundStrokes.map((s) => ({ id: s.id, type: 'stroke' as const })),
                    ];
                    setSelectedItems(newSelected);
                    setHoveredHandle(null);
                }
            }
            marqueeStartWorld.current = null;
            marqueeCurrentWorld.current = null;
            setIsInteracting(false);
            renderOverlay();
            return;
        }

        // Release dragging in select mode
        if (isDraggingSelected.current) {
            isDraggingSelected.current = false;
            dragStartWorld.current = null;
            dragOriginalCad.current = null;
            dragOriginalStroke.current = null;
            dragOriginalCadMap.current.clear();
            dragOriginalStrokesMap.current.clear();
            dragHandleTarget.current = null;
            setIsInteracting(false);
            renderOverlay();
            return;
        }

        if (!isInteracting) return;
        setIsInteracting(false);

        if (activeLayer === 'rough') {
            if (currentStrokePoints.current.length > 1) {
                const newStroke: HandStroke = {
                    id: 'stroke_' + Date.now(),
                    tool: activeHandTool,
                    color: activeHandTool === 'highlighter' ? '#eab308' : penColor,
                    width: penWidth,
                    opacity: activeHandTool === 'highlighter' ? 0.45 : 1.0,
                    points: [...currentStrokePoints.current],
                    timestamp: Date.now(),
                };
                onAddStroke(newStroke);
            }
            currentStrokePoints.current = [];
        } else {
            // CAD Layer Commit
            const endPt = isSnapped ? snappedCursor : cursorWorld;

            if (startCadPoint.current) {
                const start = startCadPoint.current;
                const d = distance(start, endPt);

                if (d > 100) {
                    // Minimum 100mm to avoid micro-clicks
                    if (activeCadTool === 'wall') {
                        const newWall: WallElement = {
                            id: 'wall_' + Date.now(),
                            type: 'wall',
                            p1: start,
                            p2: endPt,
                            thickness: settings.wallThicknessMm,
                        };
                        onAddCadElement(newWall);
                    } else if (activeCadTool === 'line') {
                        const newLine: LineElement = {
                            id: 'line_' + Date.now(),
                            type: 'line',
                            p1: start,
                            p2: endPt,
                            color: '#0f172a',
                            width: 40,
                        };
                        onAddCadElement(newLine);
                    } else if (activeCadTool === 'rect') {
                        const newRect: RectElement = {
                            id: 'rect_' + Date.now(),
                            type: 'rect',
                            p1: start,
                            p2: endPt,
                        };
                        onAddCadElement(newRect);
                    }
                }
                startCadPoint.current = null;
            }
        }
    };

    // Pointer cancel is fired by the OS/browser when a touch gesture starts: CANCEL, DO NOT COMMIT!
    const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
        try {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
        if (activeDrawingPointerId.current === e.pointerId) {
            activeDrawingPointerId.current = null;
        }
        cancelActiveDrawing();
    };

    // Wheel Zoom (Touchpad & Mouse Wheel)
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
        const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.01), 0.5);

        // Zoom towards mouse pointer
        const mouseWorld = screenToWorld(mouseScreen, viewport);
        const newPanX = mouseScreen.x - mouseWorld.x * newZoom;
        const newPanY = mouseScreen.y - mouseWorld.y * newZoom;

        setViewport({
            zoom: newZoom,
            panX: newPanX,
            panY: newPanY,
        });
    };

    // Touch Pinch-to-Zoom & 2-finger scroll/pan handler
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length >= 2) {
            isTwoFingerGesturing.current = true;
            // Cancel drawing right as second finger lands on screen!
            cancelActiveDrawing();

            const t1 = e.touches[0];
            const t2 = e.touches[1];
            lastPinchDist.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            lastTouchCenter.current = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2,
            };
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2) {
            e.preventDefault();

            // Always guarantee interrupted drawing
            if (startCadPoint.current || isInteracting || currentStrokePoints.current.length > 0) {
                cancelActiveDrawing();
            }
            isTwoFingerGesturing.current = true;

            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const center = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2,
            };
            const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const screenCenter = { x: center.x - rect.left, y: center.y - rect.top };

            const dx = lastTouchCenter.current ? center.x - lastTouchCenter.current.x : 0;
            const dy = lastTouchCenter.current ? center.y - lastTouchCenter.current.y : 0;

            let factor = 1;
            if (lastPinchDist.current !== null && lastPinchDist.current > 0) {
                factor = currentDist / lastPinchDist.current;
            }

            setViewport((prev) => {
                const newZoom = Math.min(Math.max(prev.zoom * factor, 0.01), 0.5);
                const centerWorld = screenToWorld(screenCenter, prev);

                const newPanX = (screenCenter.x + dx) - centerWorld.x * newZoom;
                const newPanY = (screenCenter.y + dy) - centerWorld.y * newZoom;

                return {
                    zoom: newZoom,
                    panX: newPanX,
                    panY: newPanY,
                };
            });

            lastPinchDist.current = currentDist;
            lastTouchCenter.current = center;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length < 2) {
            lastPinchDist.current = null;
            lastTouchCenter.current = null;
        }
        if (e.touches.length === 0) {
            isTwoFingerGesturing.current = false;
            lastTwoFingerGestureEndTime.current = Date.now();
        } else {
            // A finger was lifted but 1 finger remains momentarily
            lastTwoFingerGestureEndTime.current = Date.now();
        }
    };

    const handleTouchCancel = (e: React.TouchEvent<HTMLDivElement>) => {
        handleTouchEnd(e);
    };

    const getSelectedElementInfo = () => {
        if (!selectedItem) return null;
        if (selectedItem.type === 'cad') {
            const el = cadElements.find((e) => e.id === selectedItem.id);
            if (!el) return null;
            let topWorld: Point = { x: 0, y: 0 };
            let name = 'CAD要素';
            let isFixture = false;

            if (el.type === 'wall') {
                const center = { x: (el.p1.x + el.p2.x) / 2, y: (el.p1.y + el.p2.y) / 2 };
                topWorld = { x: center.x, y: Math.min(el.p1.y, el.p2.y) };
                name = `壁 (${el.thickness}mm)`;
            } else if (el.type === 'line') {
                const center = { x: (el.p1.x + el.p2.x) / 2, y: (el.p1.y + el.p2.y) / 2 };
                topWorld = { x: center.x, y: Math.min(el.p1.y, el.p2.y) };
                name = '直線';
            } else if (el.type === 'rect') {
                const center = { x: (el.p1.x + el.p2.x) / 2, y: (el.p1.y + el.p2.y) / 2 };
                topWorld = { x: center.x, y: Math.min(el.p1.y, el.p2.y) };
                name = '部屋枠 (矩形)';
            } else if (el.type === 'fixture') {
                topWorld = { x: el.position.x, y: el.position.y - el.depthMm / 2 };
                name = el.name;
                isFixture = true;
            } else if (el.type === 'room') {
                topWorld = { x: el.position.x, y: el.position.y - 170 };
                name = `部屋: ${el.name}`;
            } else if (el.type === 'dimension') {
                const center = { x: (el.p1.x + el.p2.x) / 2, y: (el.p1.y + el.p2.y) / 2 };
                topWorld = { x: center.x, y: Math.min(el.p1.y, el.p2.y) };
                name = '寸法線';
            }
            const screenPos = worldToScreen(topWorld, viewport);
            return { name, isFixture, screenPos, element: el };
        } else {
            const stroke = roughStrokes.find((s) => s.id === selectedItem.id);
            if (!stroke || stroke.points.length === 0) return null;
            let minY = Infinity;
            let totalX = 0;
            for (const p of stroke.points) {
                totalX += p.x;
                if (p.y < minY) minY = p.y;
            }
            const avgX = totalX / stroke.points.length;
            const screenPos = worldToScreen({ x: avgX, y: minY }, viewport);
            return {
                name: stroke.tool === 'highlighter' ? '蛍光マーカー線' : '下書き線',
                isFixture: false,
                screenPos,
                element: stroke,
            };
        }
    };

    const selectedInfo = getSelectedElementInfo();

    return (
        <div
            ref={containerRef}
            className="canvas-container"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onContextMenu={(e) => {
                e.preventDefault();
                setContextMenuState({
                    isOpen: true,
                    pos: { x: e.clientX, y: e.clientY },
                });
            }}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                userSelect: 'none',
                touchAction: 'none',
                cursor:
                    activeLayer === 'rough'
                        ? activeHandTool === 'eraser'
                            ? 'crosshair'
                            : 'crosshair'
                        : activeCadTool === 'pan'
                            ? 'grab'
                            : activeCadTool === 'select'
                                ? hoveredHandle
                                    ? 'crosshair'
                                    : hoveredItem
                                        ? 'move'
                                        : 'default'
                                : 'crosshair',
            }}
        >
            <canvas ref={bgCanvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
            <canvas ref={roughCanvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
            <canvas ref={cadCanvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
            <canvas ref={overlayCanvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />

            {/* Floating Toolbar for Multi-Selected Elements (CAD mode only) */}
            {activeLayer === 'cad' && selectedItems.length > 1 && (
                <div
                    className="selected-element-toolbar multi-toolbar"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '20px',
                        transform: 'translateX(-50%)',
                        zIndex: 60,
                    }}
                >
                    <div className="sel-badge">
                        <span className="sel-type-tag">複数選択</span>
                        <span className="sel-name">{selectedItems.length}個の要素</span>
                    </div>
                    <button
                        className="sel-tool-btn danger"
                        onClick={(e) => {
                            e.stopPropagation();
                            const cadIds = selectedItems.filter((i) => i.type === 'cad').map((i) => i.id);
                            const strokeIds = selectedItems.filter((i) => i.type === 'stroke').map((i) => i.id);
                            if (onRemoveMultipleItems) {
                                onRemoveMultipleItems(cadIds, strokeIds);
                            } else {
                                cadIds.forEach((id) => onRemoveCadElement?.(id));
                                strokeIds.forEach((id) => onRemoveStroke?.(id));
                            }
                            setSelectedItems([]);
                            setHoveredHandle(null);
                        }}
                        title="まとめて削除 (Deleteキー)"
                    >
                        <Trash2 size={13} />
                        <span>一括削除</span>
                    </button>
                    <button
                        className="sel-tool-btn close"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItems([]);
                            setHoveredHandle(null);
                        }}
                        title="選択解除 (Escキー)"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Floating Toolbar for Single Selected Element (CAD mode only) */}
            {activeLayer === 'cad' && selectedItems.length === 1 && selectedItem && selectedInfo && (
                <div
                    className="selected-element-toolbar"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        left: `${Math.max(120, Math.min(window.innerWidth - 180, selectedInfo.screenPos.x))}px`,
                        top: `${Math.max(20, selectedInfo.screenPos.y - 48)}px`,
                        transform: 'translateX(-50%)',
                        zIndex: 60,
                    }}
                >
                    <div className="sel-badge">
                        <span className="sel-type-tag">選択中</span>
                        <span className="sel-name">{selectedInfo.name}</span>
                    </div>
                    {selectedInfo.isFixture && (
                        <>
                            <button
                                className="sel-tool-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const fix = cadElements.find((el) => el.id === selectedItem.id) as FixtureElement;
                                    if (fix && onUpdateCadElement) {
                                        onUpdateCadElement({ ...fix, rotation: (fix.rotation + 90) % 360 }, true);
                                    }
                                }}
                                title="90°回転"
                            >
                                <RotateCw size={13} />
                                <span>回転</span>
                            </button>
                            <button
                                className="sel-tool-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const fix = cadElements.find((el) => el.id === selectedItem.id) as FixtureElement;
                                    if (fix && onUpdateCadElement) {
                                        onUpdateCadElement({ ...fix, flipH: !fix.flipH }, true);
                                    }
                                }}
                                title="左右反転"
                            >
                                <FlipHorizontal size={13} />
                                <span>反転</span>
                            </button>
                        </>
                    )}
                    <button
                        className="sel-tool-btn danger"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (selectedItem.type === 'cad') {
                                onRemoveCadElement?.(selectedItem.id);
                            } else {
                                onRemoveStroke?.(selectedItem.id);
                            }
                            setSelectedItems([]);
                            setHoveredHandle(null);
                        }}
                        title="削除 (Deleteキー)"
                    >
                        <Trash2 size={13} />
                        <span>削除</span>
                    </button>
                    <button
                        className="sel-tool-btn close"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItems([]);
                            setHoveredHandle(null);
                        }}
                        title="選択解除 (Escキー)"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Right-Click Quick Switch Context Menu */}
            <QuickContextMenu
                isOpen={contextMenuState.isOpen}
                position={contextMenuState.pos}
                onClose={handleCloseContextMenu}
                activeLayer={activeLayer}
                onSelectLayer={(l) => {
                    onSelectLayer?.(l);
                    handleCloseContextMenu();
                }}
                activeCadTool={activeCadTool}
                onSelectCadTool={(t) => {
                    onSelectCadTool?.(t);
                    // Only close if NOT selecting fixture mode (let user pick the fixture!)
                    if (t !== 'fixture') {
                        handleCloseContextMenu();
                    }
                }}
                activeFixtureId={activeFixtureId}
                fixtureRotation={fixtureRotation}
                fixtureFlipH={fixtureFlipH}
                fixtureFlipV={fixtureFlipV}
                onSelectFixture={(fId) => {
                    onSelectFixture?.(fId);
                    handleCloseContextMenu();
                }}
                onRotateFixture={() => onRotateFixture?.()}
                onFlipFixtureH={() => onFlipFixtureH?.()}
                onOpenFixtureDrawer={() => {
                    onOpenFixtureDrawer?.();
                    handleCloseContextMenu();
                }}
                activeHandTool={activeHandTool}
                onSelectHandTool={(t) => {
                    onSelectHandTool?.(t);
                    handleCloseContextMenu();
                }}
                penPresets={penPresets}
                activePenPresetId={activePenPresetId}
                onSelectPenPreset={(id) => {
                    onSelectPenPreset?.(id);
                    handleCloseContextMenu();
                }}
                penColor={penColor}
                onSelectPenColor={(c) => {
                    onSelectPenColor?.(c);
                    handleCloseContextMenu();
                }}
            />
        </div>
    );
};
