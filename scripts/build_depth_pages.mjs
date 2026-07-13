// Build-time: publish approved Neblux Depth pages into frontend/public/depth/
// so the dev server serves them and `vite build` copies them into dist/.
//
// Publication truth is neblux-depth/depth_manifest.json gated through the ONE
// shared predicate (isDepthPublishable: public + live + published + QA keys +
// depth_path). Pages that fail the gate are not copied at all — the output dir
// is wiped first, so a page that loses its published status disappears from
// the site on the next build. Outputs are gitignored build artifacts; the
// source of truth in depth/ is never modified.
//
// Each page is copied together with the local assets its HTML references
// (./name.css, ./name.js — including the shared sym-tooltip.js), and gets a
// zh-Hant self-canonical <link> injected at copy time (no en alternates until
// an en version exists). A published entry with a missing file is a broken
// deploy → throw, so the Vite plugin can fail the build loudly.

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync, existsSync, realpathSync } from 'fs';
import { resolve, dirname, basename, relative, isAbsolute, sep } from 'path';
import { fileURLToPath } from 'url';
import { isDepthPublishable } from '../neblux-depth/depth-contract.mjs';
import { ORIGIN } from './build_static_html.mjs';

export function isInsideDirectory(parentDir, candidatePath) {
    const rel = relative(parentDir, candidatePath);
    return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export function publishDepthPages(rootDir, publicDir) {
    const manifest = JSON.parse(readFileSync(resolve(rootDir, 'neblux-depth/depth_manifest.json'), 'utf8'));
    const srcDir = realpathSync(resolve(rootDir, 'depth'));
    const destDir = resolve(publicDir, 'depth');

    // Wipe first: unpublished/stale pages must vanish, not linger from a
    // previous build of a then-published manifest.
    rmSync(destDir, { recursive: true, force: true });

    const published = (manifest.entries || []).filter(isDepthPublishable);
    if (published.length === 0) return { count: 0, urls: [] };
    mkdirSync(destDir, { recursive: true });

    const urls = [];
    const copiedAssets = new Set();
    for (const entry of [...published].sort((a, b) => a.id.localeCompare(b.id))) {
        const htmlPath = resolve(rootDir, entry.depth_path);
        if (!existsSync(htmlPath)) throw new Error(`depth entry "${entry.id}": missing ${entry.depth_path}`);
        // Keep the URL contract id-addressed: /depth/<id>.html
        if (basename(htmlPath) !== `${entry.id}.html`) {
            throw new Error(`depth entry "${entry.id}": depth_path basename must be ${entry.id}.html`);
        }
        if (!isInsideDirectory(srcDir, realpathSync(htmlPath))) {
            throw new Error(`depth entry "${entry.id}": depth_path escapes depth/`);
        }

        let html = readFileSync(htmlPath, 'utf8');

        // Copy every same-directory asset the page references (./x.css?v=N,
        // ./x.js?v=N). HTML permits either quote style. Anything missing is a
        // broken published page → throw.
        for (const m of html.matchAll(/(?:src|href)\s*=\s*(["'])\.\/([^"'?#]+)(?:[?#][^"']*)?\1/g)) {
            const asset = m[2];
            if (asset.includes('/') || asset.includes('\\')) {
                throw new Error(`depth entry "${entry.id}": unexpected asset path "./${asset}" (same-dir files only)`);
            }
            const assetPath = resolve(srcDir, asset);
            if (!existsSync(assetPath)) throw new Error(`depth entry "${entry.id}": missing referenced asset ${asset}`);
            if (!copiedAssets.has(asset)) {
                copyFileSync(assetPath, resolve(destDir, asset));
                copiedAssets.add(asset);
            }
        }

        // zh-Hant self-canonical; injected at publish time so the offline
        // source stays deploy-target agnostic. Remove any source canonical
        // first so stale or single-quoted tags cannot create conflicts.
        const canonical = `<link rel="canonical" href="${ORIGIN}/depth/${entry.id}.html">`;
        html = html.replace(/<link\b(?=[^>]*\brel\s*=\s*(?:["']canonical["']|canonical(?=\s|>)))[^>]*>\s*/gi, '');
        if (!/<\/head\s*>/i.test(html)) throw new Error(`depth entry "${entry.id}": missing </head>`);
        html = html.replace(/<\/head\s*>/i, `${canonical}\n</head>`);

        writeFileSync(resolve(destDir, `${entry.id}.html`), html);
        urls.push(`/depth/${entry.id}.html`);
    }
    return { count: urls.length, urls };
}

// standalone
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build_depth_pages.mjs')) {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const res = publishDepthPages(root, resolve(root, 'frontend/public'));
    console.log(`depth pages: ${res.count} published → frontend/public/depth/ (${res.urls.join(', ') || 'none'})`);
}
