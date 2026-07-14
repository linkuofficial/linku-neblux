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
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : lang;
}

export function syncDirectory(root, index, lang) {
    const pilotLinks = root.querySelectorAll('[data-region-id]');
    pilotLinks.forEach((link) => {
        const region = allRegions(index).find((entry) => entry.id === link.dataset.regionId);
        if (!region) return;
        const fallback = region.id === 'main' ? t(lang, 'main') : WONDER_FALLBACKS[region.id] || region.id;
        const title = localizedText(region.title, lang, fallback);
        const summary = localizedText(region.summary, lang, '');
        link.href = region.route;
        const titleElement = link.querySelector('[data-region-title]');
        const summaryElement = link.querySelector('[data-region-summary]');
        if (titleElement) titleElement.textContent = title;
        if (summaryElement) summaryElement.textContent = summary;
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
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
    });
}
