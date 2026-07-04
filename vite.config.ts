import { defineConfig } from 'vite';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { copyFileSync, mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { buildTourIndex } from './scripts/build_tour_index.mjs';

function copyDataPlugin() {
    return {
        name: 'copy-data',
        async buildStart() {
            const srcDir = resolve(__dirname, 'data');
            const destDir = resolve(__dirname, 'frontend/public/data');
            mkdirSync(destDir, { recursive: true });

            // Split the monolithic graph payload into "topology" (everything the
            // graph needs to render — ids, labels, types, domains, connections) and
            // "descriptions" (the heavy English prose, ~780kB). The runtime loads
            // topology first and streams descriptions in afterwards, so the critical
            // first parse stays small. The source of truth in data/ is left intact;
            // both derived files land in the gitignored public/data.
            const raw = JSON.parse(readFileSync(resolve(srcDir, 'all_nodes.json'), 'utf8'));
            const nodes = (Array.isArray(raw) ? raw : raw.nodes) as any[];
            const descriptions: Record<string, string> = {};
            // Structured English sections (type-aware collapsibles). Split out like
            // descriptions and stripped from the slim topology so the first parse
            // stays small; streamed in at runtime (see api.fetchGraphSections).
            const sections: Record<string, any> = {};
            const slimNodes = nodes.map((n: any) => {
                let node = n;
                if (node && node.sections && typeof node.sections === 'object') {
                    sections[node.id] = node.sections;
                    const { sections: _drop, ...restNode } = node;
                    node = restNode;
                }
                if (node && typeof node.description === 'string' && node.description) {
                    descriptions[node.id] = node.description;
                    const { description, ...rest } = node;
                    return rest;
                }
                return node;
            });
            // Pre-bake the force layout: run the canonical simulation (shared with
            // the runtime via engine/layout.js) to rest and stamp x/y onto every
            // node. The page then opens on the settled constellation with zero
            // warm-up CPU and an identical layout on every device / reload.
            try {
                const layoutUrl = pathToFileURL(resolve(__dirname, 'frontend/src/engine/layout.js')).href;
                const { bakeLayout } = await import(layoutUrl);
                const positions = bakeLayout(nodes);
                const posById = new Map(positions.map((p: any) => [p.id, p]));
                for (const n of slimNodes) {
                    const p = posById.get(n.id);
                    if (p) { n.x = p.x; n.y = p.y; }
                }
            } catch (err) {
                // Non-fatal: without baked positions the runtime falls back to a
                // live warm-up. Surface it so a broken bake doesn't pass silently.
                this.warn?.(`layout bake skipped: ${(err as Error).message}`);
            }

            const slim = Array.isArray(raw) ? slimNodes : { ...raw, nodes: slimNodes };
            writeFileSync(resolve(destDir, 'all_nodes.json'), JSON.stringify(slim));
            writeFileSync(resolve(destDir, 'descriptions.json'), JSON.stringify(descriptions));
            writeFileSync(resolve(destDir, 'sections.json'), JSON.stringify(sections));

            const i18nSrc = resolve(srcDir, 'i18n');
            const i18nDest = resolve(destDir, 'i18n');
            if (existsSync(i18nSrc)) {
                mkdirSync(i18nDest, { recursive: true });
                // 只複製線上站實際載入的 i18n 檔；排除生成過程的中間/備份產物
                // （*_backup_*、*_mini_reviewed 等），避免把垃圾打包進 production。
                const isJunk = (name: string) => /backup|mini_reviewed/i.test(name);
                for (const f of readdirSync(i18nSrc)) {
                    if (f.endsWith('.json') && !isJunk(f)) {
                        copyFileSync(resolve(i18nSrc, f), resolve(i18nDest, f));
                    }
                }
            }

            // Wonders (curated curiosity tours) — small hand-authored JSON, copied
            // verbatim (no split/bake). The runtime reads /data/wonders/<id>.json.
            const wondersSrc = resolve(srcDir, 'wonders');
            const wondersDest = resolve(destDir, 'wonders');
            if (existsSync(wondersSrc)) {
                mkdirSync(wondersDest, { recursive: true });
                for (const f of readdirSync(wondersSrc)) {
                    if (f.endsWith('.json')) {
                        copyFileSync(resolve(wondersSrc, f), resolve(wondersDest, f));
                    }
                }
            }

            // Reverse-lookup index (tours/nodes/related) derived from the wonders +
            // graph. Written into public/data so dev serves it and build copies it
            // into dist/data. Consumed at runtime by the constellation layer and
            // the tour↔graph cross-links (progressive enhancement — a missing file
            // just means those extras don't appear).
            try {
                buildTourIndex(srcDir, [resolve(destDir, 'tour-index.json')]);
            } catch (err) {
                this.warn?.(`tour-index build skipped: ${(err as Error).message}`);
            }
        },
    };
}

export default defineConfig({
    root: 'frontend',
    plugins: [copyDataPlugin()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'frontend/src'),
        },
    },
    server: {
        port: 3000,
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'frontend/index.html'),
                app: resolve(__dirname, 'frontend/app.html'),
                explorer: resolve(__dirname, 'frontend/explorer.html'),
                wonders: resolve(__dirname, 'frontend/wonders.html'),
            },
        },
    },
});
