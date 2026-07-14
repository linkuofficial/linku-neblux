import { allRegions, regionById } from './atlas-state.js';
import { localizedText } from './atlas-i18n.js';

const DOMAIN_COLORS = {
    PHY: '#7dd3fc', MAT: '#c4b5fd', TEC: '#f0c050', ENG: '#fb923c', default: '#9fb7e8',
};

function colorFor(region) {
    return DOMAIN_COLORS[region.domains?.[0]] || (region.id === 'main' ? '#f0c050' : DOMAIN_COLORS.default);
}

function referenceId(reference) {
    return reference === 'main' ? 'main' : reference.replace(/^wonder:/, '');
}

function seededUnit(seed) {
    let value = seed;
    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

export function createAtlasRenderer(canvas, getState) {
    const context = canvas.getContext?.('2d');
    const metrics = { width: 0, height: 0, dpr: 1, scale: 1, centerX: 0, centerY: 0 };
    let redrawCount = 0;

    function resize() {
        if (!context) return false;
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        metrics.width = Math.max(1, rect.width);
        metrics.height = Math.max(1, rect.height);
        metrics.dpr = dpr;
        canvas.width = Math.round(metrics.width * dpr);
        canvas.height = Math.round(metrics.height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        return true;
    }

    function setCameraMetrics(state) {
        const space = state.index.coordinateSpace || { width: 2400, height: 1600 };
        metrics.scale = Math.min(metrics.width / space.width, metrics.height / space.height) * 0.86 * state.camera.zoom;
        metrics.centerX = metrics.width / 2;
        metrics.centerY = metrics.height / 2;
    }

    function screenPoint(region, state) {
        return {
            x: metrics.centerX + (region.x + state.camera.x) * metrics.scale,
            y: metrics.centerY + (region.y + state.camera.y) * metrics.scale,
            radius: Math.max(13, region.radius * metrics.scale),
            hitRadius: Math.max(22, (region.hitRadius || region.radius) * metrics.scale),
        };
    }

    function drawBackdrop() {
        const gradient = context.createRadialGradient(metrics.width * 0.5, metrics.height * 0.42, 20, metrics.width * 0.5, metrics.height * 0.42, Math.max(metrics.width, metrics.height) * 0.78);
        gradient.addColorStop(0, '#14203b');
        gradient.addColorStop(0.52, '#0a1022');
        gradient.addColorStop(1, '#040713');
        context.fillStyle = gradient;
        context.fillRect(0, 0, metrics.width, metrics.height);
        const random = seededUnit(42);
        for (let i = 0; i < 130; i += 1) {
            const x = random() * metrics.width;
            const y = random() * metrics.height;
            const alpha = 0.14 + random() * 0.48;
            context.fillStyle = `rgba(224, 237, 255, ${alpha})`;
            context.fillRect(x, y, random() > 0.88 ? 1.6 : 1, 1);
        }
    }

    function drawRoads(state) {
        for (const road of state.index.roads || []) {
            const from = regionById(state.index, referenceId(road.from));
            const to = regionById(state.index, referenceId(road.to));
            if (!from || !to) continue;
            const start = screenPoint(from, state);
            const end = screenPoint(to, state);
            const gradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
            gradient.addColorStop(0, 'rgba(125, 211, 252, 0.16)');
            gradient.addColorStop(0.5, 'rgba(240, 192, 80, 0.8)');
            gradient.addColorStop(1, 'rgba(196, 181, 253, 0.16)');
            context.save();
            context.beginPath();
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.strokeStyle = gradient;
            context.lineWidth = road.strength === 'strong' ? 2.2 : 1.2;
            context.setLineDash([7, 8]);
            context.shadowColor = '#f0c050';
            context.shadowBlur = 10;
            context.stroke();
            context.restore();
        }
    }

    function drawRegion(region, state) {
        const point = screenPoint(region, state);
        const color = colorFor(region);
        const hovered = state.hoveredRegionId === region.id;
        const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.radius * (hovered ? 2.3 : 1.8));
        glow.addColorStop(0, region.id === 'main' ? 'rgba(255, 238, 181, 0.96)' : color);
        glow.addColorStop(0.22, region.id === 'main' ? 'rgba(240, 192, 80, 0.62)' : `${color}99`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.save();
        context.fillStyle = glow;
        context.beginPath();
        context.arc(point.x, point.y, point.radius * (hovered ? 2.3 : 1.8), 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = `${color}cc`;
        context.lineWidth = hovered ? 2.4 : 1.25;
        context.beginPath();
        context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        context.stroke();
        if (region.id === 'main') {
            context.strokeStyle = 'rgba(240, 192, 80, 0.36)';
            context.lineWidth = 1;
            context.beginPath();
            context.ellipse(point.x, point.y, point.radius * 1.35, point.radius * 0.45, -0.38, 0, Math.PI * 2);
            context.stroke();
        }
        const title = localizedText(region.title, state.lang, region.id);
        context.textAlign = 'center';
        context.font = `${region.id === 'main' ? '600 16px' : '600 13px'} Oxanium, system-ui, sans-serif`;
        context.fillStyle = '#edf4ff';
        context.shadowColor = '#02040b';
        context.shadowBlur = 6;
        context.fillText(title, point.x, point.y + point.radius + 20);
        context.restore();
    }

    function draw() {
        if (!context) return false;
        const state = getState();
        setCameraMetrics(state);
        drawBackdrop();
        drawRoads(state);
        for (const region of allRegions(state.index)) drawRegion(region, state);
        redrawCount += 1;
        return true;
    }

    function hitTest(clientX, clientY) {
        if (!context) return null;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const state = getState();
        setCameraMetrics(state);
        return allRegions(state.index)
            .map((region) => ({ region, point: screenPoint(region, state) }))
            .filter(({ point }) => Math.hypot(point.x - x, point.y - y) <= point.hitRadius)
            .sort((a, b) => a.point.hitRadius - b.point.hitRadius)[0]?.region || null;
    }

    function regionScreenPosition(id) {
        const region = regionById(getState().index, id);
        if (!region || !context) return null;
        setCameraMetrics(getState());
        return screenPoint(region, getState());
    }

    return { available: Boolean(context), resize, draw, hitTest, regionScreenPosition, get redrawCount() { return redrawCount; } };
}
