import type { CADElement, HandStroke, Settings } from '../types/drawing';
import { FIXTURE_LIBRARY } from '../constants/fixtureLibrary';

export interface ImageExportOptions {
    includeCad: boolean;
    includeRough: boolean;
    includeGrid?: boolean;
    resolutionScale?: number; // default 2 or 3 for crisp 300dpi style export
}

export async function exportToPNG(
    cadElements: CADElement[],
    roughStrokes: HandStroke[],
    settings: Settings,
    options: ImageExportOptions
): Promise<string> {
    const scale = options.resolutionScale || 2;
    // Calculate canvas size based on mm (e.g. 1px = 10mm at scale 1:1)
    const pxPerMm = 0.1 * scale;
    const widthPx = Math.round(settings.canvasWidthMm * pxPerMm);
    const heightPx = Math.round(settings.canvasHeightMm * pxPerMm);

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Transform matrix: world mm to pixel
    ctx.save();
    ctx.scale(pxPerMm, pxPerMm);

    // Optional Grid
    if (options.includeGrid) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 15;
        const step = settings.gridModuleMm;
        ctx.beginPath();
        for (let x = 0; x <= settings.canvasWidthMm; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, settings.canvasHeightMm);
        }
        for (let y = 0; y <= settings.canvasHeightMm; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(settings.canvasWidthMm, y);
        }
        ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 30;
    ctx.strokeRect(200, 200, settings.canvasWidthMm - 400, settings.canvasHeightMm - 400);

    // 1. Rough Hand-drawn Layer
    if (options.includeRough) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const stroke of roughStrokes) {
            if (stroke.points.length < 2) continue;
            ctx.save();
            ctx.strokeStyle = stroke.tool === 'highlighter' ? '#eab308' : stroke.color;
            ctx.globalAlpha = stroke.opacity;
            ctx.lineWidth = stroke.width;
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    // 2. CAD Accurate Layer
    if (options.includeCad) {
        for (const el of cadElements) {
            if (el.type === 'wall') {
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = el.thickness;
                ctx.lineCap = 'square';
                ctx.beginPath();
                ctx.moveTo(el.p1.x, el.p1.y);
                ctx.lineTo(el.p2.x, el.p2.y);
                ctx.stroke();
            } else if (el.type === 'line') {
                ctx.save();
                ctx.strokeStyle = el.color;
                ctx.lineWidth = el.width;
                if (el.lineStyle === 'dashed') {
                    ctx.setLineDash([100, 50]);
                }
                ctx.beginPath();
                ctx.moveTo(el.p1.x, el.p1.y);
                ctx.lineTo(el.p2.x, el.p2.y);
                ctx.stroke();
                ctx.restore();
            } else if (el.type === 'rect') {
                const rx = Math.min(el.p1.x, el.p2.x);
                const ry = Math.min(el.p1.y, el.p2.y);
                const rw = Math.abs(el.p2.x - el.p1.x);
                const rh = Math.abs(el.p2.y - el.p1.y);
                if (el.filled) {
                    ctx.fillStyle = el.fillColor || '#f8fafc';
                    ctx.fillRect(rx, ry, rw, rh);
                }
                ctx.strokeStyle = el.strokeColor || '#0f172a';
                ctx.lineWidth = 120;
                ctx.strokeRect(rx, ry, rw, rh);
            } else if (el.type === 'fixture') {
                const def = FIXTURE_LIBRARY.find((f) => f.id === el.fixtureId);
                if (def) {
                    ctx.save();
                    ctx.translate(el.position.x, el.position.y);
                    ctx.rotate((el.rotation * Math.PI) / 180);
                    ctx.scale(el.flipH ? -1 : 1, el.flipV ? -1 : 1);
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 40;

                    for (const geom of def.geometry) {
                        if (geom.type === 'line' && geom.p1 && geom.p2) {
                            ctx.save();
                            if (geom.dashed) ctx.setLineDash([80, 40]);
                            ctx.beginPath();
                            ctx.moveTo(geom.p1.x * el.widthMm, geom.p1.y * el.depthMm);
                            ctx.lineTo(geom.p2.x * el.widthMm, geom.p2.y * el.depthMm);
                            ctx.stroke();
                            ctx.restore();
                        } else if (geom.type === 'rect' && geom.rect) {
                            const rx = geom.rect.x * el.widthMm;
                            const ry = geom.rect.y * el.depthMm;
                            const rw = geom.rect.w * el.widthMm;
                            const rh = geom.rect.h * el.depthMm;
                            if (geom.filled) {
                                ctx.fillStyle = '#0f172a';
                                ctx.fillRect(rx, ry, rw, rh);
                            } else {
                                ctx.strokeRect(rx, ry, rw, rh);
                            }
                        } else if (geom.type === 'arc' && geom.center && geom.radius) {
                            ctx.save();
                            ctx.strokeStyle = '#2563eb';
                            ctx.lineWidth = 35;
                            ctx.setLineDash([60, 30]);
                            ctx.beginPath();
                            ctx.arc(
                                geom.center.x * el.widthMm,
                                geom.center.y * el.depthMm,
                                geom.radius * el.widthMm,
                                geom.startAngle || 0,
                                geom.endAngle || Math.PI / 2
                            );
                            ctx.stroke();
                            ctx.restore();
                        } else if (geom.type === 'circle' && geom.center && geom.radius) {
                            ctx.beginPath();
                            ctx.arc(
                                geom.center.x * el.widthMm,
                                geom.center.y * el.depthMm,
                                geom.radius * el.widthMm,
                                0,
                                Math.PI * 2
                            );
                            ctx.stroke();
                        } else if (geom.type === 'text' && geom.text && geom.center) {
                            ctx.save();
                            ctx.font = 'bold 120px sans-serif';
                            ctx.fillStyle = '#475569';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(geom.text, geom.center.x * el.widthMm, geom.center.y * el.depthMm);
                            ctx.restore();
                        }
                    }
                    ctx.restore();
                }
            } else if (el.type === 'dimension') {
                const dx = el.p2.x - el.p1.x;
                const dy = el.p2.y - el.p1.y;
                const len = Math.round(Math.sqrt(dx * dx + dy * dy));
                const mx = (el.p1.x + el.p2.x) / 2;
                const my = (el.p1.y + el.p2.y) / 2;
                ctx.save();
                ctx.strokeStyle = '#dc2626';
                ctx.fillStyle = '#dc2626';
                ctx.lineWidth = 25;
                ctx.beginPath();
                ctx.moveTo(el.p1.x, el.p1.y);
                ctx.lineTo(el.p2.x, el.p2.y);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(el.p1.x, el.p1.y, 40, 0, Math.PI * 2);
                ctx.arc(el.p2.x, el.p2.y, 40, 0, Math.PI * 2);
                ctx.fill();

                ctx.font = 'bold 140px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${len}mm`, mx, my - 80);
                ctx.restore();
            } else if (el.type === 'room') {
                ctx.save();
                ctx.translate(el.position.x, el.position.y);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 20;
                ctx.fillRect(-400, -200, 800, 400);
                ctx.strokeRect(-400, -200, 800, 400);

                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 180px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.name, 0, el.tatami ? -40 : 0);
                if (el.tatami) {
                    ctx.fillStyle = '#64748b';
                    ctx.font = '130px sans-serif';
                    ctx.fillText(`${el.tatami} 帖`, 0, 80);
                }
                ctx.restore();
            }
        }
    }

    // Title Block
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 30;
    const tbX = settings.canvasWidthMm - 2500;
    const tbY = settings.canvasHeightMm - 900;
    ctx.fillRect(tbX, tbY, 2200, 600);
    ctx.strokeRect(tbX, tbY, 2200, 600);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 160px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`縮尺: 1/${settings.scale}`, tbX + 100, tbY + 220);
    ctx.font = '130px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`グリッド: ${settings.gridModuleMm}mm (尺モジュール)`, tbX + 100, tbY + 440);

    ctx.restore();

    return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export function downloadText(text: string, filename: string, mimeType: string = 'text/plain') {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
