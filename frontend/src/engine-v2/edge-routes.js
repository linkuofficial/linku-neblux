import { edgeCurveDirection } from '../engine/geometry.js';

function fallbackQuadratic(edge, source, target) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy) || 1;
    const direction = edgeCurveDirection({ source: edge.source, target: edge.target });
    return { type: 'quadratic', cx: (source.x + target.x) / 2 - (dy / distance) * Math.min(42, Math.max(10, distance * 0.18)) * direction, cy: (source.y + target.y) / 2 + (dx / distance) * Math.min(42, Math.max(10, distance * 0.18)) * direction };
}

export function normalizeRoute(edge, source, target) {
    const route = edge.route;
    if (route?.type === 'line') return { type: 'line' };
    if (route?.type === 'quadratic' && Number.isFinite(route.cx) && Number.isFinite(route.cy)) return route;
    if (route?.type === 'polyline' && Array.isArray(route.points) && route.points.length >= 2 && route.points.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) return route;
    return fallbackQuadratic(edge, source, target);
}

export function routeBounds(route, source, target) {
    const points = route.type === 'polyline' ? route.points : route.type === 'quadratic' ? [[source.x, source.y], [route.cx, route.cy], [target.x, target.y]] : [[source.x, source.y], [target.x, target.y]];
    return points.reduce((bounds, [x, y]) => ({ minX: Math.min(bounds.minX, x), minY: Math.min(bounds.minY, y), maxX: Math.max(bounds.maxX, x), maxY: Math.max(bounds.maxY, y) }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}

export function drawRoute(ctx, route, source, target) {
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    if (route.type === 'quadratic') ctx.quadraticCurveTo(route.cx, route.cy, target.x, target.y);
    else if (route.type === 'polyline') for (const point of route.points.slice(1)) ctx.lineTo(point[0], point[1]);
    else ctx.lineTo(target.x, target.y);
    ctx.stroke();
}
