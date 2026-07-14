import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDepthPublishable } from '../neblux-depth/depth-contract.mjs';
import { ORIGIN } from '../scripts/build_static_html.mjs';
import { publishDepthPages } from '../scripts/build_depth_pages.mjs';

const QA = {
    csp_safe: true,
    reference_notes: true,
    formula_walkthrough: true,
    mobile_canvas_check: true,
};

function createFixture() {
    const root = resolve('test-results', `depth-publisher-${randomUUID()}`);
    const depthDir = resolve(root, 'depth');
    const publicDir = resolve(root, 'public');
    mkdirSync(resolve(root, 'neblux-depth'), { recursive: true });
    mkdirSync(depthDir, { recursive: true });
    const entry = {
        id: 'fixture',
        status: 'live',
        review_status: 'published',
        depth_path: 'depth/fixture.html',
        public: true,
        qa: { ...QA },
    };
    const writeManifest = (overrides = {}) => writeFileSync(
        resolve(root, 'neblux-depth/depth_manifest.json'),
        JSON.stringify({ entries: [{ ...entry, ...overrides }] }),
    );
    writeManifest();
    writeFileSync(resolve(depthDir, 'fixture.css'), 'body { color: white; }');
    writeFileSync(resolve(depthDir, 'fixture.js'), 'document.body.dataset.ready = "true";');
    writeFileSync(resolve(depthDir, 'fixture.html'), `<!doctype html><html><head>
<link rel='canonical' href='https://old.example/fixture'>
<link rel='stylesheet' href='./fixture.css?v=1'>
</head><body><main>fixture</main><script src='./fixture.js'></script></body></html>`);
    return { root, depthDir, publicDir, writeManifest };
}

test('publisher copies single-quoted assets and emits exactly one correct canonical', () => {
    const fixture = createFixture();
    try {
        const result = publishDepthPages(fixture.root, fixture.publicDir);
        assert.deepEqual(result.urls, ['/depth/fixture.html']);
        assert.ok(existsSync(resolve(fixture.publicDir, 'depth/fixture.css')));
        assert.ok(existsSync(resolve(fixture.publicDir, 'depth/fixture.js')));
        const html = readFileSync(resolve(fixture.publicDir, 'depth/fixture.html'), 'utf8');
        const canonicals = html.match(/<link\b(?=[^>]*\brel\s*=\s*(?:["']canonical["']|canonical(?=\s|>)))[^>]*>/gi) ?? [];
        assert.deepEqual(canonicals, [`<link rel="canonical" href="${ORIGIN}/depth/fixture.html">`]);
    } finally {
        rmSync(fixture.root, { recursive: true, force: true });
    }
});

test('publisher fails fast when a referenced single-quoted asset is missing', () => {
    const fixture = createFixture();
    try {
        rmSync(resolve(fixture.depthDir, 'fixture.js'));
        assert.throws(() => publishDepthPages(fixture.root, fixture.publicDir), /missing referenced asset fixture\.js/);
    } finally {
        rmSync(fixture.root, { recursive: true, force: true });
    }
});

test('publisher wipes stale output for every non-publishable state', () => {
    const fixture = createFixture();
    try {
        publishDepthPages(fixture.root, fixture.publicDir);
        const stale = resolve(fixture.publicDir, 'depth/stale.html');
        for (const state of [
            { public: false },
            { review_status: 'draft' },
            { status: 'draft' },
        ]) {
            mkdirSync(resolve(fixture.publicDir, 'depth'), { recursive: true });
            writeFileSync(stale, 'stale');
            fixture.writeManifest(state);
            assert.deepEqual(publishDepthPages(fixture.root, fixture.publicDir), { count: 0, urls: [] });
            assert.equal(existsSync(resolve(fixture.publicDir, 'depth')), false);
        }
    } finally {
        rmSync(fixture.root, { recursive: true, force: true });
    }
});

test('production dist/depth is exactly the publishable manifest asset set', () => {
    const root = resolve('.');
    const manifest = JSON.parse(readFileSync(resolve(root, 'neblux-depth/depth_manifest.json'), 'utf8'));
    const expected = new Set();
    for (const entry of manifest.entries.filter(isDepthPublishable)) {
        expected.add(`${entry.id}.html`);
        const html = readFileSync(resolve(root, entry.depth_path), 'utf8');
        for (const match of html.matchAll(/(?:src|href)\s*=\s*(["'])\.\/([^"'?#]+)(?:[?#][^"']*)?\1/g)) {
            expected.add(match[2]);
        }
    }
    const actual = new Set(readdirSync(resolve(root, 'dist/depth')));
    assert.deepEqual(actual, expected);
});
