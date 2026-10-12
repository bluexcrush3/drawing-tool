import type { Point } from './drawing';

export type FixtureCategory = 'doors' | 'windows' | 'openings' | 'facilities';

export interface FixturePathInstruction {
    type: 'line' | 'arc' | 'rect' | 'circle' | 'text';
    // normalized from -0.5 to +0.5 or 0 to 1 relative to width and depth
    p1?: Point;
    p2?: Point;
    center?: Point;
    radius?: number;
    startAngle?: number; // radians
    endAngle?: number;
    rect?: { x: number; y: number; w: number; h: number };
    filled?: boolean;
    text?: string;
    dashed?: boolean;
}

export interface FixtureDefinition {
    id: string;
    name: string;
    category: FixtureCategory;
    defaultWidthMm: number;
    defaultDepthMm: number;
    iconName?: string;
    description: string;
    geometry: FixturePathInstruction[];
}
