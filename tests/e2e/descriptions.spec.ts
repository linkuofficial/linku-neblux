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
    await page.addInitScript(() => localStorage.setItem("nodus-app-onboard-seen-v1", "1"));
    await page.goto("/app.html?node=mathematics_field");
    await page.waitForLoadState("networkidle");
    await expect
        .poll(() => panelDescLen(page), { timeout: 15000 })
        .toBeGreaterThan(0);
});

test("explorer: node panel fills with streamed description", async ({ page }) => {
    // Canvas renderer: start exploration, wait for nodes, then click the seed node.
    await page.goto("/explorer.html");

    await expect.poll(async () =>
        page.evaluate(() => !!(window as any).__nodusExplorer?.ready())
    , { timeout: 15000 }).toBeTruthy();

    await page.evaluate(() => (window as any).__nodusExplorer.startExploration("mathematics_field"));

    await expect.poll(async () =>
        page.evaluate(() => ((window as any).__nodusExplorer?.nodeIds() ?? []).length)
    , { timeout: 8000 }).toBeGreaterThan(0);

    // Let the layout settle, then open the seed node's panel directly.
    await page.waitForTimeout(1200);
    await page.evaluate(() => (window as any).__nodusExplorer.selectNode("mathematics_field"));

    await expect
        .poll(() => panelDescLen(page), { timeout: 15000 })
        .toBeGreaterThan(0);
});
