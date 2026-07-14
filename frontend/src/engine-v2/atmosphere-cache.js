import { hash01 } from '../engine/theme.js';

export function createAtmosphereCache({ documentRef = globalThis.document, tokens } = {}) {
    const cache = new Map();
    return {
        get(width, height, dpr = 1) {
            const key = `${width}|${height}|${dpr}`;
            if (cache.has(key)) return cache.get(key);
            const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.ceil(width * dpr), Math.ceil(height * dpr)) : documentRef?.createElement?.('canvas');
            if (!canvas) return { canvas: null, width, height };
            canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
            const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.fillStyle = tokens.background; ctx.fillRect(0, 0, width, height);
            for (let index = 0; index < 170; index += 1) {
                ctx.globalAlpha = 0.08 + hash01(`far-${index}`) * 0.24;
                ctx.fillStyle = index % 4 === 0 ? '#dbe7ff' : '#aabedb';
                ctx.beginPath(); ctx.arc(hash01(`x-${index}`) * width, hash01(`y-${index}`) * height, 0.4 + hash01(`r-${index}`), 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            const entry = { canvas, width, height };
            cache.set(key, entry);
            return entry;
        },
        draw(ctx, width, height, dpr = 1) {
            const entry = this.get(width, height, dpr);
            if (entry.canvas) ctx.drawImage(entry.canvas, 0, 0, width, height);
        },
        clear() { cache.clear(); },
        size() { return cache.size; },
    };
}
