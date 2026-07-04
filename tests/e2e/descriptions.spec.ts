import { test, expect } from "@playwright/test";

/*
 * Guard for the description-streaming split (vite copyDataPlugin writes a slim
 * all_nodes.json + a separate descriptions.json). The graph must render on the
 * topology alone, then the panel description must fill in once descriptions are
 * fetched. Regression target: a broken split / missing enDescriptionMap fallback
 * would leave panels permanently blank for English.
 */

const panelDescLen = async (page) =>
    ((await page.locator("#p-desc").textContent()) || "").trim().length;

test("app: node panel fills with streamed description", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("neblux-app-onboard-seen-v1", "1"));
    await page.goto("/app.html?node=mathematics_field");
    await page.waitForLoadState("networkidle");
    await expect
        .poll(() => panelDescLen(page), { timeout: 15000 })
        .toBeGreaterThan(0);
});

test("app: a node with a spark leads with it and tucks the precise lead below (P0-B)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("neblux-app-onboard-seen-v1", "1"));
    await page.goto("/app.html?node=black_hole_concept");
    await page.waitForLoadState("networkidle");
    // spark opener leads the description
    await expect
        .poll(() => page.locator("#p-desc .pd-spark").textContent(), { timeout: 15000 })
        .toContain("no coming back");
    // the precise definition tucks into a collapsible below the spark
    const details = page.locator("#p-desc details.pd-sec", { hasText: "In precise terms" });
    await expect(details).toHaveCount(1);
    await expect(details).toContainText("region of spacetime");
});

test("explorer: node panel fills with streamed description", async ({ page }) => {
    // Canvas renderer: start exploration, wait for nodes, then click the seed node.
    await page.goto("/explorer.html");

    await expect.poll(async () =>
        page.evaluate(() => !!(window as any).__nebluxExplorer?.ready())
    , { timeout: 15000 }).toBeTruthy();

    await page.evaluate(() => (window as any).__nebluxExplorer.startExploration("mathematics_field"));

    await expect.poll(async () =>
        page.evaluate(() => ((window as any).__nebluxExplorer?.nodeIds() ?? []).length)
    , { timeout: 8000 }).toBeGreaterThan(0);

    // Let the layout settle, then open the seed node's panel directly.
    await page.waitForTimeout(1200);
    await page.evaluate(() => (window as any).__nebluxExplorer.selectNode("mathematics_field"));

    await expect
        .poll(() => panelDescLen(page), { timeout: 15000 })
        .toBeGreaterThan(0);
});
