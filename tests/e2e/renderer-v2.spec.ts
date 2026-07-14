import { test, expect } from "@playwright/test";

test("renderer v2 lab paints the deterministic scene without data fetches", async ({ page }, testInfo) => {
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => requests.push(new URL(request.url()).pathname));
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto("/renderer-v2-lab.html");
    await expect.poll(async () => page.evaluate(() => (window as any).__nebluxRendererV2?.ready())).toBe(true);
    await expect(page.locator("#renderer-v2-canvas")).toBeVisible();
    expect(await page.evaluate(() => (window as any).__nebluxRendererV2.sceneSize())).toEqual({ nodes: 1000, edges: 7000 });
    const stats = await page.evaluate(() => (window as any).__nebluxRendererV2.stats());
    expect(stats.redrawCount).toBeGreaterThan(0);
    expect(stats.drawnNodes).toBeLessThanOrEqual(stats.nodeCandidates);
    expect(stats.drawnEdges).toBeLessThanOrEqual(stats.edgeCandidates);
    expect(stats.sceneHash).toMatch(/^[0-9a-f]{8}$/);
    const pixel = await page.locator("#renderer-v2-canvas").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext("2d")!;
        const data = context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
        return Array.from(data);
    });
    expect(pixel[3]).toBe(255);
    expect(pixel[0] + pixel[1] + pixel[2]).toBeGreaterThan(10);
    await page.screenshot({ path: testInfo.outputPath("renderer-v2-desktop.png"), fullPage: true });
    expect(requests.some((path) => path.startsWith("/data/") || path.startsWith("/api/"))).toBeFalsy();
    expect(errors).toEqual([]);
});

test("renderer v2 lab handles DPR 2, camera controls and touch-sized controls", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    try {
        await page.goto(new URL("/renderer-v2-lab.html", baseURL || "http://127.0.0.1:3000").href);
        await expect.poll(async () => page.evaluate(() => (window as any).__nebluxRendererV2?.ready())).toBe(true);
        const scale = await page.locator("#renderer-v2-canvas").evaluate((element) => {
            const canvas = element as HTMLCanvasElement;
            const rect = canvas.getBoundingClientRect();
            return { x: canvas.width / rect.width, y: canvas.height / rect.height };
        });
        expect(scale.x).toBeCloseTo(2, 1);
        expect(scale.y).toBeCloseTo(2, 1);
        for (const id of ["#renderer-zoom-in", "#renderer-zoom-out", "#renderer-reset"]) {
            const size = await page.locator(id).evaluate((element) => {
                const rect = element.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            });
            expect(size.width).toBeGreaterThanOrEqual(44);
            expect(size.height).toBeGreaterThanOrEqual(44);
        }
        const before = await page.evaluate(() => (window as any).__nebluxRendererV2.camera().zoom);
        await page.locator("#renderer-zoom-in").click();
        await expect.poll(async () => page.evaluate(() => (window as any).__nebluxRendererV2.camera().zoom)).toBeGreaterThan(before);
        await page.locator("#renderer-reset").click();
        await expect.poll(async () => page.evaluate(() => (window as any).__nebluxRendererV2.camera().zoom)).toBe(1);
    } finally {
        await context.close();
    }
});

test("renderer v2 reduced motion stays on demand", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/renderer-v2-lab.html");
    await expect.poll(async () => page.evaluate(() => (window as any).__nebluxRendererV2?.ready())).toBe(true);
    const before = await page.evaluate(() => (window as any).__nebluxRendererV2.stats());
    await page.waitForTimeout(220);
    const after = await page.evaluate(() => (window as any).__nebluxRendererV2.stats());
    expect(after.redrawCount).toBe(before.redrawCount);
    expect(after.schedulerState).toBe("clean");
});
