/* depth/sym-tooltip.js — shared formula-symbol tooltip + cross-highlight.
 *
 * 規範: SPEC_DELTA C5 (公式符號懸浮註釋). Faithful, generic extraction of the
 * s-plane / transformer inline tooltip so future pages get the behaviour for
 * free by following the markup contract — no per-page JS.
 *
 * Markup contract (inside a .formal section or a standalone .formal-details):
 *   span.sym[data-sym][data-tip][tabindex="0"]   — a formula symbol
 *   dl.symbol-gloss > dt[data-sym]               — glossary; the keyboard/AT stops
 *   p.sym-explainer                              — its initial text is the default hint
 *   div.sym-tip[role="tooltip"][hidden]          — the floating tooltip element
 *
 * Tip text per data-sym: the first element carrying data-tip wins; otherwise
 * the matching glossary <dd> text is used. So the visible glossary stays the
 * single source of truth and JS off still reads fully (progressive enhancement).
 *
 * Optional canvas coupling: set `window.__nebluxSymHook = (sym) => {…}` BEFORE
 * this module loads; it is called on every active-symbol change with the active
 * data-sym key (or null), so a page can also highlight the corresponding canvas
 * element. Pages without a hook (simple formulas) just omit it.
 *
 * CSP-safe: external same-origin script, no inline handlers. */
(function () {
    'use strict';

    const formalSection = document.querySelector('.formal, .formal-details');
    if (!formalSection) return;

    const symExplainer = formalSection.querySelector('.sym-explainer') || document.querySelector('.sym-explainer');
    const symTip = document.querySelector('.sym-tip');
    const symEls = Array.from(formalSection.querySelectorAll('[data-sym]'));
    // The glossary <dt> are the formal keyboard / assistive-tech interaction
    // legend (clean tab stops, role=button); formula spans are pointer hints.
    const glossEls = Array.from(formalSection.querySelectorAll('.symbol-gloss dt[data-sym]'));
    if (symEls.length === 0) return;

    const hook = typeof window.__nebluxSymHook === 'function' ? window.__nebluxSymHook : null;
    const DEFAULT_HINT = symExplainer ? symExplainer.textContent.trim() : '';

    // Tip text keyed by data-sym. data-tip wins; fall back to the matching <dd>.
    const TIP = {};
    symEls.forEach((el) => {
        const key = el.dataset.sym;
        if (TIP[key] === undefined && el.dataset.tip) TIP[key] = el.dataset.tip;
    });
    glossEls.forEach((dt) => {
        const key = dt.dataset.sym;
        if (TIP[key] !== undefined) return;
        if (dt.dataset.tip) { TIP[key] = dt.dataset.tip; return; }
        const dd = dt.nextElementSibling;
        if (dd && dd.tagName === 'DD') TIP[key] = dd.textContent.trim();
    });

    // Independent hover / focus / pin tracking (pointerout clears only hover,
    // focusout clears only focus — they never stomp each other).
    let hoverSym = null, hoverEl = null;
    let focusSym = null, focusEl = null;
    let pinnedSym = null, pinnedEl = null;
    const effectiveSym = () => pinnedSym || focusSym || hoverSym || null;
    const effectiveEl = () => pinnedEl || focusEl || hoverEl || null;

    // Floating tooltip: viewport-clamped, flips below if it would overflow top.
    function showTip(el, text) {
        if (!symTip || !el) return;
        symTip.textContent = text;
        symTip.hidden = false;
        const margin = 8;
        const rect = el.getBoundingClientRect();
        const tipRect = symTip.getBoundingClientRect();
        let top = rect.top - tipRect.height - margin;
        if (top < margin) top = rect.bottom + margin;
        let left = rect.left + rect.width / 2 - tipRect.width / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));
        top = Math.min(top, window.innerHeight - tipRect.height - margin);
        symTip.style.left = `${left}px`;
        symTip.style.top = `${top}px`;
    }

    function hideTip() {
        if (symTip) symTip.hidden = true;
    }

    // Active symbol changed: refresh every coupled surface (legend class,
    // explainer line, tooltip, and — if provided — the page canvas via hook).
    function refresh() {
        const sym = effectiveSym();
        const el = effectiveEl();
        // is-active on all [data-sym] (formula spans + glossary) for cross-highlight.
        symEls.forEach((node) => node.classList.toggle('is-active', node.dataset.sym === sym));
        // aria-pressed only on the real role=button elements (glossary <dt>).
        glossEls.forEach((node) => node.setAttribute('aria-pressed', String(node.dataset.sym === pinnedSym)));
        if (symExplainer) symExplainer.textContent = sym ? (TIP[sym] || '') : DEFAULT_HINT;
        if (sym && el) showTip(el, TIP[sym] || ''); else hideTip();
        if (hook) hook(sym);
    }

    const closestSym = (node) => (node && node.closest ? node.closest('[data-sym]') : null);

    function setHover(sym, el) {
        if (hoverSym === sym && hoverEl === el) return;
        hoverSym = sym; hoverEl = el; refresh();
    }
    function setFocus(sym, el) {
        if (focusSym === sym && focusEl === el) return;
        focusSym = sym; focusEl = el; refresh();
    }
    function togglePin(el) {
        const sym = el.dataset.sym;
        if (pinnedSym === sym) { pinnedSym = null; pinnedEl = null; }
        else { pinnedSym = sym; pinnedEl = el; }
        refresh();
    }
    function unpinAll() {
        if (pinnedSym === null) return;
        pinnedSym = null; pinnedEl = null; refresh();
    }

    // Only the glossary <dt> are keyboard tab stops + role=button; formula spans
    // keep pointer/focus hinting but are not additional tab stops.
    glossEls.forEach((el) => {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', TIP[el.dataset.sym] || '');
        el.setAttribute('aria-pressed', 'false');
    });

    formalSection.addEventListener('pointerover', (e) => {
        const el = closestSym(e.target);
        if (el) setHover(el.dataset.sym, el);
    });
    formalSection.addEventListener('pointerout', (e) => {
        const el = closestSym(e.target);
        if (!el) return;
        const toEl = closestSym(e.relatedTarget);
        if (toEl) setHover(toEl.dataset.sym, toEl); else setHover(null, null);
    });
    formalSection.addEventListener('focusin', (e) => {
        const el = closestSym(e.target);
        if (el) setFocus(el.dataset.sym, el);
    });
    formalSection.addEventListener('focusout', (e) => {
        const el = closestSym(e.target);
        if (!el) return;
        const toEl = closestSym(e.relatedTarget);
        if (toEl) setFocus(toEl.dataset.sym, toEl); else setFocus(null, null);
    });
    formalSection.addEventListener('click', (e) => {
        const el = closestSym(e.target);
        if (!el) return;
        e.stopPropagation();
        togglePin(el);
    });
    formalSection.addEventListener('keydown', (e) => {
        const el = closestSym(e.target);
        if (!el) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            togglePin(el);
        }
    });

    // A click that is neither a symbol nor inside the interactive surface / formal
    // section unpins — so adjusting a slider or tapping the canvas never drops a
    // pin the user wanted to keep.
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (t.closest && (t.closest('[data-sym]') || t.closest('.lab-surface') || t.closest('.formal'))) return;
        unpinAll();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') unpinAll();
    });

    refresh();
})();
