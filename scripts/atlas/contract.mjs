import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const RELATION_TYPES = Object.freeze(['applied', 'logical', 'conceptual', 'historical', 'causal']);
export const NODE_TYPES = Object.freeze(['field', 'concept', 'person', 'event']);
export const DOMAIN_CODES = Object.freeze(['ART', 'BIO', 'CHE', 'ENG', 'HIS', 'HUM', 'MAT', 'MED', 'PHI', 'PHY', 'SOC', 'TEC']);
export const CONNECTION_BOOLEAN_FIELDS = Object.freeze(['directed', 'learning_prerequisite', 'parallel_development', 'pending']);
export const CELESTIAL_ARCHETYPES = Object.freeze([
    'galactic_nucleus', 'domain_core', 'subfield_giant', 'concept_star',
    'bridge_star', 'beacon_star', 'event_remnant', 'local_protostar',
]);
export const VISUAL_MAGNITUDE_CLASSES = Object.freeze(['faint', 'standard', 'bright', 'landmark']);
export const LAYOUT_MASS_CLASSES = Object.freeze(['light', 'standard', 'heavy', 'bridge', 'nucleus']);
export const LABEL_PRIORITY_CLASSES = Object.freeze(['low', 'standard', 'high', 'critical']);

export const SCHEMA_CONTRACTS = Object.freeze({
    'atlas-layout': {
        version: '1.0.0',
        required: ['schemaVersion', 'layoutVersion', 'coordinateSystem', 'mainGalaxy', 'wonders', 'roads'],
        allowed: ['schemaVersion', 'layoutVersion', 'coordinateSystem', 'mainGalaxy', 'wonders', 'roads'],
        enums: {},
    },
    'domain-anchors': {
        version: '1.0.0',
        required: ['schemaVersion', 'layoutVersion', 'anchors'],
        allowed: ['schemaVersion', 'layoutVersion', 'anchors'],
        enums: { '/anchors/*/lock': ['hard'], '/anchors/*/massClass': [...LAYOUT_MASS_CLASSES], '/anchors/*/archetype': [...CELESTIAL_ARCHETYPES] },
    },
    'celestial-lock': {
        version: '1.0.0',
        required: ['schemaVersion', 'classificationVersion', 'adapterVersion', 'nodes'],
        allowed: ['schemaVersion', 'classificationVersion', 'adapterVersion', 'nodes'],
        enums: {
            '/nodes/*/archetype': [...CELESTIAL_ARCHETYPES],
            '/nodes/*/visualMagnitudeClass': [...VISUAL_MAGNITUDE_CLASSES],
            '/nodes/*/layoutMassClass': [...LAYOUT_MASS_CLASSES],
            '/nodes/*/labelPriorityClass': [...LABEL_PRIORITY_CLASSES],
        },
    },
    layout: {
        version: '1.0.0',
        required: ['schemaVersion', 'layoutVersion', 'rendererContractVersion', 'solverVersion', 'algorithmParamsHash', 'toolchain', 'layoutInputsFingerprint', 'nodes'],
        allowed: ['schemaVersion', 'layoutVersion', 'rendererContractVersion', 'solverVersion', 'algorithmParamsHash', 'toolchain', 'layoutInputsFingerprint', 'layoutInputSnapshot', 'nodeSetFingerprint', 'anchorConfigFingerprint', 'wonderId', 'membersFingerprint', 'nodes'],
        enums: { '/nodes/*/lock': ['hard', 'soft', 'new'], '/nodes/*/role': ['spine', 'context', 'local'] },
    },
});

export const SOURCE_INPUTS = Object.freeze({
    graph: 'data/all_nodes.json',
    wonderDirectory: 'data/wonders',
    depthManifest: 'neblux-depth/depth_manifest.json',
});

export function parseVersion(value) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value || '');
    return match ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) } : null;
}

export function versionCompatibility(actual, supported) {
    const a = parseVersion(actual);
    const s = parseVersion(supported);
    if (!a || !s) return 'invalid';
    if (a.major !== s.major) return 'major';
    if (a.minor > s.minor) return 'future-minor';
    return 'known';
}

export function repoPath(path) {
    const absolute = resolve(path);
    const rel = relative(REPO_ROOT, absolute).split(sep).join('/');
    return rel && !rel.startsWith('../') ? rel : absolute.split(sep).join('/').replace(/^[A-Za-z]:/, '');
}

export function issue(file, path, message, severity = 'error', kind = 'validation') {
    return { file: repoPath(file), path, message, severity, kind };
}

function naturalParts(value) {
    return String(value).split(/(\d+)/).map((part) => /^\d+$/.test(part) ? Number(part) : part);
}

function naturalCompare(a, b) {
    const ap = naturalParts(a);
    const bp = naturalParts(b);
    for (let i = 0; i < Math.max(ap.length, bp.length); i += 1) {
        if (ap[i] === undefined) return -1;
        if (bp[i] === undefined) return 1;
        if (ap[i] === bp[i]) continue;
        if (typeof ap[i] === typeof bp[i]) return ap[i] < bp[i] ? -1 : 1;
        return String(ap[i]).localeCompare(String(bp[i]), 'en');
    }
    return 0;
}

export function sortIssues(issues) {
    return [...issues].sort((a, b) =>
        naturalCompare(a.file, b.file)
        || naturalCompare(a.path, b.path)
        || naturalCompare(a.message, b.message));
}

export function formatIssue(value) {
    const prefix = value.severity === 'warning' ? 'warning: ' : '';
    return `${prefix}${value.file}:${value.path}: ${value.message}`;
}

function lineColumn(source, position) {
    const before = source.slice(0, Math.max(0, position));
    const lines = before.split('\n');
    return { line: lines.length, column: lines.at(-1).length + 1 };
}

export function readJson(path) {
    let source;
    try {
        source = readFileSync(path, 'utf8');
    } catch (error) {
        return { value: null, issues: [issue(path, '$', `I/O error: ${error.message}`, 'error', 'io')] };
    }
    if (source.charCodeAt(0) === 0xFEFF) source = source.slice(1);
    try {
        return { value: JSON.parse(source), issues: [] };
    } catch (error) {
        const match = /position\s+(\d+)/i.exec(error.message);
        const at = lineColumn(source, match ? Number(match[1]) : 0);
        return { value: null, issues: [issue(path, '$', `parse error at line ${at.line} col ${at.column}`, 'error', 'parse')] };
    }
}

export function normalizeConnection(source, connection) {
    return {
        source,
        target: connection.target,
        relation_type: connection.relation_type,
        relation: connection.relation.trim(),
        directed: connection.directed ?? false,
        learning_prerequisite: connection.learning_prerequisite ?? false,
        parallel_development: connection.parallel_development ?? false,
        pending: connection.pending ?? false,
    };
}

export function connectionKey(record) {
    return JSON.stringify([
        record.source, record.target, record.relation_type, record.relation,
        record.directed, record.learning_prerequisite, record.parallel_development, record.pending,
    ]);
}

export function pairKey(a, b) {
    return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

export function projectTopology(records) {
    const pairs = new Map();
    for (const record of records) {
        const key = pairKey(record.source, record.target);
        const current = pairs.get(key) || {
            source: record.source < record.target ? record.source : record.target,
            target: record.source < record.target ? record.target : record.source,
            active: false,
            semanticRecordCount: 0,
        };
        current.semanticRecordCount += 1;
        if (!record.pending) current.active = true;
        pairs.set(key, current);
    }
    return [...pairs.values()]
        .filter((pair) => pair.active)
        .sort((a, b) => naturalCompare(`${a.source}\u0000${a.target}`, `${b.source}\u0000${b.target}`));
}

export function checkVersionedObject(kind, value, file, issues) {
    const contract = SCHEMA_CONTRACTS[kind];
    const compatibility = versionCompatibility(value?.schemaVersion, contract.version);
    if (compatibility === 'invalid') {
        issues.push(issue(file, '$.schemaVersion', 'must be semantic version X.Y.Z'));
        return compatibility;
    }
    if (compatibility === 'major') {
        issues.push(issue(file, '$.schemaVersion', `unsupported major version; supported ${contract.version}`));
        return compatibility;
    }
    const unknown = value && typeof value === 'object' && !Array.isArray(value)
        ? Object.keys(value).filter((key) => !contract.allowed.includes(key)) : [];
    for (const key of unknown) {
        issues.push(issue(file, `$.${key}`, 'unknown property', compatibility === 'future-minor' ? 'warning' : 'error'));
    }
    for (const key of contract.required) {
        if (!Object.hasOwn(value || {}, key)) issues.push(issue(file, `$.${key}`, 'required property is missing'));
    }
    return compatibility;
}

export function exitCodeFor(issues) {
    if (issues.some((value) => ['io', 'parse', 'usage'].includes(value.kind))) return 2;
    if (issues.some((value) => value.severity === 'error')) return 1;
    return 0;
}

export function printIssues(issues) {
    for (const value of sortIssues(issues)) process.stderr.write(`${formatIssue(value)}\n`);
}
