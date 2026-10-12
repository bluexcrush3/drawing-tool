export interface Point {
  x: number;
  y: number;
}

export type LayerType = 'rough' | 'cad';

export type TabletPreset = 'ipad_pro_12_9' | 'ipad_10_9' | 'ipad_mini' | 'surface_pro' | 'fullscreen' | 'custom';

export type HandToolType = 'pen' | 'highlighter' | 'eraser';

export type CadToolType = 'wall' | 'line' | 'rect' | 'fixture' | 'dimension' | 'room' | 'select' | 'pan';

export interface PenPreset {
  id: string;
  name: string;
  tool: HandToolType;
  color: string;
  width: number; // width in canvas mm
  opacity: number;
}

export interface Settings {
  tabletPreset: TabletPreset;
  canvasWidthMm: number; // e.g. 18200 (20 x 910mm grids)
  canvasHeightMm: number; // e.g. 13650 (15 x 910mm grids)
  scale: number; // e.g. 100 for 1:100, 50 for 1:50
  gridModuleMm: number; // default 910 (尺モジュール) or 1000 (メーターモジュール)
  subDivisions: number; // e.g. 2 -> 455mm or 500mm
  snapEnabled: boolean;
  snapThresholdPx: number; // magnetic snap sensitivity in screen px
  handedness: 'right' | 'left'; // tool dock placement
  palmRejection: boolean;
  showGrid: boolean;
  showDimensions: boolean;
  showRuler: boolean;
  wallThicknessMm: number; // default 120mm
}

export interface LayerState {
  roughOpacity: number; // 0 to 1
  roughVisible: boolean;
  cadVisible: boolean;
  roughLocked: boolean;
  cadLocked: boolean;
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface HandStroke {
  id: string;
  tool: HandToolType;
  color: string;
  width: number;
  opacity: number;
  points: StrokePoint[];
  timestamp: number;
}

export interface WallElement {
  id: string;
  type: 'wall';
  p1: Point;
  p2: Point;
  thickness: number;
  wallType?: 'exterior' | 'interior';
}

export interface LineElement {
  id: string;
  type: 'line';
  p1: Point;
  p2: Point;
  color: string;
  width: number;
  lineStyle?: 'solid' | 'dashed';
}

export interface RectElement {
  id: string;
  type: 'rect';
  p1: Point;
  p2: Point;
  filled?: boolean;
  fillColor?: string;
  strokeColor?: string;
}

export interface FixtureElement {
  id: string;
  type: 'fixture';
  fixtureId: string;
  name: string;
  position: Point; // center or reference anchor
  rotation: number; // 0, 90, 180, 270 degrees
  flipH: boolean;
  flipV: boolean;
  widthMm: number;
  depthMm: number;
}

export interface DimensionElement {
  id: string;
  type: 'dimension';
  p1: Point;
  p2: Point;
  offsetMm: number;
  text?: string;
}

export interface RoomElement {
  id: string;
  type: 'room';
  position: Point;
  name: string;
  tatami?: number; // 帖数 (Jō)
}

export type CADElement =
  | WallElement
  | LineElement
  | RectElement
  | FixtureElement
  | DimensionElement
  | RoomElement;

export interface DrawingProject {
  version: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  settings: Settings;
  layerState: LayerState;
  roughStrokes: HandStroke[];
  cadElements: CADElement[];
}

export interface ViewportTransform {
  panX: number;
  panY: number;
  zoom: number;
}
