import { isDepthPublishable } from '../../neblux-depth/depth-contract.mjs';
import { issue, pairKey, sortIssues } from './contract.mjs';
import { MAIN_LAYOUT_VERSION, RENDERER_CONTRACT_VERSION } from './layout/policy.mjs';
import { auditArtifactEnvelope } from './audit-artifacts.mjs';

export const ARTIFACT_SCHEMA_VERSION = '1.0.0';
export const ARTIFACT_LOCALES = Object.freeze(['en', 'zh', 'ja']);

export function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
    }
    return value;
}

export function stableJson(value) {
    return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function envelope(layoutVersion = MAIN_LAYOUT_VERSION) {
    return {
        schemaVersion: ARTIFACT_SCHEMA_VERSION,
        layoutVersion,
        rendererContractVersion: RENDERER_CONTRACT_VERSION,
    };
}

function stepId(step) {
    return step.ref || step.local?.id;
}

function localized(value, locale) {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value !== 'object') return value;
    return value[locale] ?? value.en;
}

function compactObject(entries) {
    return Object.fromEntries(entries.filter(([, value]) => value !== undefined && value !== null));
}

export function wonderMembership(wonder) {
    const canonical = new Set();
    const local = new Map();
    for (const step of wonder.steps || []) {
        if (step.ref) canonical.add(step.ref);
        else if (step.local?.id) local.set(step.local.id, step.local);
    }
    for (const id of wonder.cluster?.context_refs || []) canonical.add(id);
    return { canonical, local, all: new Set([...canonical, ...local.keys()]) };
}

function nodeContent(id, locale, graphById, localNodes, localeData) {
    const local = localNodes.get(id);
    if (local) return { label: localized(local.label, locale) ?? id };
    const node = graphById.get(id);
    const label = localeData.labels?.[locale]?.[id] ?? node?.label ?? id;
    const description = locale === 'en'
        ? node?.description
        : localeData.descriptions?.[locale]?.[id] ?? node?.description;
    const sections = locale === 'en'
        ? node?.sections
        : localeData.sections?.[locale]?.[id] ?? node?.sections;
    return compactObject([
        ['label', label],
        ['description', description],
        ['sections', sections],
    ]);
}

export function buildWonderArtifacts({ wonder, layout, graphById, topology, localeData, portalNodeIds = new Set() }) {
    if (layout.wonderId !== wonder.id) throw new Error(`Wonder layout ${layout.wonderId} does not match source ${wonder.id}`);
    const membership = wonderMembership(wonder);
    const lockIds = Object.keys(layout.nodes || {});
    const missingLocks = [...membership.all].filter((id) => !layout.nodes?.[id]).sort();
    const extraLocks = lockIds.filter((id) => !membership.all.has(id)).sort();
    if (missingLocks.length || extraLocks.length) {
        throw new Error(`Wonder ${wonder.id} lock mismatch missing=[${missingLocks.join(',')}] extra=[${extraLocks.join(',')}]`);
    }

    const featured = new Set(wonder.cluster?.featured_portals || []);
    const stepById = new Map((wonder.steps || []).map((step, index) => [stepId(step), index + 1]));
    const nodes = lockIds.map((id) => {
        const lock = layout.nodes[id];
        const source = graphById.get(id) || membership.local.get(id);
        if (!source) throw new Error(`Wonder ${wonder.id} member ${id} has no canonical or local source`);
        if (membership.local.has(id) && (
            !['field', 'concept', 'person', 'event'].includes(source.type)
            || !Array.isArray(source.domain) || source.domain.length === 0
        )) {
            throw new Error(`Wonder ${wonder.id} local member ${id} must declare a valid type and non-empty domain`);
        }
        const roles = new Set([lock.role || (stepById.has(id) ? 'spine' : 'context')]);
        if (membership.local.has(id)) roles.add('local');
        if (featured.has(id) || portalNodeIds.has(id)) roles.add('portal');
        return compactObject([
            ['id', id],
            ['type', source.type],
            ['domain', [...(source.domain || [])].sort()],
            ['x', lock.x],
            ['y', lock.y],
            ['roles', [...roles].sort()],
            ['step', stepById.get(id)],
        ]);
    }).sort((a, b) => (a.step ?? Number.MAX_SAFE_INTEGER) - (b.step ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id));

    const graphEdges = topology
        .filter((edge) => membership.canonical.has(edge.source) && membership.canonical.has(edge.target))
        .map((edge) => ({ source: edge.source, target: edge.target }))
        .sort((a, b) => pairKey(a.source, a.target).localeCompare(pairKey(b.source, b.target)));
    const warnings = graphEdges.length > 150
        ? [`Wonder ${wonder.id} graphEdges=${graphEdges.length} exceeds the review threshold 150`]
        : [];

    const core = {
        ...envelope(layout.layoutVersion),
        wonderId: wonder.id,
        nodes,
        spineEdges: (wonder.edges || []).map((edge) => ({
            source: edge.source,
            target: edge.target,
            relation_type: edge.relation_type,
        })),
        graphEdges,
        guided: { stepNodeIds: (wonder.steps || []).map(stepId) },
    };

    const locales = {};
    for (const locale of ARTIFACT_LOCALES) {
        const contentNodes = Object.fromEntries(nodes.map((node) => [
            node.id,
            nodeContent(node.id, locale, graphById, membership.local, localeData),
        ]));
        const guidedSteps = (wonder.steps || []).map((step) => compactObject([
            ['id', stepId(step)],
            ['hook', localized(step.hook, locale)],
            ['reveal', localized(step.reveal, locale)],
            ['example', localized(step.example, locale)],
            ['surprise', localized(step.surprise, locale)],
            ['thread', localized(step.thread, locale)],
        ]));
        locales[locale] = compactObject([
            ...Object.entries(envelope(layout.layoutVersion)),
            ['wonderId', wonder.id],
            ['locale', locale],
            ['title', localized(wonder.title, locale)],
            ['intro', localized(wonder.intro, locale)],
            ['outward', localized(wonder.outward, locale)],
            ['reflect', localized(wonder.reflect, locale)],
            ['guided', { steps: guidedSteps }],
            ['nodes', contentNodes],
        ]);
    }
    return { core, locales, warnings };
}

function routePath(path) {
    return path.startsWith('/') ? path : `/${path.replaceAll('\\', '/')}`;
}

export function buildDepthIndex(entries) {
    const nodes = {};
    for (const entry of [...entries].filter(isDepthPublishable).sort((a, b) => a.id.localeCompare(b.id))) {
        const value = compactObject([
            ['id', entry.id],
            ['path', routePath(entry.depth_path)],
            ['focus', entry.focus],
            ['locales', [...(entry.locales || ['zh'])].sort()],
        ]);
        (nodes[entry.node_id] ||= []).push(value);
    }
    return { ...envelope(), nodes };
}

export function buildPortalIndex({ graphIds, wonders, depthEntries }) {
    const destinations = new Map();
    const ensure = (id) => {
        if (!graphIds.has(id)) throw new Error(`Portal canonical node ${id} does not exist`);
        if (!destinations.has(id)) destinations.set(id, [{ view: 'main', route: `/app.html?node=${encodeURIComponent(id)}` }]);
        return destinations.get(id);
    };
    for (const wonder of [...wonders].sort((a, b) => a.id.localeCompare(b.id))) {
        for (const id of [...wonderMembership(wonder).canonical].sort()) {
            ensure(id).push({
                view: 'wonder',
                id: wonder.id,
                route: `/wonders.html?w=${encodeURIComponent(wonder.id)}&mode=explore&node=${encodeURIComponent(id)}`,
            });
        }
    }
    for (const entry of [...depthEntries].filter(isDepthPublishable).sort((a, b) => a.id.localeCompare(b.id))) {
        ensure(entry.node_id).push(compactObject([
            ['view', 'depth'],
            ['id', entry.id],
            ['route', routePath(entry.depth_path)],
            ['focus', entry.focus],
        ]));
    }
    const nodes = {};
    for (const id of [...destinations.keys()].sort()) {
        const values = destinations.get(id);
        if (values.length > 1) nodes[id] = { destinations: values };
    }
    return { ...envelope(), nodes };
}

export function buildConstellationIndex(legacyIndex) {
    return {
        ...envelope(),
        tours: legacyIndex.tours || {},
        nodes: legacyIndex.nodes || {},
        related: legacyIndex.related || {},
    };
}

export function buildAtlasIndex(config, wonderSummaries = {}) {
    if (!config || typeof config !== 'object') throw new Error('Atlas presentation config is required');
    const wonders = {};
    for (const id of Object.keys(config.wonders || {}).sort()) {
        wonders[id] = { ...config.wonders[id], ...(wonderSummaries[id] || {}) };
    }
    return {
        ...envelope(config.layoutVersion),
        coordinateSystem: config.coordinateSystem,
        mainGalaxy: config.mainGalaxy,
        wonders,
        roads: (config.roads || []).filter((road) => road.approved === true),
    };
}

function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

export function validateWonderCore(core, graphIds, file = 'wonder.core.json') {
    const issues = [...auditArtifactEnvelope(core, graphIds, file)];
    if (typeof core?.wonderId !== 'string' || !core.wonderId) issues.push(issue(file, '$.wonderId', 'must be a non-empty string'));
    if (!Array.isArray(core?.nodes)) issues.push(issue(file, '$.nodes', 'must be an array'));
    const members = new Set();
    for (const [index, node] of (core?.nodes || []).entries()) {
        if (!isObject(node) || typeof node.id !== 'string') issues.push(issue(file, `$.nodes[${index}].id`, 'must be a string'));
        else if (members.has(node.id)) issues.push(issue(file, `$.nodes[${index}].id`, `duplicate member ${node.id}`));
        else members.add(node.id);
        if (!Number.isFinite(node?.x) || !Number.isFinite(node?.y)) issues.push(issue(file, `$.nodes[${index}]`, 'x and y must be finite'));
        if (!['field', 'concept', 'person', 'event'].includes(node?.type)) issues.push(issue(file, `$.nodes[${index}].type`, 'must be a canonical node type'));
        if (!Array.isArray(node?.domain) || !node.domain.length) issues.push(issue(file, `$.nodes[${index}].domain`, 'must be a non-empty array'));
        if (!Array.isArray(node?.roles) || !node.roles.length) issues.push(issue(file, `$.nodes[${index}].roles`, 'must be a non-empty array'));
        else for (const role of node.roles) if (!['spine', 'context', 'local', 'portal'].includes(role)) issues.push(issue(file, `$.nodes[${index}].roles`, `unknown role ${role}`));
        if (node?.step !== undefined && (!Number.isInteger(node.step) || node.step < 1)) issues.push(issue(file, `$.nodes[${index}].step`, 'must be a positive integer'));
    }
    for (const key of ['spineEdges', 'graphEdges']) {
        if (!Array.isArray(core?.[key])) issues.push(issue(file, `$.${key}`, 'must be an array'));
        for (const [index, edge] of (core?.[key] || []).entries()) {
            if (!members.has(edge?.source) || !members.has(edge?.target)) issues.push(issue(file, `$.${key}[${index}]`, 'edge endpoints must be bundle members'));
            if (edge?.source === edge?.target) issues.push(issue(file, `$.${key}[${index}]`, 'self-loop is not allowed'));
        }
    }
    if (!Array.isArray(core?.guided?.stepNodeIds)) issues.push(issue(file, '$.guided.stepNodeIds', 'must be an array'));
    return sortIssues(issues);
}

export function validateWonderLocale(sidecar, core, file = 'wonder.locale.json') {
    const issues = [...auditArtifactEnvelope(sidecar, new Set(), file)];
    if (sidecar?.wonderId !== core?.wonderId) issues.push(issue(file, '$.wonderId', 'must match core wonderId'));
    if (!ARTIFACT_LOCALES.includes(sidecar?.locale)) issues.push(issue(file, '$.locale', 'must be en, zh or ja'));
    const coreIds = new Set((core?.nodes || []).map((node) => node.id));
    const sidecarIds = new Set(Object.keys(sidecar?.nodes || {}));
    for (const id of coreIds) if (!sidecarIds.has(id)) issues.push(issue(file, `$.nodes.${id}`, 'localized node is missing'));
    for (const id of sidecarIds) if (!coreIds.has(id)) issues.push(issue(file, `$.nodes.${id}`, 'localized node is not in core'));
    for (const [id, node] of Object.entries(sidecar?.nodes || {})) if (typeof node?.label !== 'string' || !node.label) issues.push(issue(file, `$.nodes.${id}.label`, 'must be a non-empty string'));
    for (const key of ['title', 'intro', 'outward']) if (typeof sidecar?.[key] !== 'string') issues.push(issue(file, `$.${key}`, 'must be a string'));
    if (!Array.isArray(sidecar?.reflect)) issues.push(issue(file, '$.reflect', 'must be an array'));
    if (!Array.isArray(sidecar?.guided?.steps)) issues.push(issue(file, '$.guided.steps', 'must be an array'));
    else {
        const expected = core?.guided?.stepNodeIds || [];
        const actual = sidecar.guided.steps.map((step) => step?.id);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) issues.push(issue(file, '$.guided.steps', 'step ids and order must match core guided.stepNodeIds'));
        for (const [index, step] of sidecar.guided.steps.entries()) for (const key of ['hook', 'reveal', 'example', 'surprise', 'thread']) {
            if (typeof step?.[key] !== 'string') issues.push(issue(file, `$.guided.steps[${index}].${key}`, 'must be a string'));
        }
    }
    return sortIssues(issues);
}

export function validateDepthIndex(index, graphIds, file = 'depth-index.json') {
    const issues = [...auditArtifactEnvelope(index, graphIds, file)];
    if (!isObject(index?.nodes)) issues.push(issue(file, '$.nodes', 'must be an object'));
    for (const [nodeId, entries] of Object.entries(index?.nodes || {})) {
        if (!graphIds.has(nodeId)) issues.push(issue(file, `$.nodes.${nodeId}`, 'canonical node does not exist'));
        if (!Array.isArray(entries)) issues.push(issue(file, `$.nodes.${nodeId}`, 'must be an array'));
        for (const [entryIndex, entry] of (entries || []).entries()) {
            if (typeof entry?.id !== 'string' || typeof entry?.path !== 'string' || !entry.path.startsWith('/depth/')) {
                issues.push(issue(file, `$.nodes.${nodeId}[${entryIndex}]`, 'must contain id and a /depth/ path'));
            }
        }
    }
    return sortIssues(issues);
}

export function validatePortalIndex(index, graphIds, wonderIds, file = 'portal-index.json') {
    const issues = [...auditArtifactEnvelope(index, graphIds, file)];
    for (const [nodeId, entry] of Object.entries(index?.nodes || {})) {
        if (!graphIds.has(nodeId)) issues.push(issue(file, `$.nodes.${nodeId}`, 'canonical node does not exist'));
        if (!Array.isArray(entry?.destinations) || entry.destinations.length < 2) issues.push(issue(file, `$.nodes.${nodeId}.destinations`, 'must contain Main and at least one extra destination'));
        if (entry?.destinations?.[0]?.view !== 'main') issues.push(issue(file, `$.nodes.${nodeId}.destinations[0]`, 'first destination must be Main'));
        for (const [indexValue, destination] of (entry?.destinations || []).entries()) {
            if (destination.view === 'wonder' && !wonderIds.has(destination.id)) issues.push(issue(file, `$.nodes.${nodeId}.destinations[${indexValue}]`, `Wonder ${String(destination.id)} does not exist`));
            if (!['main', 'wonder', 'depth'].includes(destination.view)) issues.push(issue(file, `$.nodes.${nodeId}.destinations[${indexValue}].view`, 'unknown destination view'));
            if (typeof destination.route !== 'string' || !destination.route.startsWith('/')) issues.push(issue(file, `$.nodes.${nodeId}.destinations[${indexValue}].route`, 'must be a root-relative route'));
        }
    }
    return sortIssues(issues);
}

export function validateConstellationIndex(index, wonderIds, file = 'constellation-index.json') {
    const issues = [...auditArtifactEnvelope(index, new Set(), file)];
    for (const id of Object.keys(index?.tours || {})) if (!wonderIds.has(id)) issues.push(issue(file, `$.tours.${id}`, 'Wonder does not exist'));
    for (const [nodeId, memberships] of Object.entries(index?.nodes || {})) {
        for (const [entryIndex, membership] of (memberships || []).entries()) {
            if (!wonderIds.has(membership.tour)) issues.push(issue(file, `$.nodes.${nodeId}[${entryIndex}]`, 'Wonder does not exist'));
        }
    }
    return sortIssues(issues);
}

function parseRegionReference(value) {
    if (value === 'main') return { type: 'main', id: 'main' };
    if (typeof value === 'string' && value.startsWith('wonder:')) return { type: 'wonder', id: value.slice('wonder:'.length) };
    return null;
}

export function validateAtlasIndex(index, wonderIds, file = 'index.json', { graphIds = new Set() } = {}) {
    const issues = [...auditArtifactEnvelope(index, new Set(), file)];
    if (!isObject(index?.coordinateSystem) || !isObject(index?.mainGalaxy) || !isObject(index?.wonders) || !Array.isArray(index?.roads)) {
        issues.push(issue(file, '$', 'must contain coordinateSystem, mainGalaxy, wonders and roads'));
    }
    for (const id of Object.keys(index?.wonders || {})) if (!wonderIds.has(id)) issues.push(issue(file, `$.wonders.${id}`, 'Wonder does not exist'));
    for (const [roadIndex, road] of (index?.roads || []).entries()) {
        const path = `$.roads[${roadIndex}]`;
        if (road.approved !== true) issues.push(issue(file, `${path}.approved`, 'only approved roads may be published'));
        const from = parseRegionReference(road.from);
        const to = parseRegionReference(road.to);
        if (!from) issues.push(issue(file, `${path}.from`, 'must be main or a wonder:<id> reference'));
        if (!to) issues.push(issue(file, `${path}.to`, 'must be main or a wonder:<id> reference'));
        if (from && to) {
            if (from.type === 'wonder' && !wonderIds.has(from.id)) issues.push(issue(file, `${path}.from`, `Wonder ${from.id} does not exist`));
            if (to.type === 'wonder' && !wonderIds.has(to.id)) issues.push(issue(file, `${path}.to`, `Wonder ${to.id} does not exist`));
            if (from.id === to.id) issues.push(issue(file, path, 'road endpoints must be different'));
        }
        if (graphIds.size && !graphIds.has(road.via)) issues.push(issue(file, `${path}.via`, `canonical node ${String(road.via)} does not exist`));
    }
    return sortIssues(issues);
}
