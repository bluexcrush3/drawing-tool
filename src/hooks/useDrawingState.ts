import { useState, useCallback, useRef } from 'react';
import type {
    CADElement,
    DrawingPage,
    DrawingProject,
    HandStroke,
    HandToolType,
    CadToolType,
    LayerState,
    LayerType,
    PaperSize,
    PenPreset,
    Point,
    Settings,
    ViewportTransform,
} from '../types/drawing';
import { DEFAULT_SETTINGS, DEFAULT_PEN_PRESETS, PAPER_PRESETS } from '../constants/defaultSettings';

interface HistorySnapshot {
    roughStrokes: HandStroke[];
    cadElements: CADElement[];
}

const INITIAL_PAGE_ID = 'page_1';

const createDefaultPage = (
    id = INITIAL_PAGE_ID,
    name = '図面 1 (A4)',
    paperSize: PaperSize = 'A4'
): DrawingPage => ({
    id,
    name,
    paperSize,
    canvasWidthMm: PAPER_PRESETS[paperSize].sheetWidthMm,
    canvasHeightMm: PAPER_PRESETS[paperSize].sheetHeightMm,
    cadElements: [],
    roughStrokes: [],
    viewport: { panX: 120, panY: 80, zoom: 0.05 },
});

export function useDrawingState() {
    // Settings & Project metadata
    const [projectTitle, setProjectTitle] = useState('無題の間取り図面');
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [penPresets, setPenPresets] = useState<PenPreset[]>(DEFAULT_PEN_PRESETS);

    // Multi-Page State
    const [pages, setPages] = useState<DrawingPage[]>([createDefaultPage()]);
    const [activePageId, setActivePageId] = useState<string>(INITIAL_PAGE_ID);

    // Layer State (Opacity, Visibility, Active)
    const [activeLayer, setActiveLayerState] = useState<LayerType>('cad');
    const [layerState, setLayerState] = useState<LayerState>({
        roughOpacity: 0.65,
        roughVisible: true,
        cadVisible: true,
        roughLocked: false,
        cadLocked: false,
    });

    const setActiveLayer = useCallback((layer: LayerType) => {
        setActiveLayerState(layer);
        if (layer === 'rough') {
            // 下書きモードに移行した際、直ちに手書き線を引けるようペンツールをアクティブ化
            setActiveHandTool('pen');
        }
    }, []);

    // Active Tools & Pen Config
    const [activeHandTool, setActiveHandTool] = useState<HandToolType>('pen');
    const [activePenPresetId, setActivePenPresetId] = useState<string>('pen_fine_black');
    const [penColor, setPenColor] = useState<string>('#1a1f2c');
    const [penWidth, setPenWidth] = useState<number>(35); // in mm
    const [eraserWidth, setEraserWidth] = useState<number>(200);

    // Active CAD Tools & Fixture Config
    const [activeCadTool, setActiveCadTool] = useState<CadToolType>('wall');
    const [activeFixtureId, setActiveFixtureId] = useState<string>('door_single');
    const [fixtureRotation, setFixtureRotation] = useState<number>(0);
    const [fixtureFlipH, setFixtureFlipH] = useState<boolean>(false);
    const [fixtureFlipV, setFixtureFlipV] = useState<boolean>(false);
    const [activeRoomName, setActiveRoomName] = useState<string>('LDK');
    const [activeTatami, setActiveTatami] = useState<number>(16);

    // Active Drawing Data
    const [roughStrokes, setRoughStrokes] = useState<HandStroke[]>([]);
    const [cadElements, setCadElements] = useState<CADElement[]>([]);

    // Viewport (Pan & Zoom)
    const [viewport, setViewport] = useState<ViewportTransform>({
        panX: 120,
        panY: 80,
        zoom: 0.05,
    });

    // History Stacks (Undo / Redo) per page
    const historyUndoRef = useRef<HistorySnapshot[]>([]);
    const historyRedoRef = useRef<HistorySnapshot[]>([]);
    const pageHistoryRef = useRef<Record<string, { undo: HistorySnapshot[]; redo: HistorySnapshot[] }>>({});
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Helper to sync changes to pages array
    const syncCurrentPageData = useCallback(
        (newCad: CADElement[], newStrokes: HandStroke[]) => {
            setPages((prev) =>
                prev.map((p) =>
                    p.id === activePageId
                        ? { ...p, cadElements: newCad, roughStrokes: newStrokes }
                        : p
                )
            );
        },
        [activePageId]
    );

    const pushHistory = useCallback(() => {
        historyUndoRef.current.push({
            roughStrokes: [...roughStrokes],
            cadElements: [...cadElements],
        });
        if (historyUndoRef.current.length > 50) {
            historyUndoRef.current.shift();
        }
        historyRedoRef.current = [];
        setCanUndo(true);
        setCanRedo(false);
    }, [roughStrokes, cadElements]);

    const undo = useCallback(() => {
        if (historyUndoRef.current.length === 0) return;
        const previous = historyUndoRef.current.pop()!;
        historyRedoRef.current.push({
            roughStrokes: [...roughStrokes],
            cadElements: [...cadElements],
        });
        setRoughStrokes(previous.roughStrokes);
        setCadElements(previous.cadElements);
        syncCurrentPageData(previous.cadElements, previous.roughStrokes);
        setCanUndo(historyUndoRef.current.length > 0);
        setCanRedo(true);
    }, [roughStrokes, cadElements, syncCurrentPageData]);

    const redo = useCallback(() => {
        if (historyRedoRef.current.length === 0) return;
        const next = historyRedoRef.current.pop()!;
        historyUndoRef.current.push({
            roughStrokes: [...roughStrokes],
            cadElements: [...cadElements],
        });
        setRoughStrokes(next.roughStrokes);
        setCadElements(next.cadElements);
        syncCurrentPageData(next.cadElements, next.roughStrokes);
        setCanUndo(true);
        setCanRedo(historyRedoRef.current.length > 0);
    }, [roughStrokes, cadElements, syncCurrentPageData]);

    // Stroke Operations
    const addStroke = useCallback(
        (stroke: HandStroke) => {
            pushHistory();
            setRoughStrokes((prev) => {
                const next = [...prev, stroke];
                syncCurrentPageData(cadElements, next);
                return next;
            });
        },
        [pushHistory, cadElements, syncCurrentPageData]
    );

    const updateStroke = useCallback(
        (stroke: HandStroke, recordHistory = false) => {
            if (recordHistory) pushHistory();
            setRoughStrokes((prev) => {
                const next = prev.map((s) => (s.id === stroke.id ? stroke : s));
                syncCurrentPageData(cadElements, next);
                return next;
            });
        },
        [pushHistory, cadElements, syncCurrentPageData]
    );

    const removeStroke = useCallback(
        (strokeId: string) => {
            pushHistory();
            setRoughStrokes((prev) => {
                const next = prev.filter((s) => s.id !== strokeId);
                syncCurrentPageData(cadElements, next);
                return next;
            });
        },
        [pushHistory, cadElements, syncCurrentPageData]
    );

    const clearStrokesByEraser = useCallback(
        (point: Point, radiusMm: number) => {
            setRoughStrokes((prev) => {
                const remaining = prev.filter((stroke) => {
                    return !stroke.points.some((p) => {
                        const dx = p.x - point.x;
                        const dy = p.y - point.y;
                        return Math.sqrt(dx * dx + dy * dy) <= radiusMm;
                    });
                });
                if (remaining.length !== prev.length) {
                    pushHistory();
                    syncCurrentPageData(cadElements, remaining);
                    return remaining;
                }
                return prev;
            });
        },
        [pushHistory, cadElements, syncCurrentPageData]
    );

    // CAD Operations
    const addCadElement = useCallback(
        (element: CADElement) => {
            pushHistory();
            setCadElements((prev) => {
                const next = [...prev, element];
                syncCurrentPageData(next, roughStrokes);
                return next;
            });
        },
        [pushHistory, roughStrokes, syncCurrentPageData]
    );

    const updateCadElement = useCallback(
        (element: CADElement, recordHistory = false) => {
            if (recordHistory) pushHistory();
            setCadElements((prev) => {
                const next = prev.map((el) => (el.id === element.id ? element : el));
                syncCurrentPageData(next, roughStrokes);
                return next;
            });
        },
        [pushHistory, roughStrokes, syncCurrentPageData]
    );

    const removeCadElement = useCallback(
        (elementId: string) => {
            pushHistory();
            setCadElements((prev) => {
                const next = prev.filter((el) => el.id !== elementId);
                syncCurrentPageData(next, roughStrokes);
                return next;
            });
        },
        [pushHistory, roughStrokes, syncCurrentPageData]
    );

    const updateMultipleCadElements = useCallback(
        (elements: CADElement[], recordHistory = false) => {
            if (elements.length === 0) return;
            if (recordHistory) pushHistory();
            const map = new Map(elements.map((el) => [el.id, el]));
            setCadElements((prev) => {
                const next = prev.map((el) => map.get(el.id) || el);
                syncCurrentPageData(next, roughStrokes);
                return next;
            });
        },
        [pushHistory, roughStrokes, syncCurrentPageData]
    );

    const updateMultipleStrokes = useCallback(
        (strokes: HandStroke[], recordHistory = false) => {
            if (strokes.length === 0) return;
            if (recordHistory) pushHistory();
            const map = new Map(strokes.map((s) => [s.id, s]));
            setRoughStrokes((prev) => {
                const next = prev.map((s) => map.get(s.id) || s);
                syncCurrentPageData(cadElements, next);
                return next;
            });
        },
        [pushHistory, cadElements, syncCurrentPageData]
    );

    const removeMultipleItems = useCallback(
        (cadIds: string[], strokeIds: string[] = []) => {
            if (cadIds.length === 0 && strokeIds.length === 0) return;
            pushHistory();
            const cadSet = new Set(cadIds);
            const strokeSet = new Set(strokeIds);
            setCadElements((prevCad) => {
                const nextCad = cadIds.length > 0 ? prevCad.filter((el) => !cadSet.has(el.id)) : prevCad;
                setRoughStrokes((prevRough) => {
                    const nextRough = strokeIds.length > 0 ? prevRough.filter((s) => !strokeSet.has(s.id)) : prevRough;
                    syncCurrentPageData(nextCad, nextRough);
                    return nextRough;
                });
                return nextCad;
            });
        },
        [pushHistory, syncCurrentPageData]
    );

    const clearCurrentLayer = useCallback(() => {
        if (activeLayer === 'rough') {
            if (roughStrokes.length > 0) {
                pushHistory();
                setRoughStrokes([]);
                syncCurrentPageData(cadElements, []);
            }
        } else {
            if (cadElements.length > 0) {
                pushHistory();
                setCadElements([]);
                syncCurrentPageData([], roughStrokes);
            }
        }
    }, [activeLayer, roughStrokes, cadElements, pushHistory, syncCurrentPageData]);

    const clearAll = useCallback(() => {
        pushHistory();
        setRoughStrokes([]);
        setCadElements([]);
        syncCurrentPageData([], []);
    }, [pushHistory, syncCurrentPageData]);

    // Multi-page Actions
    const switchPage = useCallback(
        (targetPageId: string) => {
            if (targetPageId === activePageId) return;
            const target = pages.find((p) => p.id === targetPageId);
            if (!target) return;

            // Save history for current page
            pageHistoryRef.current[activePageId] = {
                undo: [...historyUndoRef.current],
                redo: [...historyRedoRef.current],
            };

            // Save latest drawing and viewport for current page
            setPages((prev) =>
                prev.map((p) =>
                    p.id === activePageId
                        ? {
                              ...p,
                              cadElements: [...cadElements],
                              roughStrokes: [...roughStrokes],
                              viewport: { ...viewport },
                          }
                        : p
                )
            );

            // Load target page data
            setCadElements(target.cadElements);
            setRoughStrokes(target.roughStrokes);
            setViewport(target.viewport);

            // Sync settings to target page paper size
            setSettings((prev) => ({
                ...prev,
                paperSize: target.paperSize,
                canvasWidthMm: target.canvasWidthMm,
                canvasHeightMm: target.canvasHeightMm,
            }));

            // Restore history
            const savedHistory = pageHistoryRef.current[targetPageId];
            if (savedHistory) {
                historyUndoRef.current = [...savedHistory.undo];
                historyRedoRef.current = [...savedHistory.redo];
                setCanUndo(savedHistory.undo.length > 0);
                setCanRedo(savedHistory.redo.length > 0);
            } else {
                historyUndoRef.current = [];
                historyRedoRef.current = [];
                setCanUndo(false);
                setCanRedo(false);
            }

            setActivePageId(targetPageId);
        },
        [activePageId, pages, cadElements, roughStrokes, viewport]
    );

    const addPage = useCallback(
        (paperSize: PaperSize = 'A4', customName?: string) => {
            // Save current page history
            pageHistoryRef.current[activePageId] = {
                undo: [...historyUndoRef.current],
                redo: [...historyRedoRef.current],
            };

            const newId = `page_${Date.now()}`;
            const pageNum = pages.length + 1;
            const defaultName = customName || `図面 ${pageNum} (${paperSize})`;
            const info = PAPER_PRESETS[paperSize];

            const newPage: DrawingPage = {
                id: newId,
                name: defaultName,
                paperSize,
                canvasWidthMm: info.sheetWidthMm,
                canvasHeightMm: info.sheetHeightMm,
                cadElements: [],
                roughStrokes: [],
                viewport: { panX: 120, panY: 80, zoom: 0.05 },
            };

            setPages((prev) => [
                ...prev.map((p) =>
                    p.id === activePageId
                        ? {
                              ...p,
                              cadElements: [...cadElements],
                              roughStrokes: [...roughStrokes],
                              viewport: { ...viewport },
                          }
                        : p
                ),
                newPage,
            ]);

            // Switch to newly created page
            setCadElements([]);
            setRoughStrokes([]);
            setViewport({ panX: 120, panY: 80, zoom: 0.05 });
            setSettings((prev) => ({
                ...prev,
                paperSize,
                canvasWidthMm: info.sheetWidthMm,
                canvasHeightMm: info.sheetHeightMm,
            }));

            historyUndoRef.current = [];
            historyRedoRef.current = [];
            setCanUndo(false);
            setCanRedo(false);
            setActivePageId(newId);
        },
        [activePageId, pages, cadElements, roughStrokes, viewport]
    );

    const removePage = useCallback(
        (pageId: string) => {
            if (pages.length <= 1) {
                alert('最後の1ページは削除できません');
                return;
            }

            const targetIndex = pages.findIndex((p) => p.id === pageId);
            if (targetIndex === -1) return;

            const remaining = pages.filter((p) => p.id !== pageId);
            setPages(remaining);
            delete pageHistoryRef.current[pageId];

            if (activePageId === pageId) {
                const nextIndex = Math.max(0, targetIndex - 1);
                const nextTarget = remaining[nextIndex];
                setCadElements(nextTarget.cadElements);
                setRoughStrokes(nextTarget.roughStrokes);
                setViewport(nextTarget.viewport);
                setSettings((prev) => ({
                    ...prev,
                    paperSize: nextTarget.paperSize,
                    canvasWidthMm: nextTarget.canvasWidthMm,
                    canvasHeightMm: nextTarget.canvasHeightMm,
                }));
                const savedHistory = pageHistoryRef.current[nextTarget.id];
                historyUndoRef.current = savedHistory ? [...savedHistory.undo] : [];
                historyRedoRef.current = savedHistory ? [...savedHistory.redo] : [];
                setCanUndo(historyUndoRef.current.length > 0);
                setCanRedo(historyRedoRef.current.length > 0);
                setActivePageId(nextTarget.id);
            }
        },
        [pages, activePageId]
    );

    const duplicatePage = useCallback(
        (pageId: string) => {
            const targetPage = pages.find((p) => p.id === pageId);
            if (!targetPage) return;

            const currentCad = activePageId === pageId ? cadElements : targetPage.cadElements;
            const currentRough = activePageId === pageId ? roughStrokes : targetPage.roughStrokes;

            const newId = `page_${Date.now()}`;
            const duplicatedPage: DrawingPage = {
                id: newId,
                name: `${targetPage.name} のコピー`,
                paperSize: targetPage.paperSize,
                canvasWidthMm: targetPage.canvasWidthMm,
                canvasHeightMm: targetPage.canvasHeightMm,
                cadElements: JSON.parse(JSON.stringify(currentCad)),
                roughStrokes: JSON.parse(JSON.stringify(currentRough)),
                viewport: { ...targetPage.viewport },
            };

            setPages((prev) => [
                ...prev.map((p) =>
                    p.id === activePageId
                        ? {
                              ...p,
                              cadElements: [...cadElements],
                              roughStrokes: [...roughStrokes],
                              viewport: { ...viewport },
                          }
                        : p
                ),
                duplicatedPage,
            ]);

            setCadElements(duplicatedPage.cadElements);
            setRoughStrokes(duplicatedPage.roughStrokes);
            setViewport(duplicatedPage.viewport);
            setSettings((prev) => ({
                ...prev,
                paperSize: duplicatedPage.paperSize,
                canvasWidthMm: duplicatedPage.canvasWidthMm,
                canvasHeightMm: duplicatedPage.canvasHeightMm,
            }));

            historyUndoRef.current = [];
            historyRedoRef.current = [];
            setCanUndo(false);
            setCanRedo(false);
            setActivePageId(newId);
        },
        [activePageId, pages, cadElements, roughStrokes, viewport]
    );

    const renamePage = useCallback((pageId: string, newName: string) => {
        setPages((prev) =>
            prev.map((p) =>
                p.id === pageId ? { ...p, name: newName.trim() || p.name } : p
            )
        );
    }, []);

    const setPaperSize = useCallback(
        (paperSize: PaperSize) => {
            const info = PAPER_PRESETS[paperSize];
            setSettings((prev) => ({
                ...prev,
                paperSize,
                canvasWidthMm: info.sheetWidthMm,
                canvasHeightMm: info.sheetHeightMm,
            }));

            setPages((prev) =>
                prev.map((p) => {
                    if (p.id === activePageId) {
                        let updatedName = p.name;
                        if (p.name.includes('(A4)') && paperSize === 'A3') {
                            updatedName = p.name.replace('(A4)', '(A3)');
                        } else if (p.name.includes('(A3)') && paperSize === 'A4') {
                            updatedName = p.name.replace('(A3)', '(A4)');
                        }
                        return {
                            ...p,
                            name: updatedName,
                            paperSize,
                            canvasWidthMm: info.sheetWidthMm,
                            canvasHeightMm: info.sheetHeightMm,
                        };
                    }
                    return p;
                })
            );
        },
        [activePageId]
    );

    // Pen Preset Selection
    const selectPenPreset = useCallback(
        (presetId: string) => {
            const preset = penPresets.find((p) => p.id === presetId);
            if (preset) {
                setActivePenPresetId(presetId);
                setActiveHandTool(preset.tool);
                setPenColor(preset.color);
                setPenWidth(preset.width);
            }
        },
        [penPresets]
    );

    // Rotate fixture in 90 degree steps
    const rotateFixture = useCallback(() => {
        setFixtureRotation((prev) => (prev + 90) % 360);
    }, []);

    const flipFixtureHorizontal = useCallback(() => {
        setFixtureFlipH((prev) => !prev);
    }, []);

    const flipFixtureVertical = useCallback(() => {
        setFixtureFlipV((prev) => !prev);
    }, []);

    // Full Project Load (compatible with both single-page & multi-page files)
    const loadProject = useCallback((project: DrawingProject) => {
        setProjectTitle(project.title || '読込図面');
        if (project.settings) setSettings(project.settings);
        if (project.layerState) setLayerState(project.layerState);

        if (project.pages && project.pages.length > 0) {
            setPages(project.pages);
            const activeId = project.activePageId || project.pages[0].id;
            setActivePageId(activeId);
            const activePage = project.pages.find((p) => p.id === activeId) || project.pages[0];
            setCadElements(activePage.cadElements);
            setRoughStrokes(activePage.roughStrokes);
            setViewport(activePage.viewport);
        } else {
            const singlePage: DrawingPage = {
                id: 'page_1',
                name: '図面 1',
                paperSize: project.settings?.paperSize || 'A4',
                canvasWidthMm: project.settings?.canvasWidthMm || PAPER_PRESETS.A4.sheetWidthMm,
                canvasHeightMm: project.settings?.canvasHeightMm || PAPER_PRESETS.A4.sheetHeightMm,
                cadElements: project.cadElements || [],
                roughStrokes: project.roughStrokes || [],
                viewport: { panX: 120, panY: 80, zoom: 0.05 },
            };
            setPages([singlePage]);
            setActivePageId('page_1');
            setCadElements(singlePage.cadElements);
            setRoughStrokes(singlePage.roughStrokes);
        }

        historyUndoRef.current = [];
        historyRedoRef.current = [];
        pageHistoryRef.current = {};
        setCanUndo(false);
        setCanRedo(false);
    }, []);

    const getProjectExport = useCallback((): DrawingProject => {
        // Prepare updated pages with current active state
        const updatedPages = pages.map((p) =>
            p.id === activePageId
                ? {
                      ...p,
                      cadElements: [...cadElements],
                      roughStrokes: [...roughStrokes],
                      viewport: { ...viewport },
                  }
                : p
        );

        return {
            version: '1.1.0',
            title: projectTitle,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings,
            layerState,
            roughStrokes,
            cadElements,
            pages: updatedPages,
            activePageId,
        };
    }, [projectTitle, settings, layerState, roughStrokes, cadElements, pages, activePageId, viewport]);

    return {
        // Project & Settings
        projectTitle,
        setProjectTitle,
        settings,
        setSettings,
        penPresets,
        setPenPresets,

        // Pages (Tab Management)
        pages,
        setPages,
        activePageId,
        switchPage,
        addPage,
        removePage,
        duplicatePage,
        renamePage,
        setPaperSize,

        // Layers
        activeLayer,
        setActiveLayer,
        layerState,
        setLayerState,

        // Tools
        activeHandTool,
        setActiveHandTool,
        activePenPresetId,
        selectPenPreset,
        penColor,
        setPenColor,
        penWidth,
        setPenWidth,
        eraserWidth,
        setEraserWidth,

        activeCadTool,
        setActiveCadTool,
        activeFixtureId,
        setActiveFixtureId,
        fixtureRotation,
        setFixtureRotation,
        rotateFixture,
        fixtureFlipH,
        flipFixtureHorizontal,
        fixtureFlipV,
        flipFixtureVertical,
        activeRoomName,
        setActiveRoomName,
        activeTatami,
        setActiveTatami,

        // Data
        roughStrokes,
        cadElements,
        addStroke,
        updateStroke,
        removeStroke,
        updateMultipleStrokes,
        clearStrokesByEraser,
        addCadElement,
        updateCadElement,
        removeCadElement,
        updateMultipleCadElements,
        removeMultipleItems,
        clearCurrentLayer,
        clearAll,
        pushHistory,

        // Viewport
        viewport,
        setViewport,

        // History
        canUndo,
        canRedo,
        undo,
        redo,

        // IO
        loadProject,
        getProjectExport,
    };
}
