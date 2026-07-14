import { test, expect } from "@playwright/test";

// The static machine-readable layer (concept pages ×3 langs, trust pages,
// sitemap, graph.json) is generated into frontend/public at buildStart, so the
// dev server this suite runs against serves it. These tests guard the promises
// that make it useful to crawlers and AI: readable with NO JavaScript, correct
// structured data, and zero executable inline script (CSP script-src 'self').

const CONCEPT = "black_hole_concept";

test.describe("concept pages are readable without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("english concept page renders content, links and a graph CTA", async ({ page }) => {
        await page.goto(`/concepts/${CONCEPT}.html`);
        await expect(page.locator("h1")).toHaveText("Black Hole");
        await expect(page.locator(".lead")).not.toBeEmpty();
        // links out to at least one other concept page (crawlable internal graph)
        expect(await page.locator('a[href*="/concepts/"]').count()).toBeGreaterThan(0);
        // the interactive graph is a CTA link, NOT an auto-redirect
        await expect(page.locator(`a.cta[href="/app.html?node=${CONCEPT}"]`)).toBeVisible();
    });

    test("zh and ja concept pages render localized titles", async ({ page }) => {
        await page.goto(`/zh/concepts/${CONCEPT}.html`);
        await expect(page.locator("h1")).toHaveText("黑洞");
        await page.goto(`/ja/concepts/${CONCEPT}.html`);
        await expect(page.locator("h1")).toHaveText("ブラックホール");
    });

    test("an entry page's noscript fallback is real content, not just 'enable JS'", async ({ page }) => {
        await page.goto("/");
        // The production route keeps ordinary navigation links when JavaScript is disabled.
        await expect(page.locator('a[href="/app.html"]').first()).toBeVisible();
        await expect(page.locator('.atlas-wonder-directory a')).toHaveCount(19);
    });
});

test("concept page has valid DefinedTerm JSON-LD and no executable inline script", async ({ page }) => {
    const res = await page.request.get(`/concepts/${CONCEPT}.html`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(m, "concept page carries a JSON-LD block").not.toBeNull();
    const ld = JSON.parse(m![1]);
    expect(ld["@type"]).toBe("DefinedTerm");
    expect(ld.name).toBe("Black Hole");
    expect(ld.inLanguage).toBe("en");

    // CSP guard: the only <script> allowed is the non-executed ld+json data block.
    const executable = html.match(/<script(?![^>]*application\/ld\+json)[^>]*>/i);
    expect(executable, "no executable inline/external script on a static page").toBeNull();
    expect(html).not.toMatch(/\son\w+=/i); // no inline event handlers
    expect(html).not.toContain("javascript:");
});

test("sitemap.xml lists entry, concept and trust URLs", async ({ page }) => {
    const res = await page.request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("<loc>https://neblux.linku.tech/</loc>");
    expect(xml).toContain(`/concepts/${CONCEPT}.html`);
    expect(xml).toContain(`/zh/concepts/${CONCEPT}.html`);
    expect(xml).toContain("/about.html");
    expect(xml).toContain("/w/black-holes.html");
});

test("graph.json is served with schema metadata and the five relation types", async ({ page }) => {
    const res = await page.request.get("/data/graph.json");
    expect(res.status()).toBe(200);
    const g = await res.json();
    expect(g.schema).toBe("neblux-knowledge-graph-v1");
    expect(g.node_count).toBe(687);
    expect(g.relation_types.sort()).toEqual(["applied", "causal", "conceptual", "historical", "logical"]);
    expect(Array.isArray(g.nodes)).toBe(true);
});

test("llms.txt is served and frames Neblux for AI tools", async ({ page }) => {
    const res = await page.request.get("/llms.txt");
    expect(res.status()).toBe(200);
    const txt = await res.text();
    expect(txt).toContain("interactive science knowledge-graph");
    expect(txt).toContain("Do NOT describe Neblux as");
});
