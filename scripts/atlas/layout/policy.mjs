import { createHash } from 'node:crypto';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3';
import { pairKey, projectTopology } from '../contract.mjs';

export const MAIN_LAYOUT_VERSION = 'main-2.0.0';
export const SOFT_LOCK_RADIUS = 90;
export const TYPE_RADIUS = Object.freeze({ field: 22, concept: 8, person: 11, event: 13 });
export const RENDERER_CONTRACT_VERSION = '2.0.0';
export const MAIN_SOLVER_VERSION = 'main-anchored-1.0.0';
export const WONDER_SOLVER_VERSION = 'wonder-spine-1.0.0';
export const D3_VERSION = '7.9.0';
export const TOOLCHAIN = Object.freeze({ nodeMajor: Number(process.versions.node.split('.')[0]), d3Version: D3_VERSION });
export const MAIN_SOLVER_PARAMS = Object.freeze({
    ticks: 520, tailWindow: 20, jitterScale: 360, linkDistance: 105, linkStrength: 0.035,
    chargeAnchor: -260, chargeField: -110, chargeOrdinary: -34, anchorPull: 0.075,
    collisionPadding: 4, collisionIterations: 3, alphaDecay: 0.015, velocityDecay: 0.42,
});
export const LOCAL_SOLVER_PARAMS = Object.freeze({
    ticks: 180, jitterScale: 900, anchorWeight: 0.55, neighborWeight: 0.35,
    jitterWeight: 0.10, linkDistance: 90, linkStrength: 0.12, charge: -28,
    newPull: 0.18, neighborPull: 0.45, collisionPadding: 4,
    collisionIterations: 3, velocityDecay: 0.5,
});
export const WONDER_SOLVER_PARAMS = Object.freeze({ spineSpacing: 170, spineWave: 0.7, spineAmplitude: 85 });
export const CELESTIAL_CLASSIFICATION_POLICY = Object.freeze({
    version: '1.0.0',
    bridgeMinDomains: 3,
    bridgeMinActiveDegree: 12,
    brightMinActiveDegree: 20,
});

export function round(value, digits = 2) {
    const scale = 10 ** digits;
    return Math.round(value * scale) / scale;
}

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

export function fingerprint(value) {
    return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`;
}

export function nodeSetFingerprint(nodes) {
    return fingerprint(nodes.map((node) => node.id).sort());
}

export function layoutInputsFingerprint(nodes) {
    return fingerprint(nodes.map((node) => [node.id, [...(node.domain || [])].sort(), node.type]).sort(([a], [b]) => a.localeCompare(b)));
}

export function layoutInputSnapshot(nodes) {
    return Object.fromEntries([...nodes].sort((a, b) => a.id.localeCompare(b.id)).map((node) => [node.id, { domains: [...(node.domain || [])].sort(), type: node.type }]));
}

export function anchorFingerprint(anchorConfig) {
    return fingerprint(Object.fromEntries(Object.entries(anchorConfig.anchors).sort().map(([domain, anchor]) => [domain, {
        nodeId: anchor.nodeId, x: anchor.x, y: anchor.y, lock: anchor.lock,
        massClass: anchor.massClass, archetype: anchor.archetype,
    }])));
}

export function relationFingerprint(records) {
    return fingerprint(projectTopology(records).map((pair) => [pair.source, pair.target]));
}

export function classificationInputsFingerprint(nodes, records) {
    return fingerprint({
        nodes: nodes.map((node) => [node.id, node.type, [...(node.domain || [])].sort()]).sort(([a], [b]) => a.localeCompare(b)),
        activePairs: projectTopology(records).map((pair) => [pair.source, pair.target]),
        policy: CELESTIAL_CLASSIFICATION_POLICY,
    });
}

function hashNumbers(id) {
    const bytes = createHash('sha256').update(id).digest();
    return [bytes.readUInt32BE(0) / 0xffffffff, bytes.readUInt32BE(4) / 0xffffffff];
}

export function deterministicJitter(id, scale = 1200) {
    const [x, y] = hashNumbers(id);
    return { x: (x * 2 - 1) * scale, y: (y * 2 - 1) * scale };
}

function lcg(seed = 0x6d2b79f5) {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function anchorTarget(node, anchors) {
    const found = (node.domain || []).map((domain) => anchors[domain]).filter(Boolean);
    if (!found.length) throw new Error(`node ${node.id} has no configured domain anchor`);
    return {
        x: found.reduce((sum, anchor) => sum + anchor.x, 0) / found.length,
        y: found.reduce((sum, anchor) => sum + anchor.y, 0) / found.length,
    };
}

function radius(node) {
    return TYPE_RADIUS[node.type] || TYPE_RADIUS.concept;
}

export function makeInitialMainLayoutResult(rawNodes, records, anchorConfig, { ticks = MAIN_SOLVER_PARAMS.ticks } = {}) {
    const anchors = anchorConfig.anchors;
    const hardById = new Map(Object.values(anchors).map((anchor) => [anchor.nodeId, anchor]));
    const nodes = [...rawNodes].sort((a, b) => a.id.localeCompare(b.id)).map((raw) => {
        const hard = hardById.get(raw.id);
        if (hard) return { id: raw.id, type: raw.type, domain: raw.domain, x: hard.x, y: hard.y, fx: hard.x, fy: hard.y, targetX: hard.x, targetY: hard.y };
        const target = anchorTarget(raw, anchors);
        const jitter = deterministicJitter(raw.id, MAIN_SOLVER_PARAMS.jitterScale);
        return { id: raw.id, type: raw.type, domain: raw.domain, x: target.x + jitter.x, y: target.y + jitter.y, targetX: target.x, targetY: target.y };
    });
    const topology = projectTopology(records).map((pair) => ({ source: pair.source, target: pair.target }));
    const simulation = forceSimulation(nodes)
        .randomSource(lcg())
        .force('link', forceLink(topology).id((node) => node.id).distance(MAIN_SOLVER_PARAMS.linkDistance).strength(MAIN_SOLVER_PARAMS.linkStrength))
        .force('charge', forceManyBody().strength((node) => node.fx !== undefined ? MAIN_SOLVER_PARAMS.chargeAnchor : node.type === 'field' ? MAIN_SOLVER_PARAMS.chargeField : MAIN_SOLVER_PARAMS.chargeOrdinary).theta(0.9))
        .force('x', forceX((node) => node.targetX).strength((node) => node.fx !== undefined ? 0 : MAIN_SOLVER_PARAMS.anchorPull))
        .force('y', forceY((node) => node.targetY).strength((node) => node.fy !== undefined ? 0 : MAIN_SOLVER_PARAMS.anchorPull))
        .force('collision', forceCollide((node) => radius(node) + MAIN_SOLVER_PARAMS.collisionPadding).strength(1).iterations(MAIN_SOLVER_PARAMS.collisionIterations))
        .alpha(1).alphaDecay(MAIN_SOLVER_PARAMS.alphaDecay).velocityDecay(MAIN_SOLVER_PARAMS.velocityDecay).stop();
    let maxTailStep = 0;
    for (let tick = 0; tick < ticks; tick += 1) {
        const previous = tick >= ticks - MAIN_SOLVER_PARAMS.tailWindow ? nodes.map((node) => [node.x, node.y]) : null;
        simulation.tick();
        if (previous) nodes.forEach((node, index) => { maxTailStep = Math.max(maxTailStep, Math.hypot(node.x - previous[index][0], node.y - previous[index][1])); });
    }
    const layoutNodes = {};
    for (const node of [...nodes].sort((a, b) => a.id.localeCompare(b.id))) {
        const hard = hardById.get(node.id);
        layoutNodes[node.id] = hard
            ? { x: hard.x, y: hard.y, lock: 'hard' }
            : { x: round(node.x), y: round(node.y), lock: 'soft', radius: SOFT_LOCK_RADIUS };
    }
    const layout = {
        schemaVersion: '1.0.0', layoutVersion: MAIN_LAYOUT_VERSION, rendererContractVersion: RENDERER_CONTRACT_VERSION,
        solverVersion: MAIN_SOLVER_VERSION,
        algorithmParamsHash: fingerprint({ main: MAIN_SOLVER_PARAMS, local: LOCAL_SOLVER_PARAMS, typeRadius: TYPE_RADIUS }),
        toolchain: { ...TOOLCHAIN },
        layoutInputsFingerprint: layoutInputsFingerprint(rawNodes),
        layoutInputSnapshot: layoutInputSnapshot(rawNodes),
        nodeSetFingerprint: nodeSetFingerprint(rawNodes),
        anchorConfigFingerprint: anchorFingerprint(anchorConfig),
        nodes: layoutNodes,
    };
    const finalKineticEnergy = nodes.reduce((sum, node) => sum + (node.vx || 0) ** 2 + (node.vy || 0) ** 2, 0);
    const finalMaxSpeed = Math.max(...nodes.map((node) => Math.hypot(node.vx || 0, node.vy || 0)));
    const diagnostics = { ticks, tailWindow: MAIN_SOLVER_PARAMS.tailWindow, maxTailStep: round(maxTailStep, 6), finalKineticEnergy: round(finalKineticEnergy, 6), finalMaxSpeed: round(finalMaxSpeed, 6) };
    return { layout, diagnostics };
}

export function makeInitialMainLayout(rawNodes, records, anchorConfig, options) {
    return makeInitialMainLayoutResult(rawNodes, records, anchorConfig, options).layout;
}

export function activeNeighborIds(records, id) {
    const result = new Set();
    for (const pair of projectTopology(records)) {
        if (pair.source === id) result.add(pair.target);
        if (pair.target === id) result.add(pair.source);
    }
    return result;
}

// The anchor and neighbour centroid are positions and are therefore normalized
// before deterministic jitter is applied as an offset vector.
export function localInitialTarget(domain, neighborPositions, jitter) {
    if (!neighborPositions.length) return {
        x: domain.x + LOCAL_SOLVER_PARAMS.jitterWeight * jitter.x,
        y: domain.y + LOCAL_SOLVER_PARAMS.jitterWeight * jitter.y,
    };
    const centroid = neighborPositions.reduce((sum, position) => ({ x: sum.x + position.x, y: sum.y + position.y }), { x: 0, y: 0 });
    centroid.x /= neighborPositions.length; centroid.y /= neighborPositions.length;
    const positionWeight = LOCAL_SOLVER_PARAMS.anchorWeight + LOCAL_SOLVER_PARAMS.neighborWeight;
    return {
        x: (LOCAL_SOLVER_PARAMS.anchorWeight * domain.x + LOCAL_SOLVER_PARAMS.neighborWeight * centroid.x) / positionWeight + LOCAL_SOLVER_PARAMS.jitterWeight * jitter.x,
        y: (LOCAL_SOLVER_PARAMS.anchorWeight * domain.y + LOCAL_SOLVER_PARAMS.neighborWeight * centroid.y) / positionWeight + LOCAL_SOLVER_PARAMS.jitterWeight * jitter.y,
    };
}

export function addNodeLocally(rawNodes, records, layout, anchorConfig, nodeId, { ticks = LOCAL_SOLVER_PARAMS.ticks } = {}) {
    const rawById = new Map(rawNodes.map((node) => [node.id, node]));
    const raw = rawById.get(nodeId);
    if (!raw) throw new Error(`node ${nodeId} does not exist in canonical graph`);
    if (layout.nodes[nodeId]) throw new Error(`node ${nodeId} already has a layout lock`);
    const neighborIds = activeNeighborIds(records, nodeId);
    const lockedNeighbors = [...neighborIds].filter((id) => layout.nodes[id]);
    const domain = anchorTarget(raw, anchorConfig.anchors);
    const jitter = deterministicJitter(nodeId, LOCAL_SOLVER_PARAMS.jitterScale);
    const target = localInitialTarget(domain, lockedNeighbors.map((id) => layout.nodes[id]), jitter);
    const localIds = new Set([nodeId, ...lockedNeighbors.filter((id) => layout.nodes[id].lock !== 'hard')]);
    const simulationNodes = [{ id: nodeId, type: raw.type, x: target.x, y: target.y, targetX: target.x, targetY: target.y }];
    for (const id of lockedNeighbors) {
        const lock = layout.nodes[id]; const source = rawById.get(id);
        simulationNodes.push({ id, type: source?.type, x: lock.x, y: lock.y, targetX: lock.x, targetY: lock.y, ...(lock.lock === 'hard' ? { fx: lock.x, fy: lock.y } : {}) });
    }
    const localEdges = lockedNeighbors.map((id) => ({ source: nodeId, target: id }));
    const simulation = forceSimulation(simulationNodes).randomSource(lcg(0x12345678))
        .force('link', forceLink(localEdges).id((node) => node.id).distance(LOCAL_SOLVER_PARAMS.linkDistance).strength(LOCAL_SOLVER_PARAMS.linkStrength))
        .force('charge', forceManyBody().strength(LOCAL_SOLVER_PARAMS.charge))
        .force('x', forceX((node) => node.targetX).strength((node) => node.id === nodeId ? LOCAL_SOLVER_PARAMS.newPull : LOCAL_SOLVER_PARAMS.neighborPull))
        .force('y', forceY((node) => node.targetY).strength((node) => node.id === nodeId ? LOCAL_SOLVER_PARAMS.newPull : LOCAL_SOLVER_PARAMS.neighborPull))
        .force('collision', forceCollide((node) => radius(node) + LOCAL_SOLVER_PARAMS.collisionPadding).iterations(LOCAL_SOLVER_PARAMS.collisionIterations))
        .alpha(1).alphaDecay(0).velocityDecay(LOCAL_SOLVER_PARAMS.velocityDecay).stop();
    for (let tick = 0; tick < ticks; tick += 1) simulation.tick();
    const next = structuredClone(layout);
    for (const node of simulationNodes) {
        if (!localIds.has(node.id)) continue;
        if (node.id === nodeId) next.nodes[node.id] = { x: round(node.x), y: round(node.y), lock: 'new', radius: SOFT_LOCK_RADIUS };
        else {
            const before = layout.nodes[node.id];
            const dx = node.x - before.x; const dy = node.y - before.y;
            const distance = Math.hypot(dx, dy); const limit = before.radius ?? SOFT_LOCK_RADIUS;
            const scale = distance > limit ? limit / distance : 1;
            next.nodes[node.id] = { ...before, x: round(before.x + dx * scale), y: round(before.y + dy * scale) };
        }
    }
    next.nodeSetFingerprint = nodeSetFingerprint(rawNodes);
    next.layoutInputsFingerprint = layoutInputsFingerprint(rawNodes);
    next.layoutInputSnapshot = layoutInputSnapshot(rawNodes);
    return next;
}

export function finalizeNewLocks(layout) {
    const next = structuredClone(layout);
    for (const lock of Object.values(next.nodes)) if (lock.lock === 'new') lock.lock = 'soft';
    return next;
}

export function wonderMembers(wonder) {
    const members = [];
    wonder.steps.forEach((step, index) => members.push({ id: step.ref ?? step.local?.id, role: 'spine', step: index + 1 }));
    for (const id of wonder.cluster?.context_refs || []) if (!members.some((member) => member.id === id)) members.push({ id, role: 'context' });
    return members;
}

export function makeWonderLayout(wonder, { layoutVersion = `wonder-${wonder.id}-1.0.0` } = {}) {
    const members = wonderMembers(wonder);
    const spine = members.filter((member) => member.role === 'spine');
    const nodes = {};
    spine.forEach((member, index) => {
        const centered = index - (spine.length - 1) / 2;
        nodes[member.id] = { x: round(centered * WONDER_SOLVER_PARAMS.spineSpacing), y: round(Math.sin(centered * WONDER_SOLVER_PARAMS.spineWave) * WONDER_SOLVER_PARAMS.spineAmplitude), lock: 'hard', role: 'spine', step: member.step };
    });
    const context = members.filter((member) => member.role === 'context');
    if (context.length) throw new Error('Wonder context placement is not yet approved; centroid-aware WP7 algorithm required');
    const inputsFingerprint = fingerprint(members.map((member) => [member.id, member.role, member.step ?? null]));
    return {
        schemaVersion: '1.0.0', layoutVersion, rendererContractVersion: RENDERER_CONTRACT_VERSION,
        solverVersion: WONDER_SOLVER_VERSION, algorithmParamsHash: fingerprint(WONDER_SOLVER_PARAMS), toolchain: { ...TOOLCHAIN },
        layoutInputsFingerprint: inputsFingerprint, wonderId: wonder.id,
        membersFingerprint: inputsFingerprint,
        nodes: Object.fromEntries(Object.entries(nodes).sort(([a], [b]) => a.localeCompare(b))),
    };
}

function layoutWidth(layout) {
    const xs = Object.values(layout.nodes).map((node) => node.x);
    return Math.max(1, Math.max(...xs) - Math.min(...xs));
}

function percentile(values, p) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

export function diffLayouts(before, after) {
    const width = layoutWidth(before);
    const beforeIds = new Set(Object.keys(before.nodes)); const afterIds = new Set(Object.keys(after.nodes));
    const added = [...afterIds].filter((id) => !beforeIds.has(id)).sort();
    const removed = [...beforeIds].filter((id) => !afterIds.has(id)).sort();
    const moved = []; const hardAnchorViolations = [];
    for (const id of [...beforeIds].filter((value) => afterIds.has(value)).sort()) {
        const a = before.nodes[id]; const b = after.nodes[id]; const distance = Math.hypot(b.x - a.x, b.y - a.y); const normalized = distance / width;
        if (distance > 0) moved.push({ id, distance: round(distance, 4), normalized: round(normalized, 6) });
        if (a.lock === 'hard' && distance > 0) hardAnchorViolations.push(id);
    }
    const normalized = moved.map((entry) => entry.normalized);
    const existingCount = Math.max(1, beforeIds.size - removed.length);
    const withinBudget = existingCount - moved.filter((entry) => entry.normalized > 0.02).length;
    const p95Movement = round(percentile(normalized, 0.95), 6); const maxMovement = round(Math.max(0, ...normalized), 6);
    return {
        from: before.layoutVersion, to: after.layoutVersion, added, removed, moved, hardAnchorViolations,
        p95Movement, maxMovement, withinTwoPercentRatio: round(withinBudget / existingCount, 6),
        passed: hardAnchorViolations.length === 0 && withinBudget / existingCount >= 0.95 && maxMovement <= 0.05,
    };
}

export function overlapCount(rawNodes, layout) {
    const byId = new Map(rawNodes.map((node) => [node.id, node]));
    const entries = Object.entries(layout.nodes); let overlaps = 0;
    for (let i = 0; i < entries.length; i += 1) for (let j = i + 1; j < entries.length; j += 1) {
        const [aId, a] = entries[i]; const [bId, b] = entries[j];
        const minimum = radius(byId.get(aId) || {}) + radius(byId.get(bId) || {}) + 2;
        if (Math.hypot(a.x - b.x, a.y - b.y) < minimum) overlaps += 1;
    }
    return overlaps;
}

function densityP95(layout, k = 5) {
    const nodes = Object.values(layout.nodes); const density = [];
    for (let i = 0; i < nodes.length; i += 1) {
        const distances = nodes.map((other, index) => index === i ? Infinity : Math.hypot(nodes[i].x - other.x, nodes[i].y - other.y)).sort((a, b) => a - b);
        density.push(1 / Math.max(1, distances[Math.min(k - 1, distances.length - 1)]));
    }
    return percentile(density, 0.95);
}

export function layoutDebt(rawNodes, records, layout, anchorConfig, baseline = null, { localSolveFailures = 0, includeBaseline = false } = {}) {
    const topology = projectTopology(records); const width = layoutWidth(layout);
    const lengths = topology.map((edge) => {
        const a = layout.nodes[edge.source]; const b = layout.nodes[edge.target];
        return a && b ? Math.hypot(a.x - b.x, a.y - b.y) / width : 0;
    }).filter(Boolean);
    const edgeKeys = new Set(topology.map((edge) => pairKey(edge.source, edge.target)));
    const baselineKeys = new Set(baseline?.edgeKeys || [...edgeKeys]);
    const changed = new Set([...edgeKeys].filter((key) => !baselineKeys.has(key)).concat([...baselineKeys].filter((key) => !edgeKeys.has(key))));
    const edgeSetChangeRatio = changed.size / Math.max(1, baselineKeys.size);
    const currentDensity = densityP95(layout); const baselineDensity = baseline?.knnDensityP95 || currentDensity;
    const p95NormalizedEdgeLength = percentile(lengths, 0.95);
    const baselineEdgeLength = baseline?.p95NormalizedEdgeLength || p95NormalizedEdgeLength;
    const overlaps = overlapCount(rawNodes, layout);
    const domainCentroidDrifts = {};
    for (const [domain, anchor] of Object.entries(anchorConfig.anchors)) {
        const members = rawNodes.filter((node) => node.domain?.includes(domain) && layout.nodes[node.id]);
        if (!members.length) continue;
        const centroid = members.reduce((sum, node) => ({ x: sum.x + layout.nodes[node.id].x, y: sum.y + layout.nodes[node.id].y }), { x: 0, y: 0 });
        centroid.x /= members.length; centroid.y /= members.length;
        domainCentroidDrifts[domain] = round(Math.hypot(centroid.x - anchor.x, centroid.y - anchor.y) / width, 6);
    }
    const domainCentroidDrift = Math.max(0, ...Object.values(domainCentroidDrifts));
    const reasons = [];
    if (edgeSetChangeRatio >= 0.10) reasons.push('edge-set-change>=10%');
    if (baseline?.nodeCount && Math.abs(rawNodes.length - baseline.nodeCount) / baseline.nodeCount >= 0.05) reasons.push('node-set-change>=5%');
    if (baselineEdgeLength > 0 && p95NormalizedEdgeLength / baselineEdgeLength >= 1.25) reasons.push('edge-length-p95>=125%-baseline');
    if (baselineDensity > 0 && currentDensity / baselineDensity >= 1.25) reasons.push('knn-density-p95>=125%-baseline');
    if (overlaps > 0) reasons.push('overlap-count>0');
    if (baseline?.domainCentroidDrifts) {
        for (const [domain, drift] of Object.entries(domainCentroidDrifts)) {
            const blessed = baseline.domainCentroidDrifts[domain];
            if (Number.isFinite(blessed) && drift >= blessed + 0.10) reasons.push(`domain-centroid-drift:${domain}:${drift}>${round(blessed + 0.10, 6)}`);
        }
    }
    if (localSolveFailures >= 2) reasons.push('local-solve-failed-twice');
    if (!baseline) reasons.push('baseline-missing');
    const report = {
        layoutVersion: layout.layoutVersion,
        relationBaselineFingerprint: baseline?.relationFingerprint || relationFingerprint(records),
        currentRelationFingerprint: relationFingerprint(records),
        edgeSetChangeRatio: round(edgeSetChangeRatio, 6),
        p95NormalizedEdgeLength: round(p95NormalizedEdgeLength, 6),
        knnDensityP95: round(currentDensity, 9),
        knnDensityP95Ratio: round(baselineDensity ? currentDensity / baselineDensity : 1, 6),
        overlapCount: overlaps,
        domainCentroidDrift: round(domainCentroidDrift, 6),
        domainCentroidDrifts,
        baselineStatus: baseline ? 'READY' : 'NO_BASELINE',
        recommendMigration: reasons.length > 0,
        reasons,
    };
    if (includeBaseline) report.baseline = { edgeKeys: [...edgeKeys].sort(), nodeCount: rawNodes.length, p95NormalizedEdgeLength: round(p95NormalizedEdgeLength, 6), knnDensityP95: round(currentDensity, 9), domainCentroidDrifts, relationFingerprint: relationFingerprint(records), layoutInputsFingerprint: layoutInputsFingerprint(rawNodes) };
    return report;
}

export function classifyProposal(rawNodes, records, anchorConfig = null) {
    const degree = new Map(rawNodes.map((node) => [node.id, 0]));
    const hard = new Map(Object.values(anchorConfig?.anchors || {}).map((anchor) => [anchor.nodeId, anchor]));
    for (const pair of projectTopology(records)) { degree.set(pair.source, degree.get(pair.source) + 1); degree.set(pair.target, degree.get(pair.target) + 1); }
    return Object.fromEntries([...rawNodes].sort((a, b) => a.id.localeCompare(b.id)).map((node) => {
        const domains = node.domain?.length || 0; const value = degree.get(node.id) || 0; const anchor = hard.get(node.id);
        if (anchor) return [node.id, { archetype: anchor.archetype, visualMagnitudeClass: anchor.massClass === 'nucleus' ? 'landmark' : 'bright', layoutMassClass: anchor.massClass, labelPriorityClass: anchor.massClass === 'nucleus' ? 'critical' : 'high', reason: 'proposal:explicit-domain-anchor' }];
        const bridge = node.type === 'concept' && domains >= CELESTIAL_CLASSIFICATION_POLICY.bridgeMinDomains && value >= CELESTIAL_CLASSIFICATION_POLICY.bridgeMinActiveDegree;
        const archetype = node.type === 'field' ? 'subfield_giant' : node.type === 'person' ? 'beacon_star' : node.type === 'event' ? 'event_remnant' : bridge ? 'bridge_star' : 'concept_star';
        const bright = value >= CELESTIAL_CLASSIFICATION_POLICY.brightMinActiveDegree;
        return [node.id, { archetype, visualMagnitudeClass: bright ? 'bright' : 'standard', layoutMassClass: bridge ? 'bridge' : 'standard', labelPriorityClass: bright ? 'high' : 'standard', reason: `proposal:policy=${CELESTIAL_CLASSIFICATION_POLICY.version};type=${node.type};degree=${value};domains=${domains}` }];
    }));
}
