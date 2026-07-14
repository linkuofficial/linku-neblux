import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT, SOURCE_INPUTS, exitCodeFor, formatIssue } from './contract.mjs';
import { sourceFiles, validateRealSources } from './validate-sources.mjs';
import { isDepthPublishable } from '../../neblux-depth/depth-contract.mjs';
import {
    ARTIFACT_LOCALES, buildConstellationIndex, buildDepthIndex, buildPortalIndex,
    buildWonderArtifacts,
} from './artifact-contract.mjs';

export const ATLAS_DATA_ROOT = resolve(REPO_ROOT, 'frontend/public/data/atlas');

function makeConstellationSource(graphNodes, wonders) {
    const tours = {};
    const nodes = {};
    const nodeTours = {};
    for (const wonder of wonders) {
        const steps = [];
        wonder.steps.forEach((step, index) => {
            const nodeId = step.ref || step.local?.id;
            if (!nodeId) return;
            steps.push(nodeId);
            (nodes[nodeId] ||= []).push({ tour: wonder.id, step: index + 1 });
            if (step.ref) (nodeTours[step.ref] ||= new Set()).add(wonder.id);
        });
        tours[wonder.id] = { accent: wonder.accent || null, title: wonder.title || null, steps };
    }
    const typeById = Object.fromEntries(graphNodes.map((node) => [node.id, node.type]));
    const pairKey = (a, b) => a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
    const pairWeight = {};
    const pairVia = {};
    for (const node of graphNodes) {
        const sourceTours = nodeTours[node.id];
        if (!sourceTours) continue;
        for (const connection of node.connections || []) {
            if (connection.pending) continue;
            const targetTours = nodeTours[connection.target];
            if (!targetTours) continue;
            for (const a of sourceTours) for (const b of targetTours) {
                if (a === b) continue;
                const key = pairKey(a, b);
                pairWeight[key] = (pairWeight[key] || 0) + 1;
                const via = (pairVia[key] ||= {});
                via[node.id] = (via[node.id] || 0) + 1;
                via[connection.target] = (via[connection.target] || 0) + 1;
            }
        }
    }
    const related = {};
    for (const id of Object.keys(tours)) {
        const candidates = [];
        for (const other of Object.keys(tours)) {
            if (other === id) continue;
            const weight = pairWeight[pairKey(id, other)];
            if (!weight) continue;
            const via = pairVia[pairKey(id, other)];
            let bestVia = null;
            let bestScore = null;
            for (const nodeId of Object.keys(via)) {
                const score = [nodeTours[nodeId]?.has(id) && nodeTours[nodeId]?.has(other) ? 1 : 0, typeById[nodeId] === 'field' ? 0 : 1, via[nodeId]];
                if (!bestScore || score[0] > bestScore[0] || (score[0] === bestScore[0] && score[1] > bestScore[1])
                    || (score[0] === bestScore[0] && score[1] === bestScore[1] && score[2] > bestScore[2])
                    || (score[0] === bestScore[0] && score[1] === bestScore[1] && score[2] === bestScore[2] && nodeId < bestVia)) {
                    bestScore = score;
                    bestVia = nodeId;
                }
            }
            candidates.push({ tour: other, via: bestVia, weight });
        }
        candidates.sort((a, b) => b.weight - a.weight || a.tour.localeCompare(b.tour));
        related[id] = candidates.slice(0, 2);
    }
    return { tours, nodes, related };
}

function readJson(file) {
    return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function readLocaleData() {
    const root = resolve(REPO_ROOT, 'data/i18n');
    const labels = Object.fromEntries(ARTIFACT_LOCALES.map((locale) => [locale, readJson(resolve(root, `${locale}.json`))]));
    const descriptions = {};
    const sections = {};
    for (const locale of ARTIFACT_LOCALES.filter((value) => value !== 'en')) {
        descriptions[locale] = readJson(resolve(root, `${locale}_descriptions.json`));
        sections[locale] = readJson(resolve(root, `${locale}_sections.json`));
    }
    return { labels, descriptions, sections };
}

export function loadArtifactInputs() {
    const validation = validateRealSources();
    if (exitCodeFor(validation.issues) !== 0) {
        throw new Error(`Canonical Atlas sources are invalid:\n${validation.issues.map(formatIssue).join('\n')}`);
    }
    const files = sourceFiles();
    const graphRaw = readJson(files.graph);
    const graphNodes = Array.isArray(graphRaw) ? graphRaw : graphRaw.nodes;
    const wonders = files.wonders.map(readJson).sort((a, b) => a.id.localeCompare(b.id));
    const layouts = new Map(wonders.map((wonder) => [
        wonder.id,
        readJson(resolve(REPO_ROOT, 'config/atlas/layout/wonders', `${wonder.id}.json`)),
    ]));
    const depthManifest = readJson(files.depth);
    return {
        graphNodes,
        graphById: new Map(graphNodes.map((node) => [node.id, node])),
        graphIds: new Set(graphNodes.map((node) => node.id)),
        topology: validation.graph.topology,
        wonders,
        wonderIds: new Set(wonders.map((wonder) => wonder.id)),
        layouts,
        depthEntries: depthManifest.entries,
        localeData: readLocaleData(),
        legacyIndex: makeConstellationSource(graphNodes, wonders),
    };
}

export function expectedArtifactPaths(wonders) {
    const paths = ['constellation-index.json', 'depth-index.json', 'portal-index.json'];
    for (const wonder of wonders) {
        paths.push(`wonders/${wonder.id}.core.json`);
        for (const locale of ARTIFACT_LOCALES) paths.push(`wonders/${wonder.id}.${locale}.json`);
    }
    return paths.sort();
}

export function buildArtifactMap(inputs) {
    const artifacts = new Map();
    const warnings = [];
    const portalNodeIds = new Set(inputs.depthEntries.filter(isDepthPublishable).map((entry) => entry.node_id));
    for (const wonder of inputs.wonders) {
        const result = buildWonderArtifacts({
            wonder,
            layout: inputs.layouts.get(wonder.id),
            graphById: inputs.graphById,
            topology: inputs.topology,
            localeData: inputs.localeData,
            portalNodeIds,
        });
        artifacts.set(`wonders/${wonder.id}.core.json`, result.core);
        for (const locale of ARTIFACT_LOCALES) artifacts.set(`wonders/${wonder.id}.${locale}.json`, result.locales[locale]);
        warnings.push(...result.warnings);
    }
    artifacts.set('depth-index.json', buildDepthIndex(inputs.depthEntries));
    artifacts.set('portal-index.json', buildPortalIndex(inputs));
    artifacts.set('constellation-index.json', buildConstellationIndex(inputs.legacyIndex));
    return { artifacts, warnings };
}

export function canonicalSourcePaths() {
    return [
        SOURCE_INPUTS.graph,
        SOURCE_INPUTS.wonderDirectory,
        SOURCE_INPUTS.depthManifest,
        'config/atlas/layout/wonders',
        'data/i18n',
    ];
}
