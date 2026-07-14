import { localizedText, t, WONDER_FALLBACKS } from './atlas-i18n.js';
import { allRegions } from './atlas-state.js';

export function syncStaticCopy(root, lang) {
    root.querySelectorAll('[data-atlas-copy]').forEach((element) => {
        element.textContent = t(lang, element.dataset.atlasCopy);
    });
    root.querySelectorAll('[data-atlas-lang]').forEach((button) => {
        const active = button.dataset.atlasLang === lang;
        button.setAttribute('aria-pressed', String(active));
    });
    root.querySelectorAll('[data-atlas-aria]').forEach((element) => {
        element.setAttribute('aria-label', t(lang, element.dataset.atlasAria));
    });
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : lang;
}

export function syncDirectory(root, index, lang) {
    const pilotLinks = root.querySelectorAll('[data-region-id]');
    pilotLinks.forEach((link) => {
        const region = allRegions(index).find((entry) => entry.id === link.dataset.regionId);
        if (!region) return;
        const fallback = region.id === 'main' ? t(lang, 'main') : localizedText(WONDER_FALLBACKS[region.id], lang, region.id);
        const title = localizedText(region.title, lang, fallback);
        const summary = localizedText(region.summary, lang, '');
        link.href = region.route;
        const titleElement = link.querySelector('[data-region-title]');
        const summaryElement = link.querySelector('[data-region-summary]');
        if (titleElement) titleElement.textContent = title;
        if (summaryElement) summaryElement.textContent = summary;
        link.setAttribute('aria-label', `${title} — ${t(lang, 'open')}`);
    });
    root.querySelectorAll('[data-wonder-id]').forEach((link) => {
        const title = localizedText(WONDER_FALLBACKS[link.dataset.wonderId], lang, link.dataset.wonderId);
        link.textContent = title;
        link.setAttribute('aria-label', `${title} — ${t(lang, 'open')}`);
    });
}

export function setAtlasStatus(root, message) {
    const element = root.querySelector('#atlas-status');
    if (element) element.textContent = message;
}

export function setActiveRegion(root, regionId) {
    root.querySelectorAll('[data-region-id]').forEach((link) => {
        const active = link.dataset.regionId === regionId;
        link.classList.toggle('is-active', active);
    });
}
