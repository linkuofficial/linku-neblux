import { test, expect } from "@playwright/test";

const atlasReady = (page: import("@playwright/test").Page) =>
    expect.poll(async () => page.evaluate(() => (window as any).__nebluxAtlas?.loadState()), { timeout: 15000 }).toBe("ready");

test("Atlas prototype renders only its presentation index and exposes matching routes", async ({ page }) => {
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => requests.push(new URL(request.url()).pathname));
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

    await page.goto("/atlas-v2.html");
    await atlasReady(page);

    await expect(page.locator("#atlas-canvas")).toBeVisible();
    await expect(page.locator("[data-region-id]")).toHaveCount(4);
    await expect(page.locator(".atlas-wonder-directory a")).toHaveCount(19);
    expect(await page.evaluate(() => (window as any).__nebluxAtlas.regionIds())).toEqual(["main", "edge-ai", "light", "quantum"]);
    await expect(page.locator('[data-region-id="main"]')).toHaveAttribute("href", "/app.html");
    await expect(page.locator('[data-region-id="light"]')).toHaveAttribute("href", "/wonders.html?w=light");
    await expect(page.locator('[data-region-id="quantum"]')).toHaveAttribute("href", "/wonders.html?w=quantum");
    await expect(page.locator('[data-region-id="edge-ai"]')).toHaveAttribute("href", "/wonders.html?w=edge-ai");
    expect(requests.some((path) => /\/(all_nodes|portal-index|depth-index)\.json$/.test(path))).toBeFalsy();
    expect(requests.some((path) => path.startsWith("/api/"))).toBeFalsy();
    expect(requests.some((path) => path.startsWith("/data/wonders/"))).toBeFalsy();
    expect(errors, `runtime errors during Atlas load:\n${errors.join("\n")}`).toHaveLength(0);
});

test("Atlas directory remains useful when the index is unavailable", async ({ page }) => {
    await page.route("**/data/atlas/index.json", (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
    await page.goto("/atlas-v2.html");
    await expect.poll(async () => page.evaluate(() => (window as any).__nebluxAtlas?.loadState())).toBe("index-unavailable");
    await expect(page.locator("#atlas-fallback")).toBeVisible();
    await expect(page.locator("[data-region-id]")).toHaveCount(4);
    await expect(page.locator(".atlas-wonder-directory a")).toHaveCount(19);
});

test("Atlas keeps its directory available when Canvas is unsupported", async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => null });
    });
    await page.goto("/atlas-v2.html");
    await expect.poll(async () => page.evaluate(() => (window as any).__nebluxAtlas?.loadState())).toBe("canvas-unavailable");
    await expect(page.locator("#atlas-fallback")).toBeVisible();
    await expect(page.locator(".atlas-wonder-directory a")).toHaveCount(19);
});

test("Atlas keyboard routes are visible and usable", async ({ page }) => {
    await page.goto("/atlas-v2.html");
    await atlasReady(page);
    const light = page.locator('[data-region-id="light"]');
    await light.focus();
    await expect(light).toBeFocused();
    await light.press("Enter");
    await expect(page).toHaveURL(/\/wonders\.html\?w=light/);
});

test("Atlas is stable at mobile width and in reduced-motion mode", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/atlas-v2.html");
    await atlasReady(page);
    await expect(page.locator("#atlas-zoom-in")).toBeVisible();
    await expect(page.locator("#atlas-zoom-out")).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
    const before = await page.evaluate(() => (window as any).__nebluxAtlas.redrawCount());
    await page.waitForTimeout(180);
    expect(await page.evaluate(() => (window as any).__nebluxAtlas.redrawCount())).toBe(before);
});

test("Atlas supports wheel zoom, reset and pointer hit testing", async ({ page }) => {
    await page.goto("/atlas-v2.html");
    await atlasReady(page);
    const before = await page.evaluate(() => (window as any).__nebluxAtlas.camera().zoom);
    const canvas = page.locator("#atlas-canvas");
    await canvas.hover();
    await page.mouse.wheel(0, -260);
    await expect.poll(async () => page.evaluate(() => (window as any).__nebluxAtlas.camera().zoom)).toBeGreaterThan(before);
    await page.locator("#atlas-reset").click();
    await expect.poll(async () => page.evaluate(() => (window as any).__nebluxAtlas.camera().zoom)).toBe(1);
    const light = await page.evaluate(() => (window as any).__nebluxAtlas.screenRegion("light"));
    const box = await canvas.boundingBox();
    expect(light).toBeTruthy();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + light.x, box!.y + light.y);
    await expect(page.locator("#atlas-tooltip")).toBeVisible();
});
