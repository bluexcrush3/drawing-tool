import type { CADElement, HandStroke, Point } from '../types/drawing';
import { distance } from './coordinate';

function distToSegment(p: Point, v: Point, w: Point): number {
    const l2 = (w.x - v.x) * (w.x - v.x) + (w.y - v.y) * (w.y - v.y);
    if (l2 === 0) return distance(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj: Point = {
        x: v.x + t * (w.x - v.x),
        y: v.y + t * (w.y - v.y),
    };
    return distance(p, proj);
}

export interface HitResult {
    element: CADElement | HandStroke;
    type: 'cad' | 'stroke';
    id: string;
}

export function hitTestCadElement(
    worldPt: Point,
    cadElements: CADElement[],
    toleranceMm: number = 200
): CADElement | null {
    // Reverse iterate so top-most elements hit first
    for (let i = cadElements.length - 1; i >= 0; i--) {
        const el = cadElements[i];

        if (el.type === 'wall') {
            const d = distToSegment(worldPt, el.p1, el.p2);
            const r = Math.max(toleranceMm, (el.thickness || 120) / 2 + 50);
            if (d <= r) return el;
        } else if (el.type === 'line') {
            const d = distToSegment(worldPt, el.p1, el.p2);
            const r = Math.max(toleranceMm, (el.width || 40) / 2 + 60);
            if (d <= r) return el;
        } else if (el.type === 'rect') {
            const minX = Math.min(el.p1.x, el.p2.x);
            const maxX = Math.max(el.p1.x, el.p2.x);
            const minY = Math.min(el.p1.y, el.p2.y);
            const maxY = Math.max(el.p1.y, el.p2.y);

            // Inside rect or near border
            const isInside =
                worldPt.x >= minX - toleranceMm &&
                worldPt.x <= maxX + toleranceMm &&
                worldPt.y >= minY - toleranceMm &&
                worldPt.y <= maxY + toleranceMm;

            if (isInside) {
                // If filled, any point inside hits; if not, check distance to 4 segments
                if (el.filled) return el;
                const d1 = distToSegment(worldPt, { x: minX, y: minY }, { x: maxX, y: minY });
                const d2 = distToSegment(worldPt, { x: maxX, y: minY }, { x: maxX, y: maxY });
                const d3 = distToSegment(worldPt, { x: maxX, y: maxY }, { x: minX, y: maxY });
                const d4 = distToSegment(worldPt, { x: minX, y: maxY }, { x: minX, y: minY });
                if (Math.min(d1, d2, d3, d4) <= toleranceMm) return el;
            }
        } else if (el.type === 'fixture') {
            // Local coordinates relative to fixture center
            const dx = worldPt.x - el.position.x;
            const dy = worldPt.y - el.position.y;
            const rad = (-el.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            const halfW = el.widthMm / 2 + toleranceMm;
            const halfD = el.depthMm / 2 + toleranceMm;

            // Simple hit area covering the fixture footprint
            if (
                localX >= -halfW &&
                localX <= halfW &&
                localY >= -halfD &&
                localY <= halfD
            ) {
                return el;
            }
        } else if (el.type === 'room') {
            const halfW = 400 + toleranceMm;
            const halfH = 250 + toleranceMm;
            if (
                Math.abs(worldPt.x - el.position.x) <= halfW &&
                Math.abs(worldPt.y - el.position.y) <= halfH
            ) {
                return el;
            }
        } else if (el.type === 'dimension') {
            const d = distToSegment(worldPt, el.p1, el.p2);
            if (d <= toleranceMm) return el;
        }
    }
    return null;
}

export function hitTestHandStroke(
    worldPt: Point,
    strokes: HandStroke[],
    toleranceMm: number = 150
): HandStroke | null {
    for (let i = strokes.length - 1; i >= 0; i--) {
        const stroke = strokes[i];
        if (stroke.points.length < 2) continue;

        // Quick bounding box check
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const p of stroke.points) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        const r = Math.max(toleranceMm, stroke.width / 2 + 50);
        if (
            worldPt.x < minX - r ||
            worldPt.x > maxX + r ||
            worldPt.y < minY - r ||
            worldPt.y > maxY + r
        ) {
            continue;
        }

        // Detailed segment check
        for (let j = 0; j < stroke.points.length - 1; j++) {
            const d = distToSegment(worldPt, stroke.points[j], stroke.points[j + 1]);
            if (d <= r) return stroke;
        }
    }
    return null;
}

export interface BoxRegion {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

// CCW orientation check for line segments intersection
function ccw(p1: Point, p2: Point, p3: Point): boolean {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
    return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

function isSegmentInOrIntersectingBox(p1: Point, p2: Point, box: BoxRegion): boolean {
    // 1. Either endpoint is inside the box
    if (
        (p1.x >= box.minX && p1.x <= box.maxX && p1.y >= box.minY && p1.y <= box.maxY) ||
        (p2.x >= box.minX && p2.x <= box.maxX && p2.y >= box.minY && p2.y <= box.maxY)
    ) {
        return true;
    }

    // 2. Or segment intersects any of the 4 bounding box edges
    const pTopLeft: Point = { x: box.minX, y: box.minY };
    const pTopRight: Point = { x: box.maxX, y: box.minY };
    const pBottomRight: Point = { x: box.maxX, y: box.maxY };
    const pBottomLeft: Point = { x: box.minX, y: box.maxY };

    if (segmentsIntersect(p1, p2, pTopLeft, pTopRight)) return true;
    if (segmentsIntersect(p1, p2, pTopRight, pBottomRight)) return true;
    if (segmentsIntersect(p1, p2, pBottomRight, pBottomLeft)) return true;
    if (segmentsIntersect(p1, p2, pBottomLeft, pTopLeft)) return true;

    return false;
}

export function boxSelectCadElements(box: BoxRegion, cadElements: CADElement[]): CADElement[] {
    return cadElements.filter((el) => {
        if (el.type === 'wall' || el.type === 'line' || el.type === 'dimension') {
            return isSegmentInOrIntersectingBox(el.p1, el.p2, box);
        } else if (el.type === 'rect') {
            const minX = Math.min(el.p1.x, el.p2.x);
            const maxX = Math.max(el.p1.x, el.p2.x);
            const minY = Math.min(el.p1.y, el.p2.y);
            const maxY = Math.max(el.p1.y, el.p2.y);
            return maxX >= box.minX && minX <= box.maxX && maxY >= box.minY && minY <= box.maxY;
        } else if (el.type === 'fixture') {
            const halfW = (el.widthMm || 800) / 2;
            const halfD = (el.depthMm || 800) / 2;
            return (
                el.position.x + halfW >= box.minX &&
                el.position.x - halfW <= box.maxX &&
                el.position.y + halfD >= box.minY &&
                el.position.y - halfD <= box.maxY
            );
        } else if (el.type === 'room') {
            return (
                el.position.x >= box.minX - 400 &&
                el.position.x <= box.maxX + 400 &&
                el.position.y >= box.minY - 250 &&
                el.position.y <= box.maxY + 250
            );
        }
        return false;
    });
}

export function boxSelectStrokes(box: BoxRegion, strokes: HandStroke[]): HandStroke[] {
    return strokes.filter((stroke) => {
        return stroke.points.some(
            (p) => p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY
        );
    });
}

