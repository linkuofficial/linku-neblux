import { test, expect } from "@playwright/test";

// DIRECTION ironclad rule #1: with the whole API dead, the site must still work.
// landing + explorer genuinely try /api/* first and fall back to the static
// /data/*.json; app + wonders read /data directly. Block every /api/** request
// and prove all four entry pages still come up on their static fallback. This is
// a permanent guard — it must stay green as the P1 backend adds real /api calls.
//
// Note: a blocked request logs a browser-level "Failed to load resource" that JS
// cannot suppress, so these assert the pages FUNCTION, not that the console is
// silent. Graceful degradation = the site works, not that the network is quiet.

async function killApi(page) {
    await page.route("**/api/**", (route) => route.abort());
}

test.describe("API down — the site still works (ironclad rule 1)", () => {
    test("Atlas homepage still exposes static routes", async ({ page }) => {
        await killApi(page);
        await page.goto("/");
        await expect.poll(() => page.evaluate(() => !!(window as any).__nebluxAtlas?.ready())).toBeTruthy();
        await expect(page.locator("[data-region-id=main]")).toBeVisible();
        await expect(page.locator(".atlas-wonder-directory a")).toHaveCount(19);
    });

    test("wonders picker still lists every tour", async ({ page }) => {
        await killApi(page);
        await page.goto("/wonders.html");
        await expect(page.locator(".wpk-card")).toHaveCount(19);
    });

    test("app graph engine still comes up", async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem("neblux-app-onboard-seen-v1", "1"));
        await killApi(page);
        await page.goto("/app.html");
        await expect(page.locator("#canvas")).toBeVisible();
        await expect
            .poll(() => page.evaluate(() => !!(window as any).__nebluxApp?.ready()), { timeout: 20000 })
            .toBeTruthy();
    });

    test("explorer still boots and expands on fallback data", async ({ page }) => {
        await killApi(page);
        await page.goto("/explorer.html");
        await expect
            .poll(() => page.evaluate(() => !!(window as any).__nebluxExplorer?.ready()), { timeout: 20000 })
            .toBeTruthy();
        await page.evaluate(() => (window as any).__nebluxExplorer.startExploration("calculus_field"));
        await expect
            .poll(() => page.evaluate(() => ((window as any).__nebluxExplorer?.nodeIds() ?? []).length), { timeout: 10000 })
            .toBeGreaterThan(0);
    });
});
