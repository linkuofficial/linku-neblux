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

    expect(await page.evaluate(() => (window as any).__nebluxAtlas.ready())).toBe(true);
    await expect(page.locator("#atlas-canvas")).toBeVisible();
    await expect(page.locator("[data-region-id]")).toHaveCount(4);
    await expect(page.locator(".atlas-wonder-directory a")).toHaveCount(19);
    expect(await page.evaluate(() => (window as any).__nebluxAtlas.regionIds())).toEqual(["main", "edge-ai", "light", "quantum"]);
    await expect(page.locator('[data-region-id="main"]')).toHaveAttribute("href", "/app.html");
    await expect(page.locator('[data-region-id="light"]')).toHaveAttribute("href", "/wonders.html?w=light");
    await expect(page.locator('[data-region-id="quantum"]')).toHaveAttribute("href", "/wonders.html?w=quantum");
    await expect(page.locator('[data-region-id="edge-ai"]')).toHaveAttribute("href", "/wonders.html?w=edge-ai");
    const mainPosition = await page.evaluate(() => (window as any).__nebluxAtlas.screenRegion("main"));
    const mainPixel = await page.locator("#atlas-canvas").evaluate((element, point) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext("2d")!;
        const rect = canvas.getBoundingClientRect();
        const x = Math.round(point.x * canvas.width / rect.width);
        const y = Math.round(point.y * canvas.height / rect.height);
        return Array.from(context.getImageData(x, y, 1, 1).data);
    }, mainPosition);
    expect(mainPixel[3]).toBe(255);
    expect(mainPixel[0] + mainPixel[1] + mainPixel[2]).toBeGreaterThan(400);
    expect(requests.some((path) => /\/(all_nodes|portal-index|depth-index)\.json$/.test(path))).toBeFalsy();
    expect(requests.some((path) => path.startsWith("/api/"))).toBeFalsy();
    expect(requests.some((path) => path.startsWith("/data/wonders/"))).toBeFalsy();
    expect(errors, `runtime errors during Atlas load:\n${errors.join("\n")}`).toHaveLength(0);
});

test("production homepage keeps Neblux metadata and Atlas-only network budget", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(new URL(request.url()).pathname));
    await page.goto("/");
    await atlasReady(page);
    await expect(page).toHaveTitle("Neblux — Interactive Science Knowledge Graph");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://neblux.linku.tech/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Neblux/);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Neblux");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/site.webmanifest");
    expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain("SearchAction");
    expect(await page.locator('meta[name="robots"]').count()).toBe(0);
    expect(await page.locator("body").textContent()).not.toMatch(/Prototype|Pilot regions|試行區域|試作リージョン/);
    expect(requests.some((path) => /\/(all_nodes|portal-index|depth-index)\.json$/.test(path))).toBeFalsy();
    expect(requests.some((path) => path.startsWith("/data/wonders/") || path.startsWith("/api/"))).toBeFalsy();
});

test("production homepage localizes the static Wonder directory", async ({ page }) => {
    await page.goto("/");
    await atlasReady(page);
    await page.locator('[data-atlas-lang="zh"]').click();
    await expect(page.locator('[data-wonder-id="black-holes"]')).toHaveText("黑洞與時空");
    await page.locator('[data-atlas-lang="ja"]').click();
    await expect(page.locator('[data-wonder-id="black-holes"]')).toHaveText("ブラックホールと時空");
});

test("Atlas directory remains useful when the index is unavailable", async ({ page }) => {
    await page.route("**/data/atlas/index.json", (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
    await page.goto("/atlas-v2.html");
    await expect.poll(async () => page.evaluate(() => (window as any).__nebluxAtlas?.loadState())).toBe("index-unavailable");
    await expect(page.locator("#atlas-fallback")).toBeVisible();
    await expect(page.locator("[data-region-id]")).toHaveCount(4);
    await expect(page.locator(".atlas-wonder-directory a")).toHaveCount(19);

    await page.unroute("**/data/atlas/index.json");
    await page.route("**/data/atlas/index.json", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"mainGalaxy":{}}' }));
    await page.reload();
    await expect.poll(async () => page.evaluate(() => (window as any).__nebluxAtlas?.loadState())).toBe("index-unavailable");
    await expect(page.locator("#atlas-fallback")).toBeVisible();
});

test("Atlas keeps all static Wonder routes when JavaScript is disabled", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
        await page.goto(new URL("/atlas-v2.html", baseURL || "http://127.0.0.1:3000").href);
        await expect(page.locator(".atlas-wonder-directory a")).toHaveCount(19);
        await expect(page.locator('[data-region-id="main"]')).toHaveAttribute("href", "/app.html");
        await expect(page.locator('[data-region-id="edge-ai"]')).toHaveAttribute("href", "/wonders.html?w=edge-ai");
    } finally {
        await context.close();
    }
});

test("Atlas sizes its Canvas backing store correctly on high-DPI screens", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    try {
        await page.goto(new URL("/atlas-v2.html", baseURL || "http://127.0.0.1:3000").href);
        await atlasReady(page);
        const scale = await page.locator("#atlas-canvas").evaluate((element) => {
            const canvas = element as HTMLCanvasElement;
            const rect = canvas.getBoundingClientRect();
            return { x: canvas.width / rect.width, y: canvas.height / rect.height };
        });
        expect(scale.x).toBeCloseTo(2, 1);
        expect(scale.y).toBeCloseTo(2, 1);
    } finally {
        await context.close();
    }
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
    await expect(light).toHaveClass(/is-active/);
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
    for (const id of ["#atlas-zoom-in", "#atlas-zoom-out", "#atlas-reset"]) {
        const size = await page.locator(id).evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });
        expect(size.width).toBeGreaterThanOrEqual(44);
        expect(size.height).toBeGreaterThanOrEqual(44);
    }
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
    const boxBeforeDrag = await canvas.boundingBox();
    expect(boxBeforeDrag).toBeTruthy();
    const center = { x: boxBeforeDrag!.x + boxBeforeDrag!.width / 2, y: boxBeforeDrag!.y + boxBeforeDrag!.height / 2 };
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 90, center.y + 50, { steps: 4 });
    await page.mouse.up();
    const panned = await page.evaluate(() => (window as any).__nebluxAtlas.camera());
    expect(panned.x).toBeGreaterThan(90);
    expect(panned.y).toBeGreaterThan(50);

    // Repeated drags hit the camera bound instead of losing every route.
    for (let i = 0; i < 5; i += 1) {
        await page.mouse.move(center.x, center.y);
        await page.mouse.down();
        await page.mouse.move(boxBeforeDrag!.x + boxBeforeDrag!.width - 3, center.y, { steps: 3 });
        await page.mouse.up();
    }
    const boundedMain = await page.evaluate(() => (window as any).__nebluxAtlas.screenRegion("main"));
    expect(boundedMain.x).toBeGreaterThanOrEqual(43);
    expect(boundedMain.x).toBeLessThanOrEqual(boxBeforeDrag!.width - 43);
    await page.locator("#atlas-reset").click();
    const light = await page.evaluate(() => (window as any).__nebluxAtlas.screenRegion("light"));
    const box = await canvas.boundingBox();
    expect(light).toBeTruthy();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + light.x, box!.y + light.y);
    await expect(page.locator("#atlas-tooltip")).toBeVisible();
});
