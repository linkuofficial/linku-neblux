import { labelRank } from './lod-policy.js';

function overlaps(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }

export function layoutLabels(nodes, camera, interaction = {}, { cellSize = 96, fontSize = 12 } = {}) {
    const center = { x: camera.viewport().width / 2, y: camera.viewport().height / 2 };
    const candidates = nodes.map((node) => {
        const point = camera.worldToScreen(node);
        const width = Math.max(28, node.label.length * fontSize * 0.56 + 10);
        const height = fontSize + 8;
        return { node, rank: labelRank(node, interaction), distance: Math.hypot(point.x - center.x, point.y - center.y), box: { x: point.x + 10, y: point.y - height / 2, width, height } };
    }).sort((a, b) => b.rank - a.rank || a.distance - b.distance || a.node.id.localeCompare(b.node.id));
    const grid = new Map();
    const accepted = [];
    const keysFor = (box) => {
        const keys = [];
        for (let x = Math.floor(box.x / cellSize); x <= Math.floor((box.x + box.width) / cellSize); x += 1) for (let y = Math.floor(box.y / cellSize); y <= Math.floor((box.y + box.height) / cellSize); y += 1) keys.push(`${x}:${y}`);
        return keys;
    };
    for (const candidate of candidates) {
        const nearby = new Set(keysFor(candidate.box).flatMap((key) => grid.get(key) || []));
        if ([...nearby].some((item) => overlaps(item.box, candidate.box))) continue;
        accepted.push(candidate);
        for (const key of keysFor(candidate.box)) { if (!grid.has(key)) grid.set(key, []); grid.get(key).push(candidate); }
    }
    return { accepted, acceptedIds: accepted.map((item) => item.node.id), gridSize: grid.size };
}
