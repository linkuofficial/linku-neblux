import { hash01 } from '../engine/theme.js';
import { hexA } from '../engine/geometry.js';

const TAU = Math.PI * 2;

// ── Background star field ──────────────────────────────────────────────────
// The field is built from two populations, because they fail in different ways.
//
//   Dust (micro + small) is tiled. There are ~1200 of them per 1024² and none
//   is individually recognisable, so a repeating tile is genuinely invisible.
//
//   Bright stars and blooms are NOT tiled. A bloom is the most identifiable
//   thing in the sky; six copies of one marching in lockstep at a fixed tile
//   pitch reads as wallpaper, and no amount of extra tile size or layer
//   offsetting removes it — lockstep is what periodicity *is*. They instead
//   live on an unbounded hash grid keyed by integer cell coordinate, so the
//   pattern never repeats however far the sky is panned.
//
// Depth reads from the spread of parallax rate, brightness and density across
// the layers rather than from raw star count, so each layer stays sparse and
// only their sum reaches sky density.

// Dust tiles. Sizes are mutually non-harmonic (768/597/461 share no factor), so
// even the invisible repetition never lands on a shared period; each layer also
// hashes in its own namespace and starts at its own phase offset, so their
// grids never align at the world origin.
//
// `smallRatio` is the fraction of the layer painted as perceptible small stars
// rather than sub-pixel dust: the far layer is nearly all dust, the near layer
// much less so, which is most of what sells the parallax as depth.
const DUST_LAYERS = Object.freeze([
    { key: 'far', tile: 768, count: 419, smallRatio: 0.08, parallax: 0.06, alpha: 0.62, offsetX: 0, offsetY: 0 },
    { key: 'mid', tile: 597, count: 110, smallRatio: 0.14, parallax: 0.16, alpha: 0.82, offsetX: 211, offsetY: 389 },
    { key: 'near', tile: 461, count: 26, smallRatio: 0.30, parallax: 0.30, alpha: 1, offsetX: 457, offsetY: 113 },
]);

// Hash-grid stars. `chance` is the odds a cell holds a star at all, so density
// is (chance / cell²); `bloomChance` splits those between the bright and bloom
// families. Parallax above 0.4 is reserved for the beacon grid alone — fast
// dim dust reads as noise, so only a handful of bright stars may drift that
// quickly.
//
// Cells are deliberately small and sparsely filled rather than large and nearly
// always filled. Both give the same density, but a cell that almost always
// holds exactly one star is a jittered lattice: every star is boxed away from
// its neighbours, so the field can never clump or leave a void. Held at
// chance ≈ 0.15 the same process approximates Poisson, which is what gives a
// real sky its density contrast.
const STAR_GRIDS = Object.freeze([
    { key: 'glint', cell: 78, parallax: 0.30, chance: 0.15, bloomChance: 0.16, alpha: 0.95 },
    { key: 'beacon', cell: 150, parallax: 0.44, chance: 0.105, bloomChance: 0.62, alpha: 1 },
]);
const SPIKE_CHANCE = 0.30; // of blooms only → ~2 spiked stars per 1024²
const GRID_MARGIN = 48; // keeps a bloom's ink from popping in at the viewport edge

// Class geometry. Brightness buys scatter, not size: the halo multiple climbs
// 0 → 0 → 3.4 → 5.2 across the classes while the core barely doubles.
const MICRO = 0, SMALL = 1, BRIGHT = 2, BLOOM = 3;
const CLASS_RADIUS = Object.freeze([[0.34, 0.72], [0.72, 1.2], [1.2, 1.85], [1.85, 2.7]]);
const CLASS_ALPHA = Object.freeze([[0.09, 0.32], [0.32, 0.58], [0.58, 0.82], [0.82, 1]]);
// Within a class, size and brightness are power-law rather than uniform, so
// even a "small" star usually sits near the bottom of its own band.
const CLASS_BIAS = Object.freeze([2.0, 1.6, 1.3, 1]);
const BRIGHT_HALO = 3.4;
const BLOOM_HALO = 5.2;
const BLOOM_SPIKE = 7.0;

// Star colour is temperature, not identity: overwhelmingly near-white with a
// cool bias and a rare warm one. Domain colour belongs to the graph's stars and
// its nebulae — never to the background sky.
const TINTS = Object.freeze(['#f2f6ff', '#e8eefc', '#dfe7f7', '#d3ddf0', '#c6d4ea', '#b4c6de', '#fbf3e4', '#f4e6cc', '#e9d7b6']);
const TINT_BIAS = 2.2;

// Micro stars are the bulk of the field and must stay crisp, so dust is baked
// at device resolution — but capped, because a 3x phone would otherwise bake
// three 2300px tiles (~42MB). At the cap a 3x device resamples slightly softer
// background dust in exchange for roughly half the memory.
const BAKE_DPR_CAP = 2;

// A local, fully-mixed string hash — deliberately NOT the engine's shared
// hash01.
//
// hash01 is FNV-1a folded into 100k buckets. That is fine for one value per
// object, but a star needs several independent values from one identity, and
// FNV's avalanche is too weak for that: its last step is `h = (h ^ c) * prime`,
// so two seeds differing only in a trailing field hash a *fixed distance* apart.
// Seeded `${s}:x` / `${s}:y`, every dust star landed on one of two diagonal
// lines — the (y−x) difference took exactly 2 values across 419 stars. Pearson
// correlation reads ~0 throughout, because the lock is modular rather than
// linear; only the difference distribution reveals it. Re-spelling the seed only
// softened it (154 distinct offsets where an ideal hash gives 260).
//
// So this adds the finalizer FNV lacks (splitmix32) and keeps the full 32-bit
// range instead of folding to 100k. Still a pure function of the seed, so the
// sky is identical across sessions.
function rand(field, ...parts) {
    const seed = `${field}:${parts.join(':')}`;
    let h = 2166136261;
    for (let index = 0; index < seed.length; index += 1) { h ^= seed.charCodeAt(index); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 2246822507);
    h ^= h >>> 13; h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

function tintOf(...parts) {
    return TINTS[Math.min(TINTS.length - 1, Math.floor((rand('tint', ...parts) ** TINT_BIAS) * TINTS.length))];
}

// Radius and brightness intentionally share one draw: a bigger star being a
// brighter star is the correlation the sky actually has.
function bandValue(klass, band, ...parts) {
    const within = rand('within', ...parts) ** CLASS_BIAS[klass];
    return band[klass][0] + (band[klass][1] - band[klass][0]) * within;
}

function makeCanvas(documentRef, width, height) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
    const canvas = documentRef?.createElement?.('canvas');
    if (!canvas) return null;
    canvas.width = width; canvas.height = height;
    return canvas;
}

// ── Dust ───────────────────────────────────────────────────────────────────

function buildDust(layer) {
    const stars = [];
    // Class comes from the star's rank, not from a hash draw: a ramp gives the
    // layer its exact intended composition, where sampling would leave it to
    // luck — at these counts an unlucky draw doubles the small-star share.
    // Position is still hashed, so rank and place stay uncorrelated.
    const smallFrom = layer.count * (1 - layer.smallRatio);
    for (let index = 0; index < layer.count; index += 1) {
        const klass = index >= smallFrom ? SMALL : MICRO;
        stars.push({
            x: rand('x', layer.key, index) * layer.tile,
            y: rand('y', layer.key, index) * layer.tile,
            radius: bandValue(klass, CLASS_RADIUS, layer.key, index),
            alpha: bandValue(klass, CLASS_ALPHA, layer.key, index),
            tint: tintOf(layer.key, index),
        });
    }
    return stars;
}

// Dust is painted as plain discs — no gradient, no glow sprite. This is what
// makes the field read as a sky rather than as bokeh.
function paintDust(ctx, star, x, y) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = star.tint;
    ctx.beginPath(); ctx.arc(x, y, star.radius, 0, TAU); ctx.fill();
}

function bakeDust(layer, dpr, documentRef) {
    const canvas = makeCanvas(documentRef, Math.round(layer.tile * dpr), Math.round(layer.tile * dpr));
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);
    // Torus wrap: a star within reach of an edge is painted again on the
    // opposite side, so the tile seam carries no discontinuity.
    for (const star of buildDust(layer)) {
        const extent = star.radius + 1;
        for (let stepX = -1; stepX <= 1; stepX += 1) {
            const x = star.x + stepX * layer.tile;
            if (x + extent < 0 || x - extent > layer.tile) continue;
            for (let stepY = -1; stepY <= 1; stepY += 1) {
                const y = star.y + stepY * layer.tile;
                if (y + extent < 0 || y - extent > layer.tile) continue;
                paintDust(ctx, star, x, y);
            }
        }
    }
    ctx.globalAlpha = 1;
    return { canvas, tile: layer.tile, parallax: layer.parallax, alpha: layer.alpha, offsetX: layer.offsetX, offsetY: layer.offsetY };
}

// ── Hash-grid stars ────────────────────────────────────────────────────────

function paintSpikes(ctx, x, y, length, tint, alpha) {
    if (typeof ctx.createLinearGradient !== 'function') return;
    for (const horizontal of [true, false]) {
        const gradient = horizontal
            ? ctx.createLinearGradient(x - length, y, x + length, y)
            : ctx.createLinearGradient(x, y - length, x, y + length);
        if (!gradient?.addColorStop) return;
        gradient.addColorStop(0, hexA(tint, 0));
        gradient.addColorStop(0.5, hexA(tint, alpha));
        gradient.addColorStop(1, hexA(tint, 0));
        ctx.fillStyle = gradient;
        if (horizontal) ctx.fillRect(x - length, y - 0.35, length * 2, 0.7);
        else ctx.fillRect(x - 0.35, y - length, 0.7, length * 2);
    }
}

// One sprite per (class, tint, spiked) combination, baked at the class's top
// radius and scaled down per star. ~27 small canvases for the whole sky.
function bakeGridSprite(klass, tint, spiked, dpr, documentRef) {
    const radius = CLASS_RADIUS[klass][1];
    const scatter = radius * (klass === BRIGHT ? BRIGHT_HALO : BLOOM_HALO);
    const extent = Math.ceil((spiked ? radius * BLOOM_SPIKE : scatter) + 1);
    const size = Math.ceil(extent * 2 * dpr);
    const canvas = makeCanvas(documentRef, size, size);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);
    if (typeof ctx.createRadialGradient === 'function') {
        const gradient = ctx.createRadialGradient(extent, extent, 0, extent, extent, scatter);
        if (gradient?.addColorStop) {
            gradient.addColorStop(0, hexA(tint, klass === BRIGHT ? 0.42 : 0.62));
            gradient.addColorStop(klass === BRIGHT ? 0.34 : 0.26, hexA(tint, 0.14));
            gradient.addColorStop(1, hexA(tint, 0));
            ctx.fillStyle = gradient;
            ctx.beginPath(); ctx.arc(extent, extent, scatter, 0, TAU); ctx.fill();
        }
    }
    if (spiked) paintSpikes(ctx, extent, extent, radius * BLOOM_SPIKE, tint, 0.30);
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.arc(extent, extent, radius, 0, TAU); ctx.fill();
    return { canvas, extent, radius };
}

function createGridSprites(dpr, documentRef) {
    const sprites = new Map();
    return {
        get(klass, tint, spiked) {
            const key = `${klass}|${tint}|${spiked ? 1 : 0}`;
            if (!sprites.has(key)) sprites.set(key, bakeGridSprite(klass, tint, spiked, dpr, documentRef));
            return sprites.get(key);
        },
    };
}

// The star a cell holds, or null. Pure function of the cell coordinate, so the
// same patch of sky always looks the same without anything being stored.
function gridStar(grid, cellX, cellY) {
    if (rand('on', grid.key, cellX, cellY) >= grid.chance) return null;
    const bloom = rand('class', grid.key, cellX, cellY) < grid.bloomChance;
    const klass = bloom ? BLOOM : BRIGHT;
    return {
        x: (cellX + rand('x', grid.key, cellX, cellY)) * grid.cell,
        y: (cellY + rand('y', grid.key, cellX, cellY)) * grid.cell,
        radius: bandValue(klass, CLASS_RADIUS, grid.key, cellX, cellY),
        alpha: bandValue(klass, CLASS_ALPHA, grid.key, cellX, cellY),
        tint: tintOf(grid.key, cellX, cellY),
        klass,
        spiked: bloom && rand('spike', grid.key, cellX, cellY) < SPIKE_CHANCE,
    };
}

function drawGrid(ctx, grid, sprites, width, height, panX, panY) {
    const originX = panX * grid.parallax;
    const originY = panY * grid.parallax;
    const minCellX = Math.floor((-originX - GRID_MARGIN) / grid.cell);
    const maxCellX = Math.floor((-originX + width + GRID_MARGIN) / grid.cell);
    const minCellY = Math.floor((-originY - GRID_MARGIN) / grid.cell);
    const maxCellY = Math.floor((-originY + height + GRID_MARGIN) / grid.cell);
    let drawn = 0;
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
            const star = gridStar(grid, cellX, cellY);
            if (!star) continue;
            const sprite = sprites.get(star.klass, star.tint, star.spiked);
            if (!sprite) continue;
            // Sprites bake at the class's top radius; a dimmer, smaller star is
            // the same sprite scaled and faded, so the cache stays at ~27 entries.
            const scale = star.radius / sprite.radius;
            const half = sprite.extent * scale;
            const x = star.x + originX;
            const y = star.y + originY;
            ctx.globalAlpha = star.alpha * grid.alpha;
            ctx.drawImage(sprite.canvas, x - half, y - half, half * 2, half * 2);
            drawn += 1;
        }
    }
    return drawn;
}

// ── Nebula ─────────────────────────────────────────────────────────────────

// Per-domain nebula fog, mirroring the production engine's createNebulaSprite:
// five hash-seeded blobs (stable across sessions) with the 0.30/0.10/0 radial
// falloff, baked once per domain and stamped in world space by the renderer.
export function createNebulaSprite(domainKey, color, documentRef = globalThis.document) {
    const radius = 256;
    const size = radius * 2;
    const canvas = makeCanvas(documentRef, size, size);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    for (let blob = 0; blob < 5; blob += 1) {
        const angle = hash01(`${domainKey}a${blob}`) * Math.PI * 2;
        const distance = hash01(`${domainKey}d${blob}`) * radius * 0.42;
        const cx = radius + Math.cos(angle) * distance;
        const cy = radius + Math.sin(angle) * distance;
        const blobRadius = radius * (0.38 + hash01(`${domainKey}r${blob}`) * 0.5);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, blobRadius);
        grad.addColorStop(0, hexA(color, 0.30));
        grad.addColorStop(0.55, hexA(color, 0.10));
        grad.addColorStop(1, hexA(color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, blobRadius, 0, Math.PI * 2); ctx.fill();
    }
    return { canvas, radius };
}

function wrap(value, modulus) { return ((value % modulus) + modulus) % modulus; }

export function createAtmosphereCache({ documentRef = globalThis.document, tokens } = {}) {
    const cache = new Map();
    let lastGridStars = 0;
    return {
        get(dpr = 1) {
            const bakeDpr = Math.min(Number(dpr) > 0 ? dpr : 1, BAKE_DPR_CAP);
            const key = String(bakeDpr);
            if (cache.has(key)) return cache.get(key);
            const entry = {
                dust: DUST_LAYERS.map((layer) => bakeDust(layer, bakeDpr, documentRef)).filter(Boolean),
                sprites: createGridSprites(bakeDpr, documentRef),
            };
            cache.set(key, entry);
            return entry;
        },
        draw(ctx, width, height, dpr = 1, panX = 0, panY = 0) {
            if (tokens.background && tokens.background !== 'transparent') { ctx.fillStyle = tokens.background; ctx.fillRect(0, 0, width, height); }
            const entry = this.get(dpr);
            for (const layer of entry.dust) {
                // Each layer's phase offset is folded in here rather than into
                // the bake, so the layers stay independent of one another while
                // sharing a single world pan.
                const originX = wrap(panX * layer.parallax + layer.offsetX, layer.tile) - layer.tile;
                const originY = wrap(panY * layer.parallax + layer.offsetY, layer.tile) - layer.tile;
                ctx.globalAlpha = layer.alpha;
                for (let x = originX; x < width; x += layer.tile) {
                    for (let y = originY; y < height; y += layer.tile) ctx.drawImage(layer.canvas, x, y, layer.tile, layer.tile);
                }
            }
            let gridStars = 0;
            for (const grid of STAR_GRIDS) gridStars += drawGrid(ctx, grid, entry.sprites, width, height, panX, panY);
            lastGridStars = gridStars;
            ctx.globalAlpha = 1;
        },
        gridStars() { return lastGridStars; },
        clear() { cache.clear(); },
        size() { return cache.size; },
    };
}
