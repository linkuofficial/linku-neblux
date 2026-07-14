import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    CELESTIAL_ARCHETYPES, DOMAIN_CODES, LABEL_PRIORITY_CLASSES, LAYOUT_MASS_CLASSES,
    REPO_ROOT, SCHEMA_CONTRACTS, VISUAL_MAGNITUDE_CLASSES, checkVersionedObject,
    exitCodeFor, issue, printIssues, readJson, repoPath, sortIssues, versionCompatibility,
} from './contract.mjs';

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function enumCheck(value, allowed, file, path, issues) {
    if (!allowed.includes(value)) issues.push(issue(file, path, `must be one of ${allowed.join(', ')}`));
}

function unknownProperties(value, allowed, file, path, issues, compatibility) {
    if (!isObject(value)) return;
    for (const key of Object.keys(value)) {
        if (!allowed.includes(key)) issues.push(issue(file, `${path}.${key}`, 'unknown property', compatibility === 'future-minor' ? 'warning' : 'error'));
    }
}

function validateLocalizedText(value, file, path, issues) {
    if (!isObject(value)) {
        issues.push(issue(file, path, 'must be an object with en, zh and ja strings'));
        return;
    }
    for (const locale of ['en', 'zh', 'ja']) {
        if (typeof value[locale] !== 'string' || !value[locale].trim()) {
            issues.push(issue(file, `${path}.${locale}`, 'must be a non-empty string'));
        }
    }
}

function validateAnchor(anchor, file, path, issues, compatibility) {
    if (!isObject(anchor)) {
        issues.push(issue(file, path, 'must be an object'));
        return;
    }
    const required = ['nodeId', 'x', 'y', 'lock', 'massClass', 'archetype'];
    unknownProperties(anchor, required, file, path, issues, compatibility);
    for (const key of required) if (!Object.hasOwn(anchor, key)) issues.push(issue(file, `${path}.${key}`, 'required property is missing'));
    if (typeof anchor.nodeId !== 'string' || !anchor.nodeId) issues.push(issue(file, `${path}.nodeId`, 'must be a non-empty string'));
    if (!Number.isFinite(anchor.x)) issues.push(issue(file, `${path}.x`, 'must be a finite number'));
    if (!Number.isFinite(anchor.y)) issues.push(issue(file, `${path}.y`, 'must be a finite number'));
    enumCheck(anchor.lock, ['hard'], file, `${path}.lock`, issues);
    enumCheck(anchor.massClass, LAYOUT_MASS_CLASSES, file, `${path}.massClass`, issues);
    enumCheck(anchor.archetype, CELESTIAL_ARCHETYPES, file, `${path}.archetype`, issues);
}

export function validateConfig(kind, value, file = `tests/atlas/fixtures/${kind}.json`, { graphIds = new Set() } = {}) {
    const issues = [];
    if (!SCHEMA_CONTRACTS[kind]) return [issue(file, '$', `unknown config kind ${kind}`, 'error', 'usage')];
    if (!isObject(value)) return [issue(file, '$', 'must be an object')];
    const compatibility = checkVersionedObject(kind, value, file, issues);
    if (kind === 'domain-anchors' && isObject(value.anchors)) {
        for (const domain of DOMAIN_CODES) {
            if (!Object.hasOwn(value.anchors, domain)) issues.push(issue(file, `$.anchors.${domain}`, 'required domain anchor is missing'));
        }
        for (const [domain, anchor] of Object.entries(value.anchors)) {
            if (!DOMAIN_CODES.includes(domain)) issues.push(issue(file, `$.anchors.${domain}`, 'unknown domain anchor; adding a domain requires a major layout migration'));
            else validateAnchor(anchor, file, `$.anchors.${domain}`, issues, compatibility);
        }
    } else if (kind === 'domain-anchors') issues.push(issue(file, '$.anchors', 'must be an object'));

    if (kind === 'celestial-lock' && isObject(value.nodes)) {
        for (const [id, node] of Object.entries(value.nodes)) {
            const path = `$.nodes.${id}`;
            if (!isObject(node)) { issues.push(issue(file, path, 'must be an object')); continue; }
            const required = ['archetype', 'visualMagnitudeClass', 'layoutMassClass', 'labelPriorityClass', 'reason'];
            unknownProperties(node, required, file, path, issues, compatibility);
            for (const key of required) if (!Object.hasOwn(node, key)) issues.push(issue(file, `${path}.${key}`, 'required property is missing'));
            enumCheck(node.archetype, CELESTIAL_ARCHETYPES, file, `${path}.archetype`, issues);
            enumCheck(node.visualMagnitudeClass, VISUAL_MAGNITUDE_CLASSES, file, `${path}.visualMagnitudeClass`, issues);
            enumCheck(node.layoutMassClass, LAYOUT_MASS_CLASSES, file, `${path}.layoutMassClass`, issues);
            enumCheck(node.labelPriorityClass, LABEL_PRIORITY_CLASSES, file, `${path}.labelPriorityClass`, issues);
            if (typeof node.reason !== 'string' || !node.reason.trim()) issues.push(issue(file, `${path}.reason`, 'must be a non-empty string'));
        }
    } else if (kind === 'celestial-lock') issues.push(issue(file, '$.nodes', 'must be an object'));

    if (kind === 'layout' && isObject(value.nodes)) {
        const main = typeof value.nodeSetFingerprint === 'string' && typeof value.anchorConfigFingerprint === 'string';
        const wonder = typeof value.wonderId === 'string' && typeof value.membersFingerprint === 'string';
        if (main === wonder) issues.push(issue(file, '$', 'must be exactly one of main or Wonder layout envelope'));
        if (value.rendererContractVersion !== '2.0.0') issues.push(issue(file, '$.rendererContractVersion', 'must equal 2.0.0'));
        if (typeof value.solverVersion !== 'string' || !value.solverVersion) issues.push(issue(file, '$.solverVersion', 'must be a non-empty string'));
        for (const key of ['algorithmParamsHash', 'layoutInputsFingerprint']) if (typeof value[key] !== 'string' || !value[key].startsWith('sha256:')) issues.push(issue(file, `$.${key}`, 'must be a sha256 fingerprint'));
        if (!isObject(value.toolchain)) issues.push(issue(file, '$.toolchain', 'must be an object'));
        else {
            unknownProperties(value.toolchain, ['nodeMajor', 'd3Version'], file, '$.toolchain', issues, compatibility);
            if (!Number.isInteger(value.toolchain.nodeMajor) || value.toolchain.nodeMajor < 22) issues.push(issue(file, '$.toolchain.nodeMajor', 'must be an integer >=22'));
            if (typeof value.toolchain.d3Version !== 'string') issues.push(issue(file, '$.toolchain.d3Version', 'must be a string'));
        }
        for (const [id, node] of Object.entries(value.nodes)) {
            const path = `$.nodes.${id}`;
            if (!isObject(node)) { issues.push(issue(file, path, 'must be an object')); continue; }
            const allowed = ['x', 'y', 'lock', 'radius', 'role', 'step'];
            unknownProperties(node, allowed, file, path, issues, compatibility);
            for (const key of ['x', 'y', 'lock']) if (!Object.hasOwn(node, key)) issues.push(issue(file, `${path}.${key}`, 'required property is missing'));
            if (!Number.isFinite(node.x)) issues.push(issue(file, `${path}.x`, 'must be a finite number'));
            if (!Number.isFinite(node.y)) issues.push(issue(file, `${path}.y`, 'must be a finite number'));
            enumCheck(node.lock, ['hard', 'soft', 'new'], file, `${path}.lock`, issues);
            if (node.role !== undefined) enumCheck(node.role, ['spine', 'context', 'local'], file, `${path}.role`, issues);
        }
    } else if (kind === 'layout') issues.push(issue(file, '$.nodes', 'must be an object'));

    if (kind === 'atlas-layout') {
        const coordinate = value.coordinateSystem;
        if (!isObject(coordinate)) issues.push(issue(file, '$.coordinateSystem', 'must be an object'));
        else {
            unknownProperties(coordinate, ['width', 'height', 'origin'], file, '$.coordinateSystem', issues, compatibility);
            if (!Number.isFinite(coordinate.width) || coordinate.width <= 0) issues.push(issue(file, '$.coordinateSystem.width', 'must be a positive finite number'));
            if (!Number.isFinite(coordinate.height) || coordinate.height <= 0) issues.push(issue(file, '$.coordinateSystem.height', 'must be a positive finite number'));
            enumCheck(coordinate.origin, ['center'], file, '$.coordinateSystem.origin', issues);
        }
        const validateRegion = (region, path, wonder = false) => {
            const allowed = ['x', 'y', 'visualRadius', 'hitRadius', 'route', ...(wonder ? ['dominantDomains', 'visualScale'] : ['title', 'summary'])];
            const required = ['x', 'y', 'visualRadius', 'hitRadius', 'route', ...(wonder ? ['dominantDomains', 'visualScale'] : ['title', 'summary'])];
            if (!isObject(region)) { issues.push(issue(file, path, 'must be an object')); return; }
            unknownProperties(region, allowed, file, path, issues, compatibility);
            for (const key of required) if (!Object.hasOwn(region, key)) issues.push(issue(file, `${path}.${key}`, 'required property is missing'));
            if (!Number.isFinite(region.x)) issues.push(issue(file, `${path}.x`, 'must be a finite number'));
            if (!Number.isFinite(region.y)) issues.push(issue(file, `${path}.y`, 'must be a finite number'));
            if (!Number.isFinite(region.visualRadius) || region.visualRadius <= 0) issues.push(issue(file, `${path}.visualRadius`, 'must be a positive finite number'));
            if (!Number.isFinite(region.hitRadius) || region.hitRadius <= region.visualRadius) issues.push(issue(file, `${path}.hitRadius`, 'must be greater than visualRadius'));
            if (typeof region.route !== 'string' || !region.route.startsWith('/')) issues.push(issue(file, `${path}.route`, 'must be a root-relative route'));
            if (!wonder) {
                if (region.title !== undefined) validateLocalizedText(region.title, file, `${path}.title`, issues);
                if (region.summary !== undefined) validateLocalizedText(region.summary, file, `${path}.summary`, issues);
            }
            if (wonder) {
                if (!Array.isArray(region.dominantDomains) || region.dominantDomains.length === 0) issues.push(issue(file, `${path}.dominantDomains`, 'must be a non-empty array'));
                else region.dominantDomains.forEach((domain, index) => enumCheck(domain, DOMAIN_CODES, file, `${path}.dominantDomains[${index}]`, issues));
                enumCheck(region.visualScale, ['small', 'medium', 'large'], file, `${path}.visualScale`, issues);
            }
        };
        validateRegion(value.mainGalaxy, '$.mainGalaxy');
        if (!isObject(value.wonders)) issues.push(issue(file, '$.wonders', 'must be an object'));
        else for (const [id, region] of Object.entries(value.wonders)) validateRegion(region, `$.wonders.${id}`, true);
        if (!Array.isArray(value.roads)) issues.push(issue(file, '$.roads', 'must be an array'));
        else {
            const configuredWonderIds = new Set(Object.keys(isObject(value.wonders) ? value.wonders : {}));
            const roadIds = new Set();
            value.roads.forEach((road, index) => {
                const path = `$.roads[${index}]`;
                const allowed = ['id', 'from', 'to', 'via', 'strengthClass', 'approved'];
                if (!isObject(road)) { issues.push(issue(file, path, 'must be an object')); return; }
                unknownProperties(road, allowed, file, path, issues, compatibility);
                for (const key of allowed) if (!Object.hasOwn(road, key)) issues.push(issue(file, `${path}.${key}`, 'required property is missing'));
                for (const key of ['id', 'from', 'to', 'via']) if (typeof road[key] !== 'string' || !road[key]) issues.push(issue(file, `${path}.${key}`, 'must be a non-empty string'));
                for (const key of ['from', 'to']) {
                    if (typeof road[key] === 'string' && !(/^(main|wonder:[a-z0-9]+(?:-[a-z0-9]+)*)$/).test(road[key])) {
                        issues.push(issue(file, `${path}.${key}`, 'must be main or a wonder:<id> reference'));
                    } else if (typeof road[key] === 'string' && road[key].startsWith('wonder:')) {
                        const wonderId = road[key].slice('wonder:'.length);
                        if (!configuredWonderIds.has(wonderId)) issues.push(issue(file, `${path}.${key}`, `must reference a configured Wonder region; ${wonderId} is not published`));
                    }
                }
                if (typeof road.id === 'string' && road.id) {
                    if (roadIds.has(road.id)) issues.push(issue(file, `${path}.id`, `duplicate road id ${road.id}`));
                    roadIds.add(road.id);
                }
                if (road.from && road.from === road.to) issues.push(issue(file, path, 'road endpoints must be different'));
                enumCheck(road.strengthClass, ['weak', 'standard', 'strong'], file, `${path}.strengthClass`, issues);
                if (typeof road.approved !== 'boolean') issues.push(issue(file, `${path}.approved`, 'must be boolean'));
                if (graphIds.size && typeof road.via === 'string' && road.via && !graphIds.has(road.via)) issues.push(issue(file, `${path}.via`, `canonical node ${road.via} does not exist`));
            });
        }
    }
    return sortIssues(issues);
}

function schemaEnums(kind, schema) {
    if (kind === 'domain-anchors') return {
        '/anchors/*/lock': schema.$defs?.anchor?.properties?.lock?.enum,
        '/anchors/*/massClass': schema.$defs?.anchor?.properties?.massClass?.enum,
        '/anchors/*/archetype': schema.$defs?.anchor?.properties?.archetype?.enum,
    };
    if (kind === 'celestial-lock') {
        const properties = schema.properties?.nodes?.additionalProperties?.properties;
        return {
            '/nodes/*/archetype': properties?.archetype?.enum,
            '/nodes/*/visualMagnitudeClass': properties?.visualMagnitudeClass?.enum,
            '/nodes/*/layoutMassClass': properties?.layoutMassClass?.enum,
            '/nodes/*/labelPriorityClass': properties?.labelPriorityClass?.enum,
        };
    }
    if (kind === 'layout') {
        const properties = schema.properties?.nodes?.additionalProperties?.properties;
        return { '/nodes/*/lock': properties?.lock?.enum, '/nodes/*/role': properties?.role?.enum };
    }
    return {};
}

export function validateSchemaContract(kind, schema, file) {
    const issues = [];
    const contract = SCHEMA_CONTRACTS[kind];
    if (schema?.$schema !== 'https://json-schema.org/draft/2020-12/schema') issues.push(issue(file, '$.$schema', 'must use JSON Schema draft 2020-12'));
    if (typeof schema?.$id !== 'string' || !schema.$id) issues.push(issue(file, '$.$id', 'must be a non-empty string'));
    if (schema?.additionalProperties !== false) issues.push(issue(file, '$.additionalProperties', 'must be false for the known schema version'));
    if (JSON.stringify(schema?.required) !== JSON.stringify(contract.required)) issues.push(issue(file, '$.required', 'does not match contract.mjs required list'));
    if (JSON.stringify(Object.keys(schema?.properties || {})) !== JSON.stringify(contract.allowed)) issues.push(issue(file, '$.properties', 'property list does not match contract.mjs allowed list'));
    if (schema?.properties?.schemaVersion?.const !== contract.version) issues.push(issue(file, '$.properties.schemaVersion.const', `must equal ${contract.version}`));
    const enums = schemaEnums(kind, schema);
    for (const [path, expected] of Object.entries(contract.enums)) {
        if (JSON.stringify(enums[path]) !== JSON.stringify(expected)) issues.push(issue(file, `$schema${path}`, 'enum does not match contract.mjs'));
    }
    return sortIssues(issues);
}

export function validateAllSchemas() {
    const issues = [];
    for (const kind of Object.keys(SCHEMA_CONTRACTS)) {
        const file = resolve(REPO_ROOT, 'config', 'atlas', `${kind}.schema.json`);
        const read = readJson(file);
        issues.push(...read.issues);
        if (read.value) issues.push(...validateSchemaContract(kind, read.value, file));
    }
    return sortIssues(issues);
}

async function main() {
    const kindIndex = process.argv.indexOf('--kind');
    const fileIndex = process.argv.indexOf('--file');
    if (kindIndex < 0 || fileIndex < 0 || !process.argv[kindIndex + 1] || !process.argv[fileIndex + 1]) {
        printIssues([issue('scripts/atlas/validate-config.mjs', '$', 'usage: --kind <kind> --file tests/atlas/fixtures/<file>', 'error', 'usage')]);
        process.exitCode = 2;
        return;
    }
    const kind = process.argv[kindIndex + 1];
    const file = resolve(REPO_ROOT, process.argv[fileIndex + 1]);
    if (!repoPath(file).startsWith('tests/atlas/fixtures/')) {
        printIssues([issue(file, '$', 'WP1 config validation CLI only accepts tests/atlas/fixtures', 'error', 'usage')]);
        process.exitCode = 2;
        return;
    }
    const read = readJson(file);
    const issues = [...read.issues];
    if (read.value) issues.push(...validateConfig(kind, read.value, file));
    printIssues(issues);
    process.exitCode = exitCodeFor(issues);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
