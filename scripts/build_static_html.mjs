// Build-time: emit the static "machine-readable layer" — one readable HTML page
// per concept in each language, the About/Methodology/Sources trust pages, a full
// sitemap, and a graph.json alias. These give crawlers and AI tools real text to
// read and cite without running the interactive JavaScript app.
//
// Written into frontend/public/ so the dev server serves them (e2e can hit them)
// and `vite build` copies them into dist/. Outputs are gitignored build artifacts.
//
// Hard rules honoured: pure static HTML, no executable inline <script> (only
// application/ld+json data blocks, which the CSP script-src 'self' permits since
// they are not executed); inline <style> is allowed (style-src 'unsafe-inline').
// Concept pages do NOT auto-redirect — they are the content; the interactive graph
// is a CTA link (app.html?node=<id>).
//
// Slugs are the raw node id (e.g. black_hole_concept): unique, stable, and 1:1
// with app.html?node=<id>. English content lives inline in all_nodes.json; zh/ja
// come from data/i18n/*. relation_type has FIVE values (logical/applied/
// conceptual/historical/causal); "prerequisite" is a learning_prerequisite flag.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export const ORIGIN = 'https://neblux.linku.tech';
const LANGS = ['en', 'zh', 'ja'];
const HTMLLANG = { en: 'en', zh: 'zh-Hant', ja: 'ja' };

const DOMAIN_COLORS = {
    MAT: '#5b9bd5', PHY: '#c97a5b', CHE: '#c9c05b', BIO: '#5bc97a',
    MED: '#5bc9b8', ENG: '#9b7bc9', TEC: '#c95b9b', SOC: '#c9a05a',
    HUM: '#7ba5c9', PHI: '#9bc95b', ART: '#c95b5b', HIS: '#a07850',
};
const DOMAIN_NAMES = {
    en: { MAT: 'Mathematics', PHY: 'Physics', CHE: 'Chemistry', BIO: 'Biology', MED: 'Medicine', ENG: 'Engineering', TEC: 'Technology', SOC: 'Social Science', HUM: 'Humanities', PHI: 'Philosophy', ART: 'Art', HIS: 'History' },
    zh: { MAT: '數學', PHY: '物理', CHE: '化學', BIO: '生物', MED: '醫學', ENG: '工程', TEC: '科技', SOC: '社會科學', HUM: '人文', PHI: '哲學', ART: '藝術', HIS: '歷史' },
    ja: { MAT: '数学', PHY: '物理', CHE: '化学', BIO: '生物', MED: '医学', ENG: '工学', TEC: '技術', SOC: '社会科学', HUM: '人文', PHI: '哲学', ART: '芸術', HIS: '歴史' },
};
const RELTYPE = {
    en: { logical: 'logical', applied: 'applied', conceptual: 'conceptual', historical: 'historical', causal: 'causal' },
    zh: { logical: '邏輯', applied: '應用', conceptual: '概念', historical: '歷史', causal: '因果' },
    ja: { logical: '論理', applied: '応用', conceptual: '概念', historical: '歴史', causal: '因果' },
};
const TYPES = {
    en: { concept: 'Concept', person: 'Person', field: 'Field', event: 'Event' },
    zh: { concept: '概念', person: '人物', field: '領域', event: '事件' },
    ja: { concept: '概念', person: '人物', field: '分野', event: '出来事' },
};
const UI = {
    en: { eyebrow: 'Neblux Knowledge Graph', overview: 'Overview', why: 'Why it matters', buildsOn: 'What it builds on', leadsTo: 'Where it leads', related: 'Related concepts', inWonders: 'Appears in Wonders', openGraph: 'Open this concept in the interactive graph →', typeLbl: 'Type', domainLbl: 'Domain', eraLbl: 'Era', present: 'present', bce: 'BCE', home: 'Home', wonders: 'Wonders', graph: 'Graph', about: 'About', methodology: 'Methodology', sources: 'Sources', tagline: 'An interactive science knowledge graph by Linku Tech.' },
    zh: { eyebrow: 'Neblux 知識圖譜', overview: '概觀', why: '為什麼重要', buildsOn: '建立在什麼之上', leadsTo: '通往哪裡', related: '相關概念', inWonders: '出現在這些驚奇之旅', openGraph: '在互動圖譜中打開這個概念 →', typeLbl: '類型', domainLbl: '領域', eraLbl: '年代', present: '至今', bce: '西元前', home: '首頁', wonders: '驚奇之旅', graph: '圖譜', about: '關於', methodology: '方法', sources: '來源', tagline: '由 Linku Tech 打造的互動式科普知識圖譜。' },
    ja: { eyebrow: 'Neblux 知識グラフ', overview: '概要', why: 'なぜ重要か', buildsOn: '何の上に築かれるか', leadsTo: 'どこへ導くか', related: '関連する概念', inWonders: '登場する Wonders', openGraph: 'この概念をインタラクティブグラフで開く →', typeLbl: 'タイプ', domainLbl: '分野', eraLbl: '年代', present: '現在', bce: '紀元前', home: 'ホーム', wonders: 'Wonders', graph: 'グラフ', about: 'About', methodology: '方法', sources: '出典', tagline: 'Linku Tech によるインタラクティブな科学知識グラフ。' },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── shared page shell ──────────────────────────────────────────────────────
// No executable inline script; ld+json data block + inline <style> only.
const STYLE = `
:root{--bg:#05070f;--panel:#0b1120;--ink:#c9d4ee;--muted:#8a97b8;--line:#1b2540;--accent:#9b7bc9}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);
  font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC","Noto Sans JP",system-ui,sans-serif}
a{color:#bcd0ff;text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:820px;margin:0 auto;padding:24px 20px 72px}
header.site{display:flex;gap:18px;align-items:baseline;flex-wrap:wrap;
  border-bottom:1px solid var(--line);padding:14px 20px;font-size:14px}
header.site .brand{font-weight:700;color:#f4f7ff;letter-spacing:.02em}
header.site nav a{color:var(--muted);margin-right:14px}
.eyebrow{color:var(--accent);font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px}
h1{font-size:2rem;line-height:1.2;margin:.1em 0 .3em;color:#f4f7ff}
.lead{font-size:1.15rem;color:#dce4fb;margin:.2em 0 1.2em}
.meta{display:flex;flex-wrap:wrap;gap:8px 18px;color:var(--muted);font-size:13px;margin:0 0 1.4em}
.meta b{color:var(--ink);font-weight:600}
.dchip{display:inline-block;padding:1px 9px;border:1px solid var(--line);border-radius:999px;font-size:12px}
h2{font-size:1.15rem;color:#f4f7ff;margin:1.8em 0 .5em;border-top:1px solid var(--line);padding-top:1.2em}
ul.links{list-style:none;padding:0;margin:.3em 0}
ul.links li{padding:6px 0;border-bottom:1px solid #10182e}
ul.links .rt{color:var(--muted);font-size:12px;margin-left:8px}
ul.links .rel{display:block;color:var(--muted);font-size:13px;margin-top:2px}
.cta{display:inline-block;margin:1.6em 0 0;padding:10px 16px;border:1px solid var(--accent);
  border-radius:10px;color:#eae2ff}
footer.site{border-top:1px solid var(--line);margin-top:36px;padding-top:16px;color:var(--muted);font-size:13px}
footer.site nav a{margin-right:14px}
.langnav{margin-top:10px}.langnav a{margin-right:12px}
.prose p{margin:.6em 0}.prose h2:first-of-type{border-top:none;padding-top:0}
`;

function shell({ lang, title, description, canonical, alternates, jsonld, accent, body }) {
    const alt = LANGS.map(l => `<link rel="alternate" hreflang="${HTMLLANG[l]}" href="${ORIGIN}${alternates[l]}">`).join('\n  ')
        + `\n  <link rel="alternate" hreflang="x-default" href="${ORIGIN}${alternates.en}">`;
    const u = UI[lang];
    const base = lang === 'en' ? '' : '/' + lang; // for chrome links to same-lang pages
    return `<!doctype html>
<html lang="${HTMLLANG[lang]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${ORIGIN}${canonical}">
${alt}
<meta property="og:type" content="article">
<meta property="og:site_name" content="Neblux">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${ORIGIN}${canonical}">
<meta property="og:image" content="${ORIGIN}/og-image.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>${STYLE}${accent ? `\n:root{--accent:${accent}}` : ''}</style>
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
</head>
<body>
<header class="site">
  <span class="brand"><a href="/" style="color:inherit">Neblux</a></span>
  <nav>
    <a href="/wonders.html">${esc(u.wonders)}</a>
    <a href="/app.html">${esc(u.graph)}</a>
    <a href="${base}/about.html">${esc(u.about)}</a>
  </nav>
</header>
<main class="wrap">
${body}
<footer class="site">
  <nav>
    <a href="${base}/about.html">${esc(u.about)}</a>
    <a href="${base}/methodology.html">${esc(u.methodology)}</a>
    <a href="${base}/sources.html">${esc(u.sources)}</a>
  </nav>
  <div>${esc(u.tagline)}</div>
</footer>
</main>
</body>
</html>
`;
}

// ── data loading + prereq graph (ported from frontend/src/graph.js) ─────────
function loadData(dataDir) {
    const raw = JSON.parse(readFileSync(resolve(dataDir, 'all_nodes.json'), 'utf8'));
    const nodes = Array.isArray(raw) ? raw : raw.nodes;
    const byId = {};
    for (const n of nodes) byId[n.id] = n;

    const i18n = { zh: {}, ja: {} };
    for (const lang of ['zh', 'ja']) {
        const load = (f) => { try { return JSON.parse(readFileSync(resolve(dataDir, 'i18n', f), 'utf8')); } catch { return {}; } };
        i18n[lang] = { label: load(`${lang}.json`), desc: load(`${lang}_descriptions.json`), sec: load(`${lang}_sections.json`) };
    }

    // prereq graph: parents[x] = what x builds on; children[x] = where x leads.
    const isPrereq = (c) => Boolean(c.learning_prerequisite || (c.directed && (c.relation_type === 'logical' || c.relation_type === 'causal')));
    const parents = {}, children = {}, seen = new Set();
    for (const node of nodes) {
        for (const c of (node.connections || [])) {
            if (!byId[c.target] || c.pending || !isPrereq(c)) continue;
            const from = c.target, to = node.id, k = from + '->' + to;
            if (seen.has(k)) continue; seen.add(k);
            (children[from] ||= []).push(to);
            (parents[to] ||= []).push(from);
        }
    }

    // node -> [{tour, step}] and tour titles, from the hand-authored wonders.
    const membership = {}, tourTitle = {};
    const wDir = resolve(dataDir, 'wonders');
    for (const f of readdirSync(wDir).filter(f => f.endsWith('.json'))) {
        const w = JSON.parse(readFileSync(resolve(wDir, f), 'utf8'));
        const id = w.id || f.replace(/\.json$/, '');
        tourTitle[id] = w.title || { en: id };
        (w.steps || []).forEach((s, i) => { if (s.ref) (membership[s.ref] ||= []).push({ tour: id, step: i + 1 }); });
    }
    return { nodes, byId, i18n, parents, children, membership, tourTitle };
}

// ── per-language accessors ──────────────────────────────────────────────────
const label = (D, lang, id) => (lang === 'en' ? (D.byId[id]?.label) : D.i18n[lang].label[id]) || D.byId[id]?.label || id;
function sections(D, lang, node) {
    if (lang === 'en') return node.sections || {};
    return D.i18n[lang].sec[node.id] || {};
}
function lead(D, lang, node) {
    const s = sections(D, lang, node);
    if (s.lead) return s.lead;
    if (lang === 'en') return node.description || '';
    return D.i18n[lang].desc[node.id] || node.description || '';
}

function conceptPage(D, lang, node) {
    const u = UI[lang], id = node.id;
    const accent = DOMAIN_COLORS[(node.domain || [])[0]] || '#9b7bc9';
    const path = (l) => (l === 'en' ? '' : '/' + l) + `/concepts/${id}.html`;
    const alternates = { en: path('en'), zh: path('zh'), ja: path('ja') };
    const cpath = (tid) => `/concepts/${tid}.html`.replace('/concepts', (lang === 'en' ? '' : '/' + lang) + '/concepts');

    const nm = label.bind(null, D, lang);
    const s = sections(D, lang, node);
    const dispName = nm(id);

    // meta row: type / domains / era
    const doms = (node.domain || []).map(d => `<span class="dchip" style="color:${DOMAIN_COLORS[d] || '#889'}">${esc(DOMAIN_NAMES[lang][d] || d)}</span>`).join(' ');
    let eraStr = '';
    const era = node.era;
    if (era && era.start != null) {
        const f = (v) => v < 0 ? `${Math.abs(v)} ${u.bce}` : String(v);
        eraStr = `${f(era.start)} — ${era.end != null ? f(era.end) : u.present}`;
    }

    // prereqs / unlocks / related
    const li = (tid) => `<li><a href="${cpath(tid)}">${esc(nm(tid))}</a></li>`;
    const parents = (D.parents[id] || []).filter(t => D.byId[t]);
    const children = (D.children[id] || []).filter(t => D.byId[t]);
    const pcSet = new Set([...parents, ...children]);
    const related = (node.connections || []).filter(c => D.byId[c.target] && !c.pending && !pcSet.has(c.target));

    const relLi = (c) => {
        const rt = RELTYPE[lang][c.relation_type] || c.relation_type || '';
        const sent = lang === 'en' && c.relation ? `<span class="rel">${esc(c.relation)}</span>` : '';
        return `<li><a href="${cpath(c.target)}">${esc(nm(c.target))}</a><span class="rt">${esc(rt)}</span>${sent}</li>`;
    };

    const tours = (D.membership[id] || []);
    const tourLi = (m) => {
        const tt = D.tourTitle[m.tour] || {}; const title = tt[lang] || tt.en || m.tour;
        return `<li><a href="/wonders.html?w=${encodeURIComponent(m.tour)}&s=${m.step}">${esc(title)}</a></li>`;
    };

    const secBlock = (heading, text) => text ? `<h2>${esc(heading)}</h2><p>${esc(text)}</p>` : '';
    const listBlock = (heading, items) => items.length ? `<h2>${esc(heading)}</h2><ul class="links">${items.join('')}</ul>` : '';

    const body = `<p class="eyebrow">${esc(u.eyebrow)}</p>
<h1>${esc(dispName)}</h1>
${lead(D, lang, node) ? `<p class="lead">${esc(lead(D, lang, node))}</p>` : ''}
<div class="meta">
  <span><b>${esc(u.typeLbl)}:</b> ${esc(TYPES[lang][node.type] || node.type)}</span>
  ${doms ? `<span><b>${esc(u.domainLbl)}:</b> ${doms}</span>` : ''}
  ${eraStr ? `<span><b>${esc(u.eraLbl)}:</b> ${esc(eraStr)}</span>` : ''}
</div>
${secBlock(u.overview, s.core)}
${secBlock(u.why, s.impact)}
${listBlock(u.buildsOn, parents.map(li))}
${listBlock(u.leadsTo, children.map(li))}
${listBlock(u.related, related.slice(0, 60).map(relLi))}
${listBlock(u.inWonders, tours.map(tourLi))}
<a class="cta" href="/app.html?node=${encodeURIComponent(id)}">${esc(u.openGraph)}</a>
<div class="langnav">${LANGS.map(l => `<a href="${alternates[l]}"${l === lang ? ' aria-current="true"' : ''}>${l === 'en' ? 'EN' : l === 'zh' ? '中' : '日'}</a>`).join('')}</div>`;

    const title = `${dispName} — ${u.eyebrow}`;
    const desc = (lead(D, lang, node) || dispName).slice(0, 180);
    const jsonld = {
        '@context': 'https://schema.org', '@type': 'DefinedTerm',
        name: dispName, description: desc, termCode: id,
        url: `${ORIGIN}${canonicalOf(alternates, lang)}`, inLanguage: HTMLLANG[lang],
        inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Neblux Knowledge Graph', url: `${ORIGIN}/` },
    };
    return shell({ lang, title, description: desc, canonical: canonicalOf(alternates, lang), alternates, jsonld, accent, body });
}
const canonicalOf = (alternates, lang) => alternates[lang];

// ── trust pages: About / Methodology / Sources ──────────────────────────────
import { TRUST } from './static_content.mjs';

function trustPage(D, lang, key) {
    const u = UI[lang];
    const c = TRUST[key][lang];
    const path = (l) => (l === 'en' ? '' : '/' + l) + `/${key}.html`;
    const alternates = { en: path('en'), zh: path('zh'), ja: path('ja') };
    const body = `<div class="prose">
<p class="eyebrow">${esc(u.eyebrow)}</p>
<h1>${esc(c.title)}</h1>
${c.html}
<div class="langnav">${LANGS.map(l => `<a href="${alternates[l]}"${l === lang ? ' aria-current="true"' : ''}>${l === 'en' ? 'EN' : l === 'zh' ? '中' : '日'}</a>`).join('')}</div>
</div>`;
    const jsonld = {
        '@context': 'https://schema.org', '@type': 'AboutPage',
        name: c.title, description: c.desc, url: `${ORIGIN}${alternates[lang]}`,
        inLanguage: HTMLLANG[lang], isPartOf: { '@type': 'WebSite', name: 'Neblux', url: `${ORIGIN}/` },
    };
    return shell({ lang, title: `${c.title} — Neblux`, description: c.desc, canonical: alternates[lang], alternates, jsonld, body });
}

// ── sitemap + graph.json ────────────────────────────────────────────────────
function buildSitemap(D, extraUrls = []) {
    const today = new Date().toISOString().slice(0, 10);
    const urls = [];
    const add = (loc, alts) => urls.push({ loc, alts });
    // entries (single-URL, JS-switched — no per-lang alternates)
    for (const p of ['/', '/wonders.html', '/app.html', '/explorer.html']) add(p, null);
    // tour share stubs
    for (const tid of Object.keys(D.tourTitle)) add(`/w/${tid}.html`, null);
    // trust pages (trilingual)
    for (const key of ['about', 'methodology', 'sources']) {
        const alts = { en: `/${key}.html`, zh: `/zh/${key}.html`, ja: `/ja/${key}.html` };
        for (const l of LANGS) add(alts[l], alts);
    }
    // concept pages (trilingual)
    for (const n of D.nodes) {
        const alts = { en: `/concepts/${n.id}.html`, zh: `/zh/concepts/${n.id}.html`, ja: `/ja/concepts/${n.id}.html` };
        for (const l of LANGS) add(alts[l], alts);
    }
    // published Depth pages (zh-Hant single-URL, no alternates until en exists)
    for (const u of extraUrls) add(u, null);
    const body = urls.map(({ loc, alts }) => {
        const altTags = alts ? LANGS.map(l => `<xhtml:link rel="alternate" hreflang="${HTMLLANG[l]}" href="${ORIGIN}${alts[l]}"/>`).join('') : '';
        return `<url><loc>${ORIGIN}${loc}</loc><lastmod>${today}</lastmod>${altTags}</url>`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;
}

function buildGraphJson(D) {
    return JSON.stringify({
        schema: 'neblux-knowledge-graph-v1',
        generated_at: new Date().toISOString().slice(0, 10),
        languages: ['en', 'zh-Hant', 'ja'],
        node_count: D.nodes.length,
        relation_types: ['logical', 'applied', 'conceptual', 'historical', 'causal'],
        note: 'learning_prerequisite is a boolean flag on a connection, not a relation type. Concept pages: /concepts/<id>.html (en), /zh/concepts/<id>.html, /ja/concepts/<id>.html.',
        nodes: D.nodes.map(n => ({
            id: n.id, label: n.label, type: n.type, domain: n.domain || [],
            summary: (n.sections && n.sections.lead) || n.description || '',
            url: `${ORIGIN}/concepts/${n.id}.html`,
            connections: (n.connections || []).filter(c => !c.pending).map(c => ({ target: c.target, relation_type: c.relation_type, learning_prerequisite: !!c.learning_prerequisite })),
        })),
    });
}

// ── main ────────────────────────────────────────────────────────────────────
export function buildStaticHtml(dataDir, publicDir, { extraSitemapUrls = [] } = {}) {
    const D = loadData(dataDir);
    // clean generated dirs (stale nodes) — these are gitignored artifacts
    for (const d of ['concepts', 'zh', 'ja']) rmSync(resolve(publicDir, d), { recursive: true, force: true });
    const w = (rel, content) => { const p = resolve(publicDir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); };

    let n = 0;
    for (const node of D.nodes) {
        for (const lang of LANGS) {
            const dir = lang === 'en' ? 'concepts' : `${lang}/concepts`;
            w(`${dir}/${node.id}.html`, conceptPage(D, lang, node));
        }
        n++;
    }
    for (const key of ['about', 'methodology', 'sources']) {
        for (const lang of LANGS) {
            const dir = lang === 'en' ? '' : lang + '/';
            w(`${dir}${key}.html`, trustPage(D, lang, key));
        }
    }
    w('sitemap.xml', buildSitemap(D, extraSitemapUrls));
    mkdirSync(resolve(publicDir, 'data'), { recursive: true });
    w('data/graph.json', buildGraphJson(D));
    return { concepts: n, pages: n * 3 };
}

// standalone
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build_static_html.mjs')) {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const res = buildStaticHtml(resolve(root, 'data'), resolve(root, 'frontend/public'));
    console.log(`static html: ${res.concepts} concepts × 3 langs = ${res.pages} concept pages + trust pages + sitemap + graph.json`);
}
