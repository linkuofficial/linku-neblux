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

test("wonder data files are served", async ({ page }) => {
    for (const id of ["edge-ai", "black-holes"]) {
        const res = await page.request.get(`/data/wonders/${id}.json`);
        expect(res.status(), `${id}.json status`).toBe(200);
        const json = await res.json();
        expect(json.steps.length).toBe(7);
    }
});
