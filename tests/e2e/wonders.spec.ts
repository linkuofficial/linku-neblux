import { test, expect } from "@playwright/test";

// Wait for a tour's canvas engine + subgraph to come up (tour mode only — the
// picker has no graph and no hook).
const ready = (page: import("@playwright/test").Page) =>
    expect
        .poll(async () => page.evaluate(() => !!(window as any).__nebluxWonders?.ready()), { timeout: 15000 })
        .toBeTruthy();

test("picker lists the available tours and previews their length", async ({ page }) => {
    await page.goto("/wonders.html"); // no ?w → picker
    const cards = page.locator(".wpk-card");
    await expect(cards).toHaveCount(19);
    // each card previews the journey length (eyebrow "· N steps" + N dots)
    await expect(cards.first().locator(".wpk-card-eyebrow")).toContainText(/\d+/);
    // the first tour (black-holes) is a 7-step journey → a full row of dots
    await expect(cards.first().locator(".wpk-card-dot")).toHaveCount(7);
});

test("a deep-link loads the tour subgraph with a clean console + intro gate", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

    await page.goto("/wonders.html?w=edge-ai");
    await ready(page);

    const count = await page.evaluate(() => (window as any).__nebluxWonders.stepCount());
    expect(count).toBe(7);
    // a direct deep-link visitor never saw the picker card → show the intro gate
    await expect(page.locator("#wonder-intro")).toBeVisible();
    expect(errors, `runtime errors during tour load:\n${errors.join("\n")}`).toHaveLength(0);
});

test("a step-level deep link opens that step directly, skipping the intro", async ({ page }) => {
    await page.goto("/wonders.html?w=light&s=4");
    await ready(page);

    // ?s=4 skips the intro gate and opens on step 4 of 7
    await expect(page.locator("#wonder-panel")).toBeVisible();
    await expect(page.locator("#wonder-intro")).toBeHidden();
    await expect(page.locator("#wp-count")).toContainText("4 / 7");

    // stepping keeps the URL in sync (1-based)
    await page.locator("#wp-next").click();
    await expect(page.locator("#wp-count")).toContainText("5 / 7");
    await expect(page).toHaveURL(/\?w=light&s=5/);
});

test("an out-of-range ?s is ignored and falls back to the intro gate", async ({ page }) => {
    await page.goto("/wonders.html?w=light&s=99");
    await ready(page);
    // invalid step → treat as a plain deep-link: show the intro for context
    await expect(page.locator("#wonder-intro")).toBeVisible();
    await expect(page.locator("#wonder-panel")).toBeHidden();
});

test("the intro gate starts the tour and steps advance", async ({ page }) => {
    await page.goto("/wonders.html?w=edge-ai");
    await ready(page);

    await page.locator("#wi-start").click();
    await expect(page.locator("#wonder-panel")).toBeVisible();
    await expect(page.locator("#wp-count")).toContainText("1 / 7");

    await page.locator("#wp-next").click();
    await expect(page.locator("#wp-count")).toContainText("2 / 7");

    // last step swaps the primary exit to "explore other wonders" + a graph link
    await page.evaluate(() => (window as any).__nebluxWonders.goToStep(6));
    await expect(page.locator("#wp-alt")).toBeVisible();
});

test("picking a tour from the picker dives straight in (no second gate)", async ({ page }) => {
    await page.goto("/wonders.html");
    await page.locator(".wpk-card").first().click(); // navigates to ?w=…
    await ready(page);
    // autostart: the intro gate is skipped, the panel opens directly
    await expect(page).toHaveURL(/\?w=/);
    await expect(page.locator("#wonder-panel")).toBeVisible();
    await expect(page.locator("#wonder-intro")).toBeHidden();
});

test("the finale turns outward prose into live graph links + next-tour cards", async ({ page }) => {
    await page.goto("/wonders.html?w=light&s=7"); // deep-link straight to the last step
    await ready(page);
    await expect(page.locator("#wp-count")).toContainText("7 / 7");

    // outward prose carries at least one live link into the graph
    const outlink = page.locator("#wp-outward a.wp-outlink").first();
    await expect(outlink).toBeVisible();
    await expect(outlink).toHaveAttribute("href", /app\.html\?node=laser_concept/);

    // next-tour recommendation cards appear, each pointing at a related tour
    const recs = page.locator("#wp-recs .wp-rec");
    await expect(recs.first()).toBeVisible();
    await expect(recs.first()).toHaveAttribute("href", /wonders\.html\?w=/);
    // the reason line names a concrete bridge concept
    await expect(page.locator("#wp-recs .wp-rec-why").first()).not.toBeEmpty();
});

test("each tour step links out to that concept on the full graph", async ({ page }) => {
    await page.goto("/wonders.html?w=light&s=3"); // step 3 = electromagnetic_radiation_concept
    await ready(page);
    const sky = page.locator("#wp-sky");
    await expect(sky).toBeVisible();
    await expect(sky).toHaveAttribute("href", "app.html?node=electromagnetic_radiation_concept");
});

test("the tour's exit to the graph lands on its constellation", async ({ page }) => {
    await page.goto("/wonders.html?w=light&s=7"); // finale
    await ready(page);
    const alt = page.locator("#wp-alt");
    await expect(alt).toBeVisible();
    await alt.click();
    await expect(page).toHaveURL(/app\.html\?constellation=light/);
});

test("a tour without outward_links keeps plain, link-free outward prose", async ({ page }) => {
    await page.goto("/wonders.html?w=edge-ai&s=7");
    await ready(page);
    await expect(page.locator("#wp-outward")).toBeVisible();
    await expect(page.locator("#wp-outward a.wp-outlink")).toHaveCount(0);
});

test("tour-index.json is served with tours / nodes / related", async ({ page }) => {
    const res = await page.request.get("/data/tour-index.json");
    expect(res.status(), "tour-index.json status").toBe(200);
    const idx = await res.json();
    expect(Object.keys(idx.tours)).toHaveLength(19);
    expect(idx.tours.light.steps).toContain("optics_concept");
    // reverse lookup: a light step node points back to its tour + 1-based step
    expect(idx.nodes["optics_concept"]).toContainEqual({ tour: "light", step: 1 });
    // related: light links to quantum via the shared wave-particle-duality bridge
    expect(
        idx.related.light.some(
            (r: { tour: string; via: string }) =>
                r.tour === "quantum" && r.via === "wave_particle_duality_concept",
        ),
    ).toBeTruthy();
});

test("wonder data files are served", async ({ page }) => {
    for (const id of ["edge-ai", "black-holes"]) {
        const res = await page.request.get(`/data/wonders/${id}.json`);
        expect(res.status(), `${id}.json status`).toBe(200);
        const json = await res.json();
        expect(json.steps.length).toBe(7);
    }
});
