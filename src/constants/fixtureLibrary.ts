import type { FixtureDefinition } from '../types/fixtures';

export const FIXTURE_LIBRARY: FixtureDefinition[] = [
    // --- DOORS (扉) ---
    {
        id: 'door_single',
        name: '片開きドア',
        category: 'doors',
        defaultWidthMm: 910,
        defaultDepthMm: 910,
        description: '標準的な片開きドア（開口910mm）。90度円弧と扉線',
        geometry: [
            // Frame / Opening base line
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: 0.5, y: 0 }, dashed: true },
            // Door leaf (when swung open 90 degrees upward)
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: -0.5, y: 1 } },
            // Swing arc from (0.5, 0) to (-0.5, 1) around center (-0.5, 0)
            {
                type: 'arc',
                center: { x: -0.5, y: 0 },
                radius: 1, // normalized to width
                startAngle: 0,
                endAngle: Math.PI / 2,
            },
            // Door jamb / frame ticks
            { type: 'rect', rect: { x: -0.52, y: -0.06, w: 0.04, h: 0.12 }, filled: true },
            { type: 'rect', rect: { x: 0.48, y: -0.06, w: 0.04, h: 0.12 }, filled: true },
        ],
    },
    {
        id: 'door_sliding_single',
        name: '片引き戸',
        category: 'doors',
        defaultWidthMm: 910,
        defaultDepthMm: 120,
        description: '壁沿いにスライドする片引き戸',
        geometry: [
            // Wall opening line
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: 0.5, y: 0 }, dashed: true },
            // Sliding rail track
            { type: 'line', p1: { x: -0.5, y: 0.2 }, p2: { x: 1.0, y: 0.2 } },
            // Door panel
            { type: 'rect', rect: { x: -0.48, y: 0.1, w: 0.96, h: 0.2 }, filled: false },
            // Frame ticks
            { type: 'rect', rect: { x: -0.52, y: -0.1, w: 0.04, h: 0.2 }, filled: true },
            { type: 'rect', rect: { x: 0.48, y: -0.1, w: 0.04, h: 0.2 }, filled: true },
        ],
    },
    {
        id: 'door_sliding_double',
        name: '引違い戸',
        category: 'doors',
        defaultWidthMm: 1820,
        defaultDepthMm: 120,
        description: '和室や間仕切り用の2枚引違い戸',
        geometry: [
            // Opening base line
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: 0.5, y: 0 }, dashed: true },
            // Left sash (inside)
            { type: 'rect', rect: { x: -0.5, y: -0.2, w: 0.53, h: 0.16 }, filled: false },
            // Right sash (outside)
            { type: 'rect', rect: { x: -0.03, y: 0.05, w: 0.53, h: 0.16 }, filled: false },
            // Frame posts
            { type: 'rect', rect: { x: -0.52, y: -0.3, w: 0.04, h: 0.6 }, filled: true },
            { type: 'rect', rect: { x: 0.48, y: -0.3, w: 0.04, h: 0.6 }, filled: true },
        ],
    },
    {
        id: 'door_parent_child',
        name: '親子ドア',
        category: 'doors',
        defaultWidthMm: 1365,
        defaultDepthMm: 910,
        description: '玄関等に使用される親扉＋子扉の開き戸',
        geometry: [
            // Base line
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: 0.5, y: 0 }, dashed: true },
            // Main door leaf (left ~67% width)
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: -0.5, y: 0.67 } },
            // Main arc
            {
                type: 'arc',
                center: { x: -0.5, y: 0 },
                radius: 0.67,
                startAngle: 0,
                endAngle: Math.PI / 2,
            },
            // Sub door leaf (right ~33% width)
            { type: 'line', p1: { x: 0.5, y: 0 }, p2: { x: 0.5, y: 0.33 } },
            // Sub arc
            {
                type: 'arc',
                center: { x: 0.5, y: 0 },
                radius: 0.33,
                startAngle: Math.PI / 2,
                endAngle: Math.PI,
            },
            // Jambs
            { type: 'rect', rect: { x: -0.52, y: -0.06, w: 0.04, h: 0.12 }, filled: true },
            { type: 'rect', rect: { x: 0.48, y: -0.06, w: 0.04, h: 0.12 }, filled: true },
        ],
    },
    {
        id: 'door_double',
        name: '両開きドア',
        category: 'doors',
        defaultWidthMm: 1820,
        defaultDepthMm: 910,
        description: '観音開きの両開きドア',
        geometry: [
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: 0.5, y: 0 }, dashed: true },
            // Left leaf & arc
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: -0.5, y: 0.5 } },
            { type: 'arc', center: { x: -0.5, y: 0 }, radius: 0.5, startAngle: 0, endAngle: Math.PI / 2 },
            // Right leaf & arc
            { type: 'line', p1: { x: 0.5, y: 0 }, p2: { x: 0.5, y: 0.5 } },
            { type: 'arc', center: { x: 0.5, y: 0 }, radius: 0.5, startAngle: Math.PI / 2, endAngle: Math.PI },
            // Jambs
            { type: 'rect', rect: { x: -0.52, y: -0.06, w: 0.04, h: 0.12 }, filled: true },
            { type: 'rect', rect: { x: 0.48, y: -0.06, w: 0.04, h: 0.12 }, filled: true },
        ],
    },
    {
        id: 'door_folding',
        name: '折れ戸',
        category: 'doors',
        defaultWidthMm: 910,
        defaultDepthMm: 300,
        description: 'クローゼットや浴室用の折れ戸',
        geometry: [
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: 0.5, y: 0 }, dashed: true },
            // Folded V shape leaf
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: -0.15, y: 0.7 } },
            { type: 'line', p1: { x: -0.15, y: 0.7 }, p2: { x: 0.2, y: 0.1 } },
            { type: 'line', p1: { x: 0.2, y: 0.1 }, p2: { x: 0.5, y: 0 } },
        ],
    },

    // --- WINDOWS (窓) ---
    {
        id: 'window_sliding',
        name: '引違い窓',
        category: 'windows',
        defaultWidthMm: 1650,
        defaultDepthMm: 120,
        description: '一般的な引き違い腰窓',
        geometry: [
            // Wall cut lines
            { type: 'line', p1: { x: -0.5, y: -0.3 }, p2: { x: -0.5, y: 0.3 } },
            { type: 'line', p1: { x: 0.5, y: -0.3 }, p2: { x: 0.5, y: 0.3 } },
            // Window sill lines
            { type: 'line', p1: { x: -0.52, y: -0.25 }, p2: { x: 0.52, y: -0.25 } },
            { type: 'line', p1: { x: -0.52, y: 0.25 }, p2: { x: 0.52, y: 0.25 } },
            // Two overlapping sashes
            { type: 'rect', rect: { x: -0.48, y: -0.18, w: 0.5, h: 0.14 } },
            { type: 'rect', rect: { x: -0.02, y: 0.04, w: 0.5, h: 0.14 } },
        ],
    },
    {
        id: 'window_sweep',
        name: '掃き出し窓',
        category: 'windows',
        defaultWidthMm: 1820,
        defaultDepthMm: 150,
        description: 'バルコニーや庭に面する大開口の掃き出し窓',
        geometry: [
            { type: 'line', p1: { x: -0.5, y: -0.4 }, p2: { x: -0.5, y: 0.4 } },
            { type: 'line', p1: { x: 0.5, y: -0.4 }, p2: { x: 0.5, y: 0.4 } },
            // Wide sills
            { type: 'line', p1: { x: -0.54, y: -0.35 }, p2: { x: 0.54, y: -0.35 } },
            { type: 'line', p1: { x: -0.54, y: 0.35 }, p2: { x: 0.54, y: 0.35 } },
            // Inner / outer glass sashes
            { type: 'rect', rect: { x: -0.48, y: -0.2, w: 0.51, h: 0.16 } },
            { type: 'rect', rect: { x: -0.03, y: 0.04, w: 0.51, h: 0.16 } },
        ],
    },
    {
        id: 'window_fix',
        name: 'FIX窓',
        category: 'windows',
        defaultWidthMm: 910,
        defaultDepthMm: 120,
        description: '開閉しない固定明かり取り窓',
        geometry: [
            { type: 'line', p1: { x: -0.5, y: -0.3 }, p2: { x: -0.5, y: 0.3 } },
            { type: 'line', p1: { x: 0.5, y: -0.3 }, p2: { x: 0.5, y: 0.3 } },
            { type: 'line', p1: { x: -0.5, y: -0.2 }, p2: { x: 0.5, y: -0.2 } },
            { type: 'line', p1: { x: -0.5, y: 0.2 }, p2: { x: 0.5, y: 0.2 } },
            // Single pane centered
            { type: 'line', p1: { x: -0.48, y: 0 }, p2: { x: 0.48, y: 0 } },
            { type: 'text', text: 'FIX', center: { x: 0, y: 0 } },
        ],
    },

    // --- OPENINGS (開口) ---
    {
        id: 'opening',
        name: '開口部',
        category: 'openings',
        defaultWidthMm: 910,
        defaultDepthMm: 120,
        description: '扉のない通路・オープン開口',
        geometry: [
            { type: 'line', p1: { x: -0.5, y: -0.3 }, p2: { x: -0.5, y: 0.3 } },
            { type: 'line', p1: { x: 0.5, y: -0.3 }, p2: { x: 0.5, y: 0.3 } },
            { type: 'line', p1: { x: -0.5, y: 0 }, p2: { x: 0.5, y: 0 }, dashed: true },
        ],
    },

    // --- FACILITIES (水回り・設備) ---
    {
        id: 'toilet',
        name: '洋式便器',
        category: 'facilities',
        defaultWidthMm: 800,
        defaultDepthMm: 600,
        description: '水洗洋式トイレ便器・タンク',
        geometry: [
            // Water tank
            { type: 'rect', rect: { x: -0.4, y: -0.45, w: 0.8, h: 0.28 }, filled: false },
            // Toilet bowl body
            { type: 'rect', rect: { x: -0.28, y: -0.17, w: 0.56, h: 0.6 }, filled: false },
            // Bowl oval / inner seat
            { type: 'circle', center: { x: 0, y: 0.15 }, radius: 0.22 },
            { type: 'text', text: 'WC', center: { x: 0, y: 0.15 } },
        ],
    },
    {
        id: 'unit_bath',
        name: 'ユニットバス 1616',
        category: 'facilities',
        defaultWidthMm: 1600,
        defaultDepthMm: 1600,
        description: '1坪タイプユニットバス（浴槽＋洗い場）',
        geometry: [
            // Outer enclosure
            { type: 'rect', rect: { x: -0.5, y: -0.5, w: 1.0, h: 1.0 }, filled: false },
            // Bathtub
            { type: 'rect', rect: { x: -0.45, y: -0.45, w: 0.45, h: 0.9 }, filled: false },
            // Inner tub curve
            { type: 'circle', center: { x: -0.225, y: -0.2 }, radius: 0.15 },
            // Drain symbol in washing floor
            { type: 'circle', center: { x: 0.25, y: 0.25 }, radius: 0.06 },
            { type: 'text', text: 'UB 1616', center: { x: 0.25, y: -0.2 } },
        ],
    },
    {
        id: 'washbasin',
        name: '洗面化粧台',
        category: 'facilities',
        defaultWidthMm: 750,
        defaultDepthMm: 550,
        description: '標準洗面化粧台（ボウル＋カウンター）',
        geometry: [
            { type: 'rect', rect: { x: -0.5, y: -0.5, w: 1.0, h: 1.0 }, filled: false },
            // Oval wash basin
            { type: 'circle', center: { x: 0, y: 0 }, radius: 0.32 },
            // Faucet
            { type: 'line', p1: { x: 0, y: -0.45 }, p2: { x: 0, y: -0.25 } },
            { type: 'text', text: '洗面', center: { x: 0, y: 0 } },
        ],
    },
    {
        id: 'kitchen',
        name: 'システムキッチン',
        category: 'facilities',
        defaultWidthMm: 2100,
        defaultDepthMm: 650,
        description: 'シンク・調理スペース・コンロ付きキッチンカウンター',
        geometry: [
            // Overall counter
            { type: 'rect', rect: { x: -0.5, y: -0.5, w: 1.0, h: 1.0 }, filled: false },
            // Sink on left
            { type: 'rect', rect: { x: -0.42, y: -0.38, w: 0.35, h: 0.76 } },
            // Faucet circle
            { type: 'circle', center: { x: -0.25, y: -0.2 }, radius: 0.05 },
            // 3-burner stovetop on right
            { type: 'circle', center: { x: 0.2, y: -0.15 }, radius: 0.12 },
            { type: 'circle', center: { x: 0.38, y: -0.15 }, radius: 0.1 },
            { type: 'circle', center: { x: 0.29, y: 0.18 }, radius: 0.14 },
            { type: 'text', text: 'キッチン', center: { x: 0, y: 0.2 } },
        ],
    },
    {
        id: 'stairs',
        name: '階段',
        category: 'facilities',
        defaultWidthMm: 910,
        defaultDepthMm: 1820,
        description: '上り矢印付きの直階段',
        geometry: [
            { type: 'rect', rect: { x: -0.5, y: -0.5, w: 1.0, h: 1.0 }, filled: false },
            // Treads / Risers lines
            { type: 'line', p1: { x: -0.5, y: -0.35 }, p2: { x: 0.5, y: -0.35 } },
            { type: 'line', p1: { x: -0.5, y: -0.2 }, p2: { x: 0.5, y: -0.2 } },
            { type: 'line', p1: { x: -0.5, y: -0.05 }, p2: { x: 0.5, y: -0.05 } },
            { type: 'line', p1: { x: -0.5, y: 0.1 }, p2: { x: 0.5, y: 0.1 } },
            { type: 'line', p1: { x: -0.5, y: 0.25 }, p2: { x: 0.5, y: 0.25 } },
            { type: 'line', p1: { x: -0.5, y: 0.4 }, p2: { x: 0.5, y: 0.4 } },
            // Up direction arrow line
            { type: 'line', p1: { x: 0, y: 0.45 }, p2: { x: 0, y: -0.4 } },
            // Arrow head
            { type: 'line', p1: { x: 0, y: -0.4 }, p2: { x: -0.15, y: -0.25 } },
            { type: 'line', p1: { x: 0, y: -0.4 }, p2: { x: 0.15, y: -0.25 } },
            { type: 'text', text: 'UP', center: { x: 0, y: -0.46 } },
        ],
    },
];
