import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  gaussianDensity,
  superpositionProbabilities,
  uncertaintyWidths,
  tunnelingTransmission,
  spinProbabilities,
  singletOutcome,
} from '../depth/quantum-depth.js';

const PAGES = [
  ['wavefunction', 'wavefunction.html', '波函數'],
  ['quantum-superposition', 'quantum-superposition.html', '量子疊加'],
  ['uncertainty-principle', 'uncertainty-principle.html', '不確定性原理'],
  ['quantum-tunneling', 'quantum-tunneling.html', '量子穿隧'],
  ['quantum-spin', 'quantum-spin.html', '量子自旋'],
  ['quantum-entanglement', 'quantum-entanglement.html', '量子糾纏'],
];

const manifest = JSON.parse(readFileSync(resolve('neblux-depth/depth_manifest.json'), 'utf8'));

test('first quantum batch keeps one precise term and one primary control per page', () => {
  for (const [id, file, title] of PAGES) {
    const html = readFileSync(resolve('depth', file), 'utf8');
    const h1 = html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, '').trim();
    assert.equal(h1?.startsWith(title), true, `${id}: exact topic starts H1`);
    assert.equal(title.includes('與'), false, `${id}: title is not an A-and-B bundle`);
    const controls = html.match(/<(?:input|button)\b/gi) ?? [];
    assert.equal(controls.length, 1, `${id}: exactly one primary control`);
    assert.match(html, /<canvas\b[^>]*aria-label=/i, `${id}: canvas has text alternative`);
    assert.match(html, /<noscript>[\s\S]*?<svg\b/i, `${id}: no-JS static phenomenon visual`);
    assert.match(html, /<details class="formal-details">/i, `${id}: formula is progressive disclosure`);
    assert.doesNotMatch(html, /href="\/neblux-(?:fonts|theme)\.css"/i, `${id}: stays on the approved standalone Depth visual baseline`);
    assert.match(html, /class="takeaway"/i, `${id}: single-sentence learning takeaway`);
    assert.match(html, /class="misconception"/i, `${id}: misconception boundary`);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i, `${id}: no inline event handlers`);
    for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
      assert.equal(
        /\ssrc\s*=\s*"\.\/[^\"]+"/.test(tag) || /type\s*=\s*"application\/json"/.test(tag),
        true,
        `${id}: CSP-safe script tag ${tag}`,
      );
    }
    const metaText = html.match(/<script id="node-meta" type="application\/json">([^<]+)<\/script>/i)?.[1];
    assert.ok(metaText, `${id}: node-meta exists`);
    const meta = JSON.parse(metaText);
    assert.equal(meta.depth_id, id, `${id}: metadata identity`);
    const entry = manifest.entries.find((candidate) => candidate.id === id);
    assert.ok(entry, `${id}: manifest entry`);
    assert.equal(entry.public, false, `${id}: candidate is not published before human gate`);
    assert.equal(entry.review_status, 'draft', `${id}: human review remains pending`);
    assert.equal(meta.node_id, entry.node_id, `${id}: graph mapping matches manifest`);
  }
});

test('quantum art direction mirrors the four approved Depth pages', () => {
  const css = readFileSync(resolve('depth', 'quantum-depth.css'), 'utf8');
  const js = readFileSync(resolve('depth', 'quantum-depth.js'), 'utf8');
  assert.match(css, /--bg:\s*#05070d/i, 'approved Depth background');
  assert.match(css, /--ink:\s*#eef4ff/i, 'approved Depth primary text');
  assert.match(css, /--muted:\s*#9ba8bd/i, 'approved Depth muted text');
  assert.match(css, /--line:\s*#223047/i, 'approved Depth rule colour');
  assert.match(css, /font:\s*16px\/1\.65 system-ui/i, 'approved Depth system font stack');
  assert.match(css, /--max:\s*1040px/i, 'approved Depth content measure');
  assert.match(css, /\.site-header\s*\{[\s\S]*?min-height:\s*56px/i, 'approved Depth header height');
  assert.match(css, /\.metaphor\s*\{[\s\S]*?max-width:\s*460px/i, 'approved Depth metaphor measure');
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*7/i, 'approved Depth desktop instrument ratio');
  assert.match(css, /\.section-kicker::before[\s\S]*?width:\s*18px[\s\S]*?border-radius:\s*50%/i, 'approved Depth numbered section marker');
  assert.doesNotMatch(`${css}\n${js}`, /\b(?:Inter|Oxanium|Sora|JetBrains Mono)\b/i, 'does not drift into the graph or landing font system');
});

test('shared symbol tooltip supports standalone formula disclosures', () => {
  const source = readFileSync(resolve('depth', 'sym-tooltip.js'), 'utf8');
  assert.match(source, /querySelector\('\.formal, \.formal-details'\)/, 'new standalone details and approved wrapped details both initialize');
});

test('Gaussian position density is normalized across representative widths', () => {
  for (const sigma of [0.45, 1, 1.8]) {
    const dx = 0.001;
    let sum = 0;
    for (let x = -12; x <= 12; x += dx) sum += gaussianDensity(x, sigma) * dx;
    assert.ok(Math.abs(sum - 1) < 2e-4, `sigma=${sigma}: integral=${sum}`);
  }
});

test('two-path superposition conserves probability and reaches bright/dark endpoints', () => {
  for (const phase of [0, Math.PI / 3, Math.PI / 2, Math.PI, TAU]) {
    const p = superpositionProbabilities(phase);
    assert.ok(Math.abs(p.bright + p.dark - 1) < 1e-12);
    assert.ok(p.bright >= 0 && p.bright <= 1 && p.dark >= 0 && p.dark <= 1);
  }
  assert.deepEqual(superpositionProbabilities(0), { bright: 1, dark: 0 });
  assert.ok(superpositionProbabilities(Math.PI).bright < 1e-30);
});

test('minimum-uncertainty Gaussian interaction preserves product while widths trade off', () => {
  const loose = uncertaintyWidths(0);
  const tight = uncertaintyWidths(1);
  assert.ok(tight.position < loose.position);
  assert.ok(tight.momentum > loose.momentum);
  for (const t of [0, 0.25, 0.5, 0.75, 1]) assert.ok(Math.abs(uncertaintyWidths(t).product - 0.5) < 1e-12);
});

test('finite rectangular barrier transmission is nonzero and strictly decreases with width', () => {
  const widths = [0, 0.2, 0.8, 1.6, 2.5, 4];
  const values = widths.map((width) => tunnelingTransmission(width));
  assert.equal(values[0], 1);
  assert.ok(values.every((value) => value > 0 && value <= 1));
  for (let i = 1; i < values.length; i += 1) assert.ok(values[i] < values[i - 1]);
});

test('spin-half direction probabilities stay binary and match canonical angles', () => {
  for (const angle of [0, 30, 90, 135, 180]) {
    const p = spinProbabilities(angle);
    assert.ok(Math.abs(p.up + p.down - 1) < 1e-12);
  }
  assert.ok(Math.abs(spinProbabilities(0).up - 1) < 1e-12);
  assert.ok(Math.abs(spinProbabilities(90).up - 0.5) < 1e-12);
  assert.ok(Math.abs(spinProbabilities(180).down - 1) < 1e-12);
});

test('singlet same-axis samples are always opposite while either local outcome occurs', () => {
  const pairs = Array.from({ length: 256 }, (_, index) => singletOutcome(index));
  assert.ok(pairs.every((pair) => pair.left !== pair.right));
  assert.deepEqual(new Set(pairs.map((pair) => pair.left)), new Set(['up', 'down']));
});

const TAU = Math.PI * 2;
