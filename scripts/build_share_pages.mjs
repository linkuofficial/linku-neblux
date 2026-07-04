// Build-time: emit a share stub + Open Graph image per Wonders tour into dist/.
//
// Runs after `vite build` (see package.json "build"). For each
// data/wonders/<id>.json it writes:
//
//   dist/w/<id>.html  — a tiny page carrying Open Graph / Twitter tags so a
//       pasted link previews with the tour's title, intro and image, then
//       bounces to /wonders.html?w=<id>. Redirect is a <meta http-equiv>
//       refresh — NO inline <script> (the site CSP is script-src 'self') — plus
//       a plain <a> fallback for anyone/anything that ignores the refresh.
//
//   dist/og/<id>.png  — 1200×630 constellation graphic: a dark field with the
//       tour's accent-colour stars laid on an arc (one per step) joined by a
//       spine. NO text baked into the image — the build env has no reliable CJK
//       font, so the title rides on og:title instead.
//
// dist/w and dist/og are build artifacts (dist/ is gitignored) — never committed.
// Editing a tour's title/intro/steps and rebuilding regenerates its stub + image.

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WONDERS_DIR = resolve(ROOT, 'data/wonders');
const DIST = resolve(ROOT, 'dist');

// Production origin — og:image / og:url / canonical must be absolute for social
// scrapers to resolve them. The redirect and fallback link stay root-relative so
// the stub also works under `npm run preview` on localhost.
const ORIGIN = 'https://neblux.linku.tech';

// Domain accent palette — mirror of frontend/public/neblux-tokens.js (that file
// is a browser global `window.NebluxTokens`, not an importable ES module).
const DOMAIN_COLORS = {
    MAT: '#5b9bd5', PHY: '#c97a5b', CHE: '#c9c05b', BIO: '#5bc97a',
    MED: '#5bc9b8', ENG: '#9b7bc9', TEC: '#c95b9b', SOC: '#c9a05a',
    HUM: '#7ba5c9', PHI: '#9bc95b', ART: '#c95b5b', HIS: '#a07850',
};

const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Small deterministic PRNG (mulberry32) seeded from the tour id, so the faint
// background star scatter is stable across rebuilds — no Math.random.
function seededRand(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
        h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// One point per step, laid on a shallow dome arc across the canvas.
function arcPoints(n, W, H) {
    const marginX = 170, spanX = W - marginX * 2;
    const baseY = H * 0.60, dome = H * 0.24;
    const pts = [];
    for (let i = 0; i < n; i++) {
        const u = n <= 1 ? 0.5 : i / (n - 1);
        pts.push({ x: marginX + spanX * u, y: baseY - dome * Math.sin(Math.PI * u) });
    }
    return pts;
}

function constellationSVG(id, accent, steps) {
    const W = 1200, H = 630;
    const n = Math.max(1, steps);
    const rand = seededRand(id);
    const f = (v) => v.toFixed(1);

    // Faint background field for depth (deterministic).
    let field = '';
    for (let i = 0; i < 90; i++) {
        const x = rand() * W, y = rand() * H, r = 0.4 + rand() * 1.3;
        field += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#c9d4ee" opacity="${(0.05 + rand() * 0.18).toFixed(2)}"/>`;
    }

    const pts = arcPoints(n, W, H);
    const spine = pts.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join(' ');

    // Glow faked with stacked translucent circles (robust across SVG rasterizers,
    // unlike <filter> blur which resvg/librsvg handle inconsistently).
    const stars = pts.map((p, i) => {
        const end = i === 0 || i === n - 1;
        const r = end ? 9 : 6;
        return `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r * 4.5)}" fill="${accent}" opacity="0.09"/>`
            + `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r * 2.2)}" fill="${accent}" opacity="0.20"/>`
            + `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r)}" fill="#f4f7ff"/>`
            + `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r * 0.5)}" fill="${accent}"/>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="78%">
      <stop offset="0%" stop-color="#0b1120"/>
      <stop offset="58%" stop-color="#070a14"/>
      <stop offset="100%" stop-color="#05070f"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${field}
  <path d="${spine}" fill="none" stroke="${accent}" stroke-width="2.5" stroke-opacity="0.5" stroke-linecap="round" stroke-linejoin="round"/>
  ${stars}
</svg>`;
}

function stubHTML({ id, title, intro }) {
    const tourUrl = `/wonders.html?w=${id}`;             // root-relative: works on preview + prod
    const absTour = `${ORIGIN}/wonders.html?w=${id}`;
    const absImg = `${ORIGIN}/og/${id}.png`;
    const T = esc(title), D = esc(intro);
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${T} · Neblux Wonders</title>
<link rel="canonical" href="${absTour}">
<meta name="description" content="${D}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Neblux Wonders">
<meta property="og:title" content="${T}">
<meta property="og:description" content="${D}">
<meta property="og:url" content="${absTour}">
<meta property="og:image" content="${absImg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${T}">
<meta name="twitter:description" content="${D}">
<meta name="twitter:image" content="${absImg}">
<meta http-equiv="refresh" content="0;url=${tourUrl}">
<style>
  html,body{margin:0;height:100%;background:#05070f;color:#c9d4ee;
    font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
  main{min-height:100%;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:1rem;text-align:center;padding:2rem}
  a{color:#f4f7ff}
</style>
</head>
<body>
<main>
  <p>Opening <strong>${T}</strong>…</p>
  <p><a href="${tourUrl}">Enter the tour &rarr;</a></p>
</main>
</body>
</html>
`;
}

async function main() {
    const files = readdirSync(WONDERS_DIR).filter((f) => f.endsWith('.json'));
    const wDir = resolve(DIST, 'w');
    const ogDir = resolve(DIST, 'og');
    mkdirSync(wDir, { recursive: true });
    mkdirSync(ogDir, { recursive: true });

    let count = 0;
    for (const file of files) {
        const w = JSON.parse(readFileSync(resolve(WONDERS_DIR, file), 'utf8'));
        const id = w.id || file.replace(/\.json$/, '');
        const title = (w.title && (w.title.en || w.title)) || id;
        const intro = (w.intro && (w.intro.en || w.intro)) || '';
        const accent = DOMAIN_COLORS[w.accent] || '#9b7bc9';
        const steps = Array.isArray(w.steps) ? w.steps.length : 0;

        writeFileSync(resolve(wDir, `${id}.html`), stubHTML({ id, title, intro }));

        const svg = constellationSVG(id, accent, steps);
        await sharp(Buffer.from(svg)).png().toFile(resolve(ogDir, `${id}.png`));
        count++;
    }
    console.log(`share pages: ${count} stubs → dist/w/, ${count} og images → dist/og/`);
}

main().catch((err) => {
    console.error('build_share_pages failed:', err);
    process.exit(1);
});
