import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { DEPTH_QA_KEYS, DEPTH_REVIEW_STATUSES, DEPTH_STATUSES, isDepthPublishable } from './depth-contract.mjs';

const root = resolve(import.meta.dirname, '..');
const fail = [];
const ok = [];
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

const manifest = readJson('neblux-depth/depth_manifest.json');
const graphRaw = readJson(manifest.source_graph || 'data/all_nodes.json');
const nodes = Array.isArray(graphRaw) ? graphRaw : graphRaw.nodes;
const graphIds = new Set(nodes.map((node) => node.id));
const ids = new Set();
const nodeIds = new Set();
const statuses = new Set(DEPTH_STATUSES);
// review_status is the v0.4 triage/decision lifecycle (governance metadata),
// distinct from `status` (manifest build lifecycle). Enum extends the V03 §2 set
// with pending_triage (initial value for existing pages) and pending_rework
// (a triage outcome), which the reconciliation packet's docs both use.
const reviewStatuses = new Set(DEPTH_REVIEW_STATUSES);
const confidences = new Set(['low', 'medium', 'high']);
const qaKeys = DEPTH_QA_KEYS;
const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function check(condition, message) {
    (condition ? ok : fail).push(message);
}

function scriptTags(html) {
    return html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
}

function attr(tag, name) {
    return tag.match(new RegExp(`\\s${name}\\s*=\\s*["']?([^"'\\s>]+)`, 'i'))?.[1] || '';
}

function hasExecutableInlineScript(html) {
    return scriptTags(html).some((tag) => {
        if (/\ssrc\s*=/i.test(tag)) return false;
        const type = attr(tag, 'type').toLowerCase() || 'text/javascript';
        return !['application/json', 'application/ld+json'].includes(type);
    });
}

function hasInlineEventHandler(html) {
    return /\son[a-z]+\s*=/i.test(html);
}

function nodeMeta(html) {
    const tag = scriptTags(html).find((script) => attr(script, 'id') === 'node-meta');
    if (!tag) return null;
    const type = attr(tag, 'type').toLowerCase();
    if (type !== 'application/json') return null;
    const json = tag.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}

check(manifest.version === '0.2', 'manifest version is 0.2');
check(Array.isArray(manifest.entries), 'manifest entries is an array');

for (const entry of manifest.entries || []) {
    const label = entry.id || '<missing id>';
    check(idPattern.test(label), `${label}: id is kebab-case`);
    check(!ids.has(label), `${label}: id is unique`);
    ids.add(label);

    check(typeof entry.node_id === 'string' && graphIds.has(entry.node_id), `${label}: node_id exists in ${manifest.source_graph}`);
    check(!nodeIds.has(entry.node_id), `${label}: node_id is not reused by another depth page`);
    nodeIds.add(entry.node_id);

    check(statuses.has(entry.status), `${label}: status is valid`);
    check(reviewStatuses.has(entry.review_status), `${label}: review_status is valid`);
    check(entry.reviewed_at === null || typeof entry.reviewed_at === 'string', `${label}: reviewed_at is null or string`);
    check(confidences.has(entry.mapping_confidence), `${label}: mapping_confidence is valid`);
    check(typeof entry.public === 'boolean', `${label}: public is boolean`);

    // Optional v0.4 governance fields — validated only when present, so future
    // authored pages (e.g. quant-outliers) can carry them without forcing the
    // pre-triage pages to fabricate content.
    if (entry.source_notes !== undefined) check(typeof entry.source_notes === 'string' && !entry.source_notes.includes('..'), `${label}: source_notes is a local path`);
    if (entry.content_focus !== undefined) check(typeof entry.content_focus === 'string', `${label}: content_focus is a string`);
    if (entry.tour_refs !== undefined) check(Array.isArray(entry.tour_refs) && entry.tour_refs.every((r) => typeof r === 'string'), `${label}: tour_refs is a string array`);
    if (entry.locales !== undefined) check(Array.isArray(entry.locales) && entry.locales.every((l) => typeof l === 'string'), `${label}: locales is a string array`);

    for (const key of qaKeys) {
        check(typeof entry.qa?.[key] === 'boolean', `${label}: qa.${key} is boolean`);
    }

    if (entry.public) {
        for (const key of qaKeys) check(entry.qa[key] === true, `${label}: public page passed qa.${key}`);
        check(entry.status === 'live', `${label}: public page status is live`);
        check(entry.review_status === 'published', `${label}: public page review_status is published`);
        check(typeof entry.depth_path === 'string' && entry.depth_path.length > 0, `${label}: public page has depth_path`);
        check(isDepthPublishable(entry), `${label}: public page satisfies shared publication predicate`);
    }

    if (entry.notes_path) {
        check(typeof entry.notes_path === 'string' && !entry.notes_path.includes('..'), `${label}: notes_path is local`);
        check(existsSync(resolve(root, entry.notes_path)), `${label}: notes_path file exists`);
    }

    if (entry.depth_path !== null) {
        check(typeof entry.depth_path === 'string' && entry.depth_path.startsWith('depth/') && !entry.depth_path.includes('..'), `${label}: depth_path stays under depth/`);
        const path = resolve(root, entry.depth_path);
        check(existsSync(path), `${label}: depth_path file exists`);
        if (existsSync(path)) {
            const html = readFileSync(path, 'utf8');
            const meta = nodeMeta(html);
            check(!hasExecutableInlineScript(html), `${label}: depth page has no executable inline script`);
            check(!hasInlineEventHandler(html), `${label}: depth page has no inline event handlers`);
            check(Boolean(meta), `${label}: node-meta JSON exists`);
            if (meta) {
                check(meta.depth_id === entry.id, `${label}: node-meta depth_id matches manifest`);
                check(meta.node_id === entry.node_id, `${label}: node-meta node_id matches manifest`);
                check(meta.spec_version === manifest.version, `${label}: node-meta spec_version matches manifest`);
            }
        }
    }
}

if (fail.length) {
    console.error('depth manifest validation failed:');
    for (const message of fail) console.error(`- ${message}`);
    process.exit(1);
}

console.log(`depth manifest validation passed (${ok.length} checks, ${manifest.entries.length} entries)`);
