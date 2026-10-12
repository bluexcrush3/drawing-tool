import type { CADElement, HandStroke, Settings } from '../types/drawing';
import { FIXTURE_LIBRARY } from '../constants/fixtureLibrary';

export interface SVGExportOptions {
    includeCad: boolean;
    includeRough: boolean;
    includeGrid?: boolean;
}

export function generateSVG(
    cadElements: CADElement[],
    roughStrokes: HandStroke[],
    settings: Settings,
    options: SVGExportOptions
): string {
    const width = settings.canvasWidthMm;
    const height = settings.canvasHeightMm;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}mm" height="${height}mm" style="background-color: #ffffff; font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;">
  <defs>
    <pattern id="grid-pattern" width="${settings.gridModuleMm}" height="${settings.gridModuleMm}" patternUnits="userSpaceOnUse">
      <path d="M ${settings.gridModuleMm} 0 L 0 0 0 ${settings.gridModuleMm}" fill="none" stroke="#e2e8f0" stroke-width="15" />
    </pattern>
  </defs>
`;

    // Optional Grid
    if (options.includeGrid) {
        svg += `  <rect width="100%" height="100%" fill="url(#grid-pattern)" />\n`;
    }

    // Architectural Border & Title block
    svg += `  <!-- Border -->
  <rect x="200" y="200" width="${width - 400}" height="${height - 400}" fill="none" stroke="#64748b" stroke-width="30" />
  <rect x="250" y="250" width="${width - 500}" height="${height - 500}" fill="none" stroke="#cbd5e1" stroke-width="15" />
`;

    // Layer 1: Hand-drawn rough sketch
    if (options.includeRough && roughStrokes.length > 0) {
        svg += `  <!-- ROUGH HAND-DRAWN LAYER -->\n  <g id="layer-rough" stroke-linecap="round" stroke-linejoin="round">\n`;
        for (const s of roughStrokes) {
            if (s.points.length < 2) continue;
            const pathData = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const strokeColor = s.tool === 'highlighter' ? '#eab308' : s.color;
            const opacity = s.opacity;
            svg += `    <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="${s.width}" opacity="${opacity}" />\n`;
        }
        svg += `  </g>\n`;
    }

    // Layer 2: CAD Accurate Layer
    if (options.includeCad && cadElements.length > 0) {
        svg += `  <!-- CAD ACCURATE LAYER -->\n  <g id="layer-cad">\n`;

        for (const el of cadElements) {
            if (el.type === 'wall') {
                svg += `    <line x1="${el.p1.x}" y1="${el.p1.y}" x2="${el.p2.x}" y2="${el.p2.y}" stroke="#0f172a" stroke-width="${el.thickness}" stroke-linecap="square" />\n`;
            } else if (el.type === 'line') {
                const dash = el.lineStyle === 'dashed' ? 'stroke-dasharray="100,50"' : '';
                svg += `    <line x1="${el.p1.x}" y1="${el.p1.y}" x2="${el.p2.x}" y2="${el.p2.y}" stroke="${el.color}" stroke-width="${el.width}" ${dash} stroke-linecap="round" />\n`;
            } else if (el.type === 'rect') {
                const rx = Math.min(el.p1.x, el.p2.x);
                const ry = Math.min(el.p1.y, el.p2.y);
                const rw = Math.abs(el.p2.x - el.p1.x);
                const rh = Math.abs(el.p2.y - el.p1.y);
                svg += `    <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${el.filled ? el.fillColor || '#f8fafc' : 'none'}" stroke="${el.strokeColor || '#0f172a'}" stroke-width="120" />\n`;
            } else if (el.type === 'fixture') {
                const def = FIXTURE_LIBRARY.find((f) => f.id === el.fixtureId);
                if (def) {
                    const fx = el.flipH ? -1 : 1;
                    const fy = el.flipV ? -1 : 1;
                    svg += `    <g transform="translate(${el.position.x}, ${el.position.y}) rotate(${el.rotation}) scale(${fx}, ${fy})">\n`;
                    for (const geom of def.geometry) {
                        if (geom.type === 'line' && geom.p1 && geom.p2) {
                            const x1 = geom.p1.x * el.widthMm;
                            const y1 = geom.p1.y * el.depthMm;
                            const x2 = geom.p2.x * el.widthMm;
                            const y2 = geom.p2.y * el.depthMm;
                            const dash = geom.dashed ? 'stroke-dasharray="80,40"' : '';
                            svg += `      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0f172a" stroke-width="40" ${dash} stroke-linecap="round" />\n`;
                        } else if (geom.type === 'rect' && geom.rect) {
                            const x = geom.rect.x * el.widthMm;
                            const y = geom.rect.y * el.depthMm;
                            const w = geom.rect.w * el.widthMm;
                            const h = geom.rect.h * el.depthMm;
                            svg += `      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${geom.filled ? '#0f172a' : 'none'}" stroke="#0f172a" stroke-width="40" />\n`;
                        } else if (geom.type === 'arc' && geom.center && geom.radius) {
                            const cx = geom.center.x * el.widthMm;
                            const cy = geom.center.y * el.depthMm;
                            const r = geom.radius * el.widthMm;
                            const sA = geom.startAngle || 0;
                            const eA = geom.endAngle || Math.PI / 2;
                            const x1 = cx + r * Math.cos(sA);
                            const y1 = cy + r * Math.sin(sA);
                            const x2 = cx + r * Math.cos(eA);
                            const y2 = cy + r * Math.sin(eA);
                            svg += `      <path d="M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}" fill="none" stroke="#2563eb" stroke-width="35" stroke-dasharray="60,30" />\n`;
                        } else if (geom.type === 'circle' && geom.center && geom.radius) {
                            const cx = geom.center.x * el.widthMm;
                            const cy = geom.center.y * el.depthMm;
                            const r = geom.radius * el.widthMm;
                            svg += `      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#0f172a" stroke-width="35" />\n`;
                        } else if (geom.type === 'text' && geom.text && geom.center) {
                            const tx = geom.center.x * el.widthMm;
                            const ty = geom.center.y * el.depthMm;
                            svg += `      <text x="${tx}" y="${ty}" fill="#475569" font-size="120" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${geom.text}</text>\n`;
                        }
                    }
                    svg += `    </g>\n`;
                }
            } else if (el.type === 'dimension') {
                const dx = el.p2.x - el.p1.x;
                const dy = el.p2.y - el.p1.y;
                const len = Math.round(Math.sqrt(dx * dx + dy * dy));
                const mx = (el.p1.x + el.p2.x) / 2;
                const my = (el.p1.y + el.p2.y) / 2;
                svg += `    <g stroke="#dc2626" stroke-width="25">\n`;
                svg += `      <line x1="${el.p1.x}" y1="${el.p1.y}" x2="${el.p2.x}" y2="${el.p2.y}" />\n`;
                svg += `      <circle cx="${el.p1.x}" cy="${el.p1.y}" r="40" fill="#dc2626" />\n`;
                svg += `      <circle cx="${el.p2.x}" cy="${el.p2.y}" r="40" fill="#dc2626" />\n`;
                svg += `      <text x="${mx}" y="${my - 80}" fill="#dc2626" font-size="140" font-weight="bold" text-anchor="middle">${len}mm</text>\n`;
                svg += `    </g>\n`;
            } else if (el.type === 'room') {
                svg += `    <g transform="translate(${el.position.x}, ${el.position.y})">\n`;
                svg += `      <rect x="-400" y="-200" width="800" height="400" rx="40" fill="#ffffff" fill-opacity="0.9" stroke="#94a3b8" stroke-width="20" />\n`;
                svg += `      <text x="0" y="-30" fill="#0f172a" font-size="180" font-weight="bold" text-anchor="middle">${el.name}</text>\n`;
                if (el.tatami) {
                    svg += `      <text x="0" y="100" fill="#64748b" font-size="130" text-anchor="middle">${el.tatami} 帖</text>\n`;
                }
                svg += `    </g>\n`;
            }
        }
        svg += `  </g>\n`;
    }

    // Title Block in corner
    svg += `  <!-- Title Block -->
  <g transform="translate(${width - 2500}, ${height - 900})">
    <rect width="2200" height="600" fill="#f8fafc" stroke="#475569" stroke-width="30" />
    <text x="100" y="200" font-size="160" font-weight="bold" fill="#0f172a">縮尺: 1/${settings.scale}</text>
    <text x="100" y="420" font-size="130" fill="#475569">グリッド: ${settings.gridModuleMm}mm (尺モジュール)</text>
  </g>
</svg>`;

    return svg;
}
