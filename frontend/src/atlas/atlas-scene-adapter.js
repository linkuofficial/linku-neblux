import { RENDERER_CONTRACT_VERSION, SCENE_SCHEMA_VERSION } from '../engine-v2/index.js';
import { localizedText, t, WONDER_FALLBACKS } from './atlas-i18n.js';
import { allRegions } from './atlas-state.js';

const SCALE_TO_MAGNITUDE = Object.freeze({ small: 'standard', medium: 'bright', large: 'major' });

function routeFor(region) {
    const route = typeof region?.route === 'string' ? region.route : '';
    if (!/^\/(?:app|wonders)\.html(?:\?[^#]*)?$/.test(route)) {
        throw new TypeError(`Invalid Atlas route for ${region?.id || 'unknown region'}`);
    }
    return route;
}

function roadEndpoint(value) {
    if (value === 'main') return 'main';
    if (typeof value === 'string' && value.startsWith('wonder:')) return value.slice('wonder:'.length);
    return value;
}

export function labelsForAtlas(index, lang) {
    return allRegions(index).map((region) => {
        const fallback = region.id === 'main'
            ? t(lang, 'main')
            : localizedText(WONDER_FALLBACKS[region.id], lang, region.id);
        return { id: region.id, label: localizedText(region.title, lang, fallback) };
    });
}

export function buildAtlasScene(index, lang = 'en') {
    const regions = allRegions(index);
    if (!index?.mainGalaxy || index.mainGalaxy.id !== 'main' || regions.length < 2) {
        throw new TypeError('Atlas index must include Main Galaxy and at least one Wonder');
    }

    const labels = new Map(labelsForAtlas(index, lang).map((entry) => [entry.id, entry.label]));
    const routes = new Map();
    const nodes = regions.map((region) => {
        if (!region?.id || !Number.isFinite(region.x) || !Number.isFinite(region.y)) {
            throw new TypeError('Atlas regions require stable id/x/y values');
        }
        routes.set(region.id, routeFor(region));
        const main = region.id === 'main';
        return {
            id: region.id,
            x: region.x,
            y: region.y,
            label: labels.get(region.id) || region.id,
            domains: main ? [] : [...(region.domains || [])],
            archetype: main ? 'galactic_nucleus' : 'subfield_giant',
            visualMagnitude: main ? 'nucleus' : (SCALE_TO_MAGNITUDE[region.scale] || 'bright'),
            labelPriority: main ? 'critical' : 'high',
            overlays: [],
        };
    });

    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = (index.roads || []).map((road, position) => {
        const source = roadEndpoint(road.from);
        const target = roadEndpoint(road.to);
        if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) {
            throw new TypeError(`Atlas road ${road.id || position} has an invalid endpoint`);
        }
        return {
            id: `atlas-road:${road.id || position}`,
            source,
            target,
            priority: road.strength === 'strong' ? 10 : 1,
            lodClass: road.strength === 'strong' ? 'bridge' : 'standard',
            directed: false,
            styleToken: 'guided',
            overlays: [],
        };
    });

    return {
        scene: {
            schemaVersion: SCENE_SCHEMA_VERSION,
            layoutVersion: `atlas-runtime:${index.layoutVersion || 'fallback'}`,
            rendererContractVersion: RENDERER_CONTRACT_VERSION,
            nodes,
            edges,
        },
        routes,
    };
}

export { SCALE_TO_MAGNITUDE };
