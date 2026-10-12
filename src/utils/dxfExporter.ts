import type { CADElement, HandStroke } from '../types/drawing';
import { FIXTURE_LIBRARY } from '../constants/fixtureLibrary';

export interface DXFExportOptions {
    includeCad: boolean;
    includeRough: boolean;
    drawingTitle?: string;
    scale?: number;
}

/**
 * Generates an AutoCAD R12 / standard ASCII DXF string.
 * Coordinates are in real-world millimeters (mm), directly compatible with Jw_cad & AutoCAD!
 */
export function generateDXF(
    cadElements: CADElement[],
    roughStrokes: HandStroke[],
    options: DXFExportOptions
): string {
    const lines: string[] = [];

    function add(code: number | string, val: number | string) {
        lines.push(code.toString());
        lines.push(val.toString());
    }

    // 1. HEADER SECTION
    add(0, 'SECTION');
    add(2, 'HEADER');
    add(9, '$ACADVER');
    add(1, 'AC1009'); // AutoCAD R12 format (universal CAD compatibility)
    add(9, '$INSUNITS');
    add(70, 4); // 4 = Millimeters
    add(0, 'ENDSEC');

    // 2. TABLES SECTION (Layer definitions)
    add(0, 'SECTION');
    add(2, 'TABLES');
    add(0, 'TABLE');
    add(2, 'LAYER');
    add(70, 4);

    // Layer WALL (Color 7: White/Black)
    add(0, 'LAYER');
    add(2, 'WALL');
    add(70, 0);
    add(62, 7);
    add(6, 'CONTINUOUS');

    // Layer FIXTURE (Color 3: Green)
    add(0, 'LAYER');
    add(2, 'FIXTURE');
    add(70, 0);
    add(62, 3);
    add(6, 'CONTINUOUS');

    // Layer DIMENSION (Color 1: Red)
    add(0, 'LAYER');
    add(2, 'DIMENSION');
    add(70, 0);
    add(62, 1);
    add(6, 'CONTINUOUS');

    // Layer ROUGH_SKETCH (Color 5: Blue)
    add(0, 'LAYER');
    add(2, 'ROUGH_SKETCH');
    add(70, 0);
    add(62, 5);
    add(6, 'CONTINUOUS');

    add(0, 'ENDTAB');
    add(0, 'ENDSEC');

    // 3. ENTITIES SECTION
    add(0, 'SECTION');
    add(2, 'ENTITIES');

    // Export CAD Elements
    if (options.includeCad) {
        for (const el of cadElements) {
            if (el.type === 'wall') {
                // Wall centerline or double line
                add(0, 'LINE');
                add(8, 'WALL');
                add(10, el.p1.x);
                add(20, -el.p1.y); // DXF Y axis points up, canvas Y points down
                add(30, 0.0);
                add(11, el.p2.x);
                add(21, -el.p2.y);
                add(31, 0.0);
            } else if (el.type === 'line') {
                add(0, 'LINE');
                add(8, 'WALL');
                add(10, el.p1.x);
                add(20, -el.p1.y);
                add(30, 0.0);
                add(11, el.p2.x);
                add(21, -el.p2.y);
                add(31, 0.0);
            } else if (el.type === 'rect') {
                // 4 lines
                const pts = [
                    { x: el.p1.x, y: el.p1.y },
                    { x: el.p2.x, y: el.p1.y },
                    { x: el.p2.x, y: el.p2.y },
                    { x: el.p1.x, y: el.p2.y },
                ];
                for (let i = 0; i < 4; i++) {
                    const next = pts[(i + 1) % 4];
                    add(0, 'LINE');
                    add(8, 'WALL');
                    add(10, pts[i].x);
                    add(20, -pts[i].y);
                    add(30, 0.0);
                    add(11, next.x);
                    add(21, -next.y);
                    add(31, 0.0);
                }
            } else if (el.type === 'fixture') {
                const def = FIXTURE_LIBRARY.find((f) => f.id === el.fixtureId);
                if (def) {
                    const rad = (el.rotation * Math.PI) / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    const fx = el.flipH ? -1 : 1;
                    const fy = el.flipV ? -1 : 1;

                    const toWorld = (p: { x: number; y: number }) => {
                        const rx = p.x * el.widthMm * fx;
                        const ry = p.y * el.depthMm * fy;
                        const tx = rx * cos - ry * sin;
                        const ty = rx * sin + ry * cos;
                        return {
                            x: el.position.x + tx,
                            y: -(el.position.y + ty),
                        };
                    };

                    for (const geom of def.geometry) {
                        if (geom.type === 'line' && geom.p1 && geom.p2) {
                            const p1 = toWorld(geom.p1);
                            const p2 = toWorld(geom.p2);
                            add(0, 'LINE');
                            add(8, 'FIXTURE');
                            add(10, p1.x);
                            add(20, p1.y);
                            add(30, 0.0);
                            add(11, p2.x);
                            add(21, p2.y);
                            add(31, 0.0);
                        } else if (geom.type === 'rect' && geom.rect) {
                            const r = geom.rect;
                            const pA = toWorld({ x: r.x, y: r.y });
                            const pB = toWorld({ x: r.x + r.w, y: r.y });
                            const pC = toWorld({ x: r.x + r.w, y: r.y + r.h });
                            const pD = toWorld({ x: r.x, y: r.y + r.h });
                            const pts = [pA, pB, pC, pD];
                            for (let i = 0; i < 4; i++) {
                                const next = pts[(i + 1) % 4];
                                add(0, 'LINE');
                                add(8, 'FIXTURE');
                                add(10, pts[i].x);
                                add(20, pts[i].y);
                                add(30, 0.0);
                                add(11, next.x);
                                add(21, next.y);
                                add(31, 0.0);
                            }
                        } else if (geom.type === 'arc' && geom.center && geom.radius) {
                            const c = toWorld(geom.center);
                            const radiusMm = geom.radius * el.widthMm;
                            // Add approximated polyline or ARC
                            add(0, 'ARC');
                            add(8, 'FIXTURE');
                            add(10, c.x);
                            add(20, c.y);
                            add(30, 0.0);
                            add(40, radiusMm);
                            // Calculate angles in degrees
                            let sDeg = (((geom.startAngle || 0) + (el.rotation * Math.PI) / 180) * 180) / Math.PI;
                            let eDeg = (((geom.endAngle || 0) + (el.rotation * Math.PI) / 180) * 180) / Math.PI;
                            add(50, sDeg % 360);
                            add(51, eDeg % 360);
                        }
                    }
                }
            } else if (el.type === 'dimension') {
                // Dimension line
                add(0, 'LINE');
                add(8, 'DIMENSION');
                add(10, el.p1.x);
                add(20, -el.p1.y);
                add(30, 0.0);
                add(11, el.p2.x);
                add(21, -el.p2.y);
                add(31, 0.0);

                const dx = el.p2.x - el.p1.x;
                const dy = el.p2.y - el.p1.y;
                const len = Math.round(Math.sqrt(dx * dx + dy * dy));
                const mx = (el.p1.x + el.p2.x) / 2;
                const my = -(el.p1.y + el.p2.y) / 2 + 100;

                add(0, 'TEXT');
                add(8, 'DIMENSION');
                add(10, mx);
                add(20, my);
                add(30, 0.0);
                add(40, 150); // Height mm
                add(1, `${len}mm`);
            } else if (el.type === 'room') {
                add(0, 'TEXT');
                add(8, 'WALL');
                add(10, el.position.x);
                add(20, -el.position.y);
                add(30, 0.0);
                add(40, 250); // Text height mm
                add(1, el.name + (el.tatami ? ` (${el.tatami}帖)` : ''));
            }
        }
    }

    // Export Rough Hand-Drawn Strokes as 3D Polylines / Lines
    if (options.includeRough) {
        for (const stroke of roughStrokes) {
            if (stroke.points.length < 2) continue;
            for (let i = 0; i < stroke.points.length - 1; i++) {
                const p1 = stroke.points[i];
                const p2 = stroke.points[i + 1];
                add(0, 'LINE');
                add(8, 'ROUGH_SKETCH');
                add(10, p1.x);
                add(20, -p1.y);
                add(30, 0.0);
                add(11, p2.x);
                add(21, -p2.y);
                add(31, 0.0);
            }
        }
    }

    add(0, 'ENDSEC');
    add(0, 'EOF');

    return lines.join('\r\n') + '\r\n';
}
