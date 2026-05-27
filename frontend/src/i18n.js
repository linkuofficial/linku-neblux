/**
 * i18n.js — All internationalisation data and helpers for the Knowledge Graph.
 *
 * Imported by app-main.js.  The per-language string dictionaries live in the
 * ./i18n/ subdirectory so translators can find them quickly.
 */

import en from './i18n/en.js';
import zh from './i18n/zh.js';
import ja from './i18n/ja.js';

/** Master dictionary keyed by locale code. */
export const I18N = { en, zh, ja };

export function isValidLang(lang) {
    return typeof lang === 'string' && Object.prototype.hasOwnProperty.call(I18N, lang);
}

/** Resolve the preferred locale from localStorage / navigator. */
export function getLang() {
    const saved = localStorage.getItem('nexus-lang');
    if (saved === 'zh-TW') return 'zh';
    if (isValidLang(saved)) return saved;
    const nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('ja')) return 'ja';
    if (nav.startsWith('zh')) return 'zh';
    return 'en';
}

/** Display-tag label translations for zh / ja. */
export const TAG_LABELS = {
    zh: {
        foundational: '\u57fa\u7879',
        abstract: '\u62bd\u8c61',
        axiomatic: '\u516c\u7406\u5316',
        ancient: '\u53e4\u4ee3',
        experimental: '\u5be6\u9a57',
        natural_world: '\u81ea\u7136\u4e16\u754c',
        molecular_scale: '\u5206\u5b50\u5c3a\u5ea6',
        interdisciplinary: '\u8de8\u9818\u57df',
        field: '\u9818\u57df',
        applied: '\u61c9\u7528',
        theoretical: '\u7406\u8ad6',
        empirical: '\u5be6\u8b49',
        modern: '\u73fe\u4ee3',
        contemporary: '\u7576\u4ee3',
        historical_timescale: '\u6b77\u53f2\u5c3a\u5ea6',
        historically_significant: '\u6b77\u53f2\u91cd\u8981',
        unifying_concept: '\u7d71\u4e00\u6982\u5ff5',
        well_established: '\u6210\u719f\u7406\u8ad6',
        currently_active_research: '\u76ee\u524d\u6d3b\u8e8d\u7814\u7a76',
    },
    ja: {
        foundational: '\u57fa\u790e',
        abstract: '\u62bd\u8c61',
        axiomatic: '\u516c\u7406\u5316',
        ancient: '\u53e4\u4ee3',
        experimental: '\u5b9f\u9a13',
        natural_world: '\u81ea\u7136\u754c',
        molecular_scale: '\u5206\u5b50\u30b9\u30b1\u30fc\u30eb',
        interdisciplinary: '\u5b66\u969b\u7684',
        field: '\u5206\u91ce',
        applied: '\u5fdc\u7528',
        theoretical: '\u7406\u8ad6',
        empirical: '\u5b9f\u8a3c',
        modern: '\u8fd1\u4ee3',
        contemporary: '\u73fe\u4ee3',
        historical_timescale: '\u6b74\u53f2\u30b9\u30b1\u30fc\u30eb',
        historically_significant: '\u6b74\u53f2\u7684\u91cd\u8981',
        unifying_concept: '\u7d71\u4e00\u6982\u5ff5',
        well_established: '\u78ba\u7acb\u3055\u308c\u305f\u7406\u8ad6',
        currently_active_research: '\u73fe\u5728\u9032\u884c\u4e2d\u306e\u7814\u7a76',
    },
};

/** Token-to-Chinese mapping used by localizeTag() to build compound labels. */
export const TAG_TOKEN_ZH = {
    age: '\u6642\u4ee3', ancient: '\u53e4\u4ee3', modern: '\u73fe\u4ee3',
    contemporary: '\u7576\u4ee3', early: '\u65e9\u671f', middle: '\u4e2d\u671f',
    post: '\u5f8c', digital: '\u6578\u4f4d', industrial: '\u5de5\u696d',
    cold: '\u51b7', war: '\u6230\u722d', exploration: '\u63a2\u7d22',
    revolution: '\u9769\u547d', enlightenment: '\u555f\u8499',
    renaissance: '\u6587\u85dd\u5fa9\u8208', ancient_greek: '\u53e4\u5e0c\u81d8',
    islamic: '\u4f0a\u65af\u862d', golden: '\u9ec3\u91d1', world: '\u4e16\u754c',
    history: '\u6b77\u53f2', historical: '\u6b77\u53f2',
    historiography: '\u53f2\u5b78\u65b9\u6cd5', studies: '\u7814\u7a76',
    science: '\u79d1\u5b78', technology: '\u79d1\u6280', engineering: '\u5de5\u7a0b',
    application: '\u61c9\u7528', applied: '\u61c9\u7528', practical: '\u5be6\u52d9',
    theoretical: '\u7406\u8ad6', theory: '\u7406\u8ad6', model: '\u6a21\u578b',
    methodology: '\u65b9\u6cd5\u8ad6', framework: '\u6846\u67b6', concept: '\u6982\u5ff5',
    foundational: '\u57fa\u7879', abstract: '\u62bd\u8c61', axiomatic: '\u516c\u7406\u5316',
    empirical: '\u5be6\u8b49', experimental: '\u5be6\u9a57',
    observational: '\u89c0\u6e2c', analytical: '\u5206\u6790', analysis: '\u5206\u6790',
    quantitative: '\u91cf\u5316', qualitative: '\u8cea\u5316', logic: '\u908f\u8f2f',
    algebra: '\u4ee3\u6578', calculus: '\u5fae\u7a4d\u5206', geometry: '\u5e7e\u4f55',
    topology: '\u62d3\u64b2', probability: '\u6a5f\u7387', statistics: '\u7d71\u8a08',
    differential: '\u5fae\u5206', equations: '\u65b9\u7a0b', number: '\u6578\u8ad6',
    graph: '\u5716', set: '\u96c6\u5408', field: '\u9818\u57df',
    interdisciplinary: '\u8de8\u9818\u57df', cross: '\u8de8', domain: '\u9818\u57df',
    molecular: '\u5206\u5b50', atomic: '\u539f\u5b50', cellular: '\u7d30\u80de',
    ecological: '\u751f\u614b', planetary: '\u884c\u661f', cosmic: '\u5b87\u5b99',
    scale: '\u5c3a\u5ea6', ethics: '\u502b\u7406', policy: '\u653f\u7b56',
    society: '\u793e\u6703', social: '\u793e\u6703', culture: '\u6587\u5316',
    cultural: '\u6587\u5316', cognitive: '\u8a8d\u77e5', medical: '\u91ab\u5b78',
    biomedical: '\u751f\u91ab', chemistry: '\u5316\u5b78', physics: '\u7269\u7406',
    biology: '\u751f\u7269', linguistics: '\u8a9e\u8a00\u5b78', philosophy: '\u54f2\u5b78',
    art: '\u85dd\u8853', music: '\u97f3\u6a02', design: '\u8a2d\u8a08', law: '\u6cd5\u5f8b',
    cybersecurity: '\u8cc7\u5b89', machine: '\u6a5f\u5668', learning: '\u5b78\u7fd2',
    network: '\u7db2\u8def', systems: '\u7cfb\u7d71', system: '\u7cfb\u7d71',
    computing: '\u8a08\u7b97', computer: '\u96fb\u8166', language: '\u8a9e\u8a00',
    processing: '\u8655\u7406', public: '\u516c\u5171', health: '\u5065\u5eb7',
    significant: '\u91cd\u8981', established: '\u6210\u719f', unifying: '\u7d71\u4e00',
};
