import { useState, useCallback, useRef } from 'react';
import type {
    CADElement,
    DrawingProject,
    HandStroke,
    HandToolType,
    CadToolType,
    LayerState,
    LayerType,
    PenPreset,
    Point,
    Settings,
    ViewportTransform,
} from '../types/drawing';
import { DEFAULT_SETTINGS, DEFAULT_PEN_PRESETS } from '../constants/defaultSettings';

interface HistorySnapshot {
    roughStrokes: HandStroke[];
    cadElements: CADElement[];
}

export function useDrawingState() {
    // Settings & Project metadata
    const [projectTitle, setProjectTitle] = useState('無題の間取り図面');
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [penPresets, setPenPresets] = useState<PenPreset[]>(DEFAULT_PEN_PRESETS);

    // Layer State (Opacity, Visibility, Active)
    const [activeLayer, setActiveLayer] = useState<LayerType>('cad'); // start on CAD or rough
    const [layerState, setLayerState] = useState<LayerState>({
        roughOpacity: 0.65,
        roughVisible: true,
        cadVisible: true,
        roughLocked: false,
        cadLocked: false,
    });

    // Active Tools & Pen Config
    const [activeHandTool, setActiveHandTool] = useState<HandToolType>('pen');
    const [activePenPresetId, setActivePenPresetId] = useState<string>('pen_fine_black');
    const [penColor, setPenColor] = useState<string>('#1a1f2c');
    const [penWidth, setPenWidth] = useState<number>(35); // in mm
    const [eraserWidth, setEraserWidth] = useState<number>(200);

    // Active CAD Tools & Fixture Config
    const [activeCadTool, setActiveCadTool] = useState<CadToolType>('wall');
    const [activeFixtureId, setActiveFixtureId] = useState<string>('door_single');
    const [fixtureRotation, setFixtureRotation] = useState<number>(0); // 0, 90, 180, 270
    const [fixtureFlipH, setFixtureFlipH] = useState<boolean>(false);
    const [fixtureFlipV, setFixtureFlipV] = useState<boolean>(false);
    const [activeRoomName, setActiveRoomName] = useState<string>('LDK');
    const [activeTatami, setActiveTatami] = useState<number>(16);

    // Drawing Data
    const [roughStrokes, setRoughStrokes] = useState<HandStroke[]>([]);
    const [cadElements, setCadElements] = useState<CADElement[]>([]);

    // Viewport (Pan & Zoom)
    const [viewport, setViewport] = useState<ViewportTransform>({
        panX: 120,
        panY: 80,
        zoom: 0.05, // e.g. 1px = 20mm
    });

    // History Stacks (Undo / Redo)
    const historyUndoRef = useRef<HistorySnapshot[]>([]);
    const historyRedoRef = useRef<HistorySnapshot[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const pushHistory = useCallback(() => {
        historyUndoRef.current.push({
            roughStrokes: [...roughStrokes],
            cadElements: [...cadElements],
        });
        // Limit history to 50 items for memory efficiency
        if (historyUndoRef.current.length > 50) {
            historyUndoRef.current.shift();
        }
        historyRedoRef.current = []; // clear redo on new action
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
        setCanUndo(historyUndoRef.current.length > 0);
        setCanRedo(true);
    }, [roughStrokes, cadElements]);

    const redo = useCallback(() => {
        if (historyRedoRef.current.length === 0) return;
        const next = historyRedoRef.current.pop()!;
        historyUndoRef.current.push({
            roughStrokes: [...roughStrokes],
            cadElements: [...cadElements],
        });
        setRoughStrokes(next.roughStrokes);
        setCadElements(next.cadElements);
        setCanUndo(true);
        setCanRedo(historyRedoRef.current.length > 0);
    }, [roughStrokes, cadElements]);

    // Stroke Operations
    const addStroke = useCallback(
        (stroke: HandStroke) => {
            pushHistory();
            setRoughStrokes((prev) => [...prev, stroke]);
        },
        [pushHistory]
    );

    const clearStrokesByEraser = useCallback(
        (point: Point, radiusMm: number) => {
            // Filter strokes that intersect with eraser circle
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
                    return remaining;
                }
                return prev;
            });
        },
        [pushHistory]
    );

    // CAD Operations
    const addCadElement = useCallback(
        (element: CADElement) => {
            pushHistory();
            setCadElements((prev) => [...prev, element]);
        },
        [pushHistory]
    );

    const updateCadElement = useCallback(
        (element: CADElement, recordHistory = false) => {
            if (recordHistory) pushHistory();
            setCadElements((prev) => prev.map((el) => (el.id === element.id ? element : el)));
        },
        [pushHistory]
    );

    const removeCadElement = useCallback(
        (elementId: string) => {
            pushHistory();
            setCadElements((prev) => prev.filter((el) => el.id !== elementId));
        },
        [pushHistory]
    );

    const updateStroke = useCallback(
        (stroke: HandStroke, recordHistory = false) => {
            if (recordHistory) pushHistory();
            setRoughStrokes((prev) => prev.map((s) => (s.id === stroke.id ? stroke : s)));
        },
        [pushHistory]
    );

    const removeStroke = useCallback(
        (strokeId: string) => {
            pushHistory();
            setRoughStrokes((prev) => prev.filter((s) => s.id !== strokeId));
        },
        [pushHistory]
    );

    const clearCurrentLayer = useCallback(() => {
        pushHistory();
        if (activeLayer === 'rough') {
            setRoughStrokes([]);
        } else {
            setCadElements([]);
        }
    }, [activeLayer, pushHistory]);

    const clearAll = useCallback(() => {
        pushHistory();
        setRoughStrokes([]);
        setCadElements([]);
    }, [pushHistory]);

    // Select pen preset
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

    // Full Project Load
    const loadProject = useCallback((project: DrawingProject) => {
        setProjectTitle(project.title || '読込図面');
        if (project.settings) setSettings(project.settings);
        if (project.layerState) setLayerState(project.layerState);
        if (project.roughStrokes) setRoughStrokes(project.roughStrokes);
        if (project.cadElements) setCadElements(project.cadElements);
        historyUndoRef.current = [];
        historyRedoRef.current = [];
        setCanUndo(false);
        setCanRedo(false);
    }, []);

    const getProjectExport = useCallback((): DrawingProject => {
        return {
            version: '1.0.0',
            title: projectTitle,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings,
            layerState,
            roughStrokes,
            cadElements,
        };
    }, [projectTitle, settings, layerState, roughStrokes, cadElements]);

    return {
        // Project & Settings
        projectTitle,
        setProjectTitle,
        settings,
        setSettings,
        penPresets,
        setPenPresets,

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
        clearStrokesByEraser,
        addCadElement,
        updateCadElement,
        removeCadElement,
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
