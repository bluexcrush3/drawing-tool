import type { Point, ViewportTransform } from '../types/drawing';

export function worldToScreen(worldPoint: Point, transform: ViewportTransform): Point {
    return {
        x: worldPoint.x * transform.zoom + transform.panX,
        y: worldPoint.y * transform.zoom + transform.panY,
    };
}

export function screenToWorld(screenPoint: Point, transform: ViewportTransform): Point {
    return {
        x: (screenPoint.x - transform.panX) / transform.zoom,
        y: (screenPoint.y - transform.panY) / transform.zoom,
    };
}

export function distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function snapToGrid(
    rawWorldPoint: Point,
    gridModuleMm: number,
    subDivisions: number = 2
): Point {
    const step = gridModuleMm / (subDivisions > 0 ? subDivisions : 1);
    return {
        x: Math.round(rawWorldPoint.x / step) * step,
        y: Math.round(rawWorldPoint.y / step) * step,
    };
}

export interface SnapResult {
    point: Point;
    snapped: boolean;
    type: 'grid' | 'endpoint' | 'orthogonal' | 'none';
    guideLine?: { p1: Point; p2: Point };
}

export function getMagneticSnap(
    screenPoint: Point,
    transform: ViewportTransform,
    gridModuleMm: number,
    subDivisions: number,
    thresholdPx: number,
    candidatePoints: Point[] = []
): SnapResult {
    const worldPoint = screenToWorld(screenPoint, transform);

    // 1. Check existing object endpoints first (highest priority)
    for (const cand of candidatePoints) {
        const candScreen = worldToScreen(cand, transform);
        const d = distance(screenPoint, candScreen);
        if (d <= thresholdPx) {
            return {
                point: cand,
                snapped: true,
                type: 'endpoint',
            };
        }
    }

    // 2. Check grid magnetic snap
    const gridPoint = snapToGrid(worldPoint, gridModuleMm, subDivisions);
    const gridScreen = worldToScreen(gridPoint, transform);
    const dGrid = distance(screenPoint, gridScreen);

    if (dGrid <= thresholdPx) {
        return {
            point: gridPoint,
            snapped: true,
            type: 'grid',
        };
    }

    // No snap triggered
    return {
        point: worldPoint,
        snapped: false,
        type: 'none',
    };
}

/**
 * Constrains endPoint to horizontal / vertical (orthogonal) relative to startPoint
 */
export function constrainOrthogonal(start: Point, current: Point): Point {
    const dx = Math.abs(current.x - start.x);
    const dy = Math.abs(current.y - start.y);
    if (dx >= dy) {
        return { x: current.x, y: start.y };
    } else {
        return { x: start.x, y: current.y };
    }
}
