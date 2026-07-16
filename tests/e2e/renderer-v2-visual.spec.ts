import { test, expect } from "@playwright/test";

const CASES = [
    { id: "depth-lens", overlays: ["depth_lens"] },
    { id: "portal-ring", overlays: ["portal_ring"] },
    { id: "depth-portal", overlays: ["depth_lens", "portal_ring"] },
    { id: "selected-depth-portal", overlays: ["selected", "depth_lens", "portal_ring"] },
];

async function pixelSignature(page: import("@playwright/test").Page) {
    return page.locator("#renderer-v2-canvas").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext("2d")!;
        const size = Math.min(180, canvas.width, canvas.height);
        const x = Math.floor((canvas.width - size) / 2);
        const y = Math.floor((canvas.height - size) / 2);
        const pixels = context.getImageData(x, y, size, size).data;
        let hash = 2166136261;
        let opaquePixels = 0;
        let brightPixels = 0;
        let rgbSum = 0;
        for (let index = 0; index < pixels.length; index += 4) {
            const brightness = pixels[index] + pixels[index + 1] + pixels[index + 2];
            rgbSum += brightness;
            if (pixels[index + 3] > 0) opaquePixels += 1;
            if (brightness > 300) brightPixels += 1;
            hash = Math.imul(hash ^ pixels[index], 16777619);
            hash = Math.imul(hash ^ pixels[index + 1], 16777619);
            hash = Math.imul(hash ^ pixels[index + 2], 16777619);
            hash = Math.imul(hash ^ pixels[index + 3], 16777619);
        }
        return { hash: (hash >>> 0).toString(16).padStart(8, "0"), opaquePixels, brightPixels, rgbSum };
    });
}

async function captureMatrix(browser: import("@playwright/test").Browser, baseURL: string | undefined, reducedMotion: "reduce" | "no-preference", testInfo: import("@playwright/test").TestInfo) {
    const context = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1, reducedMotion });
    const page = await context.newPage();
    const result: Record<string, Awaited<ReturnType<typeof pixelSignature>>> = {};
    try {
        await page.goto(new URL("/renderer-v2-lab.html", baseURL || "http://127.0.0.1:3000").href);
        await expect.poll(async () => page.evaluate(() => (window as any).__nebluxRendererV2?.ready())).toBe(true);
        for (const entry of CASES) {
            await page.evaluate((overlays) => (window as any).__nebluxRendererV2.setOverlayCase(overlays), entry.overlays);
            result[entry.id] = await pixelSignature(page);
            await page.locator("#renderer-v2-canvas").screenshot({ path: testInfo.outputPath(`${reducedMotion}-${entry.id}.png`) });
        }
    } finally {
        await context.close();
    }
    return result;
}

test("renderer v2 overlay pixel matrix", { tag: "@visual" }, async ({ browser, baseURL }, testInfo) => {
    const normal = await captureMatrix(browser, baseURL, "no-preference", testInfo);
    const reduced = await captureMatrix(browser, baseURL, "reduce", testInfo);
    expect(new Set(Object.values(normal).map((entry) => entry.hash)).size).toBe(CASES.length);
    for (const entry of CASES) {
        expect(reduced[entry.id].opaquePixels).toBe(normal[entry.id].opaquePixels);
        expect(reduced[entry.id].brightPixels).toBeGreaterThanOrEqual(normal[entry.id].brightPixels);
    }
    expect(JSON.stringify({ normal, reduced }, null, 2)).toMatchSnapshot("renderer-v2-overlay-pixels.json");
});
