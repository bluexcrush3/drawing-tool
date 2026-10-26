import type { PenPreset, Settings, TabletPreset, PaperSize } from '../types/drawing';

export interface TabletPresetInfo {
    id: TabletPreset;
    name: string;
    widthPx: number;
    heightPx: number;
    aspectRatio: string;
    recommendedWidthMm: number;
    recommendedHeightMm: number;
}

export const TABLET_PRESETS: Record<TabletPreset, TabletPresetInfo> = {
    ipad_pro_12_9: {
        id: 'ipad_pro_12_9',
        name: 'iPad Pro 12.9" (2732 × 2048)',
        widthPx: 2732,
        heightPx: 2048,
        aspectRatio: '4:3',
        recommendedWidthMm: 21840, // 24 modules of 910mm
        recommendedHeightMm: 16380, // 18 modules of 910mm
    },
    ipad_10_9: {
        id: 'ipad_10_9',
        name: 'iPad Air / iPad 10.9" (2360 × 1640)',
        widthPx: 2360,
        heightPx: 1640,
        aspectRatio: '16.4:11.4',
        recommendedWidthMm: 20020,
        recommendedHeightMm: 14560,
    },
    ipad_mini: {
        id: 'ipad_mini',
        name: 'iPad mini 8.3" (2266 × 1488)',
        widthPx: 2266,
        heightPx: 1488,
        aspectRatio: '3:2',
        recommendedWidthMm: 18200,
        recommendedHeightMm: 12740,
    },
    surface_pro: {
        id: 'surface_pro',
        name: 'Surface Pro 13" (2880 × 1920)',
        widthPx: 2880,
        heightPx: 1920,
        aspectRatio: '3:2',
        recommendedWidthMm: 21840,
        recommendedHeightMm: 14560,
    },
    fullscreen: {
        id: 'fullscreen',
        name: '端末フルスクリーン (自動フィット)',
        widthPx: 1920,
        heightPx: 1080,
        aspectRatio: 'Auto',
        recommendedWidthMm: 20020,
        recommendedHeightMm: 14560,
    },
    custom: {
        id: 'custom',
        name: 'カスタムサイズ',
        widthPx: 2000,
        heightPx: 1500,
        aspectRatio: 'Custom',
        recommendedWidthMm: 20020,
        recommendedHeightMm: 14560,
    },
};

export const DEFAULT_PEN_PRESETS: PenPreset[] = [
    {
        id: 'pen_fine_black',
        name: '細ペン (黒)',
        tool: 'pen',
        color: '#1a1f2c',
        width: 25, // 25mm in drawing world coords
        opacity: 1.0,
    },
    {
        id: 'pen_mid_black',
        name: '中ペン (黒)',
        tool: 'pen',
        color: '#1a1f2c',
        width: 50,
        opacity: 1.0,
    },
    {
        id: 'pen_bold_black',
        name: '太ペン (黒)',
        tool: 'pen',
        color: '#1a1f2c',
        width: 90,
        opacity: 1.0,
    },
    {
        id: 'pen_blue_draft',
        name: '下書きペン (青)',
        tool: 'pen',
        color: '#2563eb',
        width: 35,
        opacity: 0.85,
    },
    {
        id: 'pen_red_mark',
        name: 'チェック (赤)',
        tool: 'pen',
        color: '#dc2626',
        width: 40,
        opacity: 0.95,
    },
    {
        id: 'marker_highlighter',
        name: '蛍光マーカー (黄)',
        tool: 'highlighter',
        color: '#eab308',
        width: 250,
        opacity: 0.45,
    },
    {
        id: 'eraser_normal',
        name: '消しゴム',
        tool: 'eraser',
        color: '#ffffff',
        width: 200,
        opacity: 1.0,
    },
];

export interface PaperPresetInfo {
    id: PaperSize;
    name: string;
    sheetWidthMm: number;
    sheetHeightMm: number;
    aspectRatio: string;
    description: string;
}

export const PAPER_PRESETS: Record<PaperSize, PaperPresetInfo> = {
    A4: {
        id: 'A4',
        name: 'A4 横',
        sheetWidthMm: 29700,
        sheetHeightMm: 21000,
        aspectRatio: '297:210',
        description: '標準用紙 (29.7m × 21.0m / 縮尺1:100)',
    },
    A3: {
        id: 'A3',
        name: 'A3 横',
        sheetWidthMm: 42000,
        sheetHeightMm: 29700,
        aspectRatio: '420:297',
        description: '大型用紙 (42.0m × 29.7m / 縮尺1:100)',
    },
};

export const DEFAULT_SETTINGS: Settings = {
    tabletPreset: 'fullscreen',
    paperSize: 'A4',
    canvasWidthMm: 29700, // A4 standard: 29.7m x 21.0m @ 1:100
    canvasHeightMm: 21000,
    scale: 100, // 1:100 standard architectural scale
    gridModuleMm: 910, // 尺モジュール (標準910mm)
    subDivisions: 2, // 455mm sub-grid
    snapEnabled: true,
    snapThresholdPx: 20, // screen pixel magnetic threshold
    handedness: 'right',
    palmRejection: true,
    showGrid: true,
    showDimensions: true,
    showRuler: true,
    wallThicknessMm: 120, // 120mm standard timber/RC wall thickness
};

export const COMMON_ROOM_PRESETS = [
    { name: 'LDK', defaultTatami: 16 },
    { name: '洋室', defaultTatami: 6 },
    { name: '主寝室', defaultTatami: 8 },
    { name: '和室', defaultTatami: 6 },
    { name: '玄関', defaultTatami: 2 },
    { name: 'ホール / 廊下', defaultTatami: 3 },
    { name: 'トイレ', defaultTatami: 1 },
    { name: '洗面脱衣室', defaultTatami: 2 },
    { name: '浴室 (UB)', defaultTatami: 2 },
    { name: 'クローゼット (WIC)', defaultTatami: 3 },
    { name: 'バルコニー', defaultTatami: 4 },
    { name: 'パントリー', defaultTatami: 1.5 },
];
