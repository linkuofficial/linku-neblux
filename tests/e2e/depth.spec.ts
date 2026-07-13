import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { isInsideDirectory } from "../../scripts/build_depth_pages.mjs";

// Published Neblux Depth pages are copied into frontend/public/depth/ at
// buildStart (scripts/build_depth_pages.mjs), gated by depth_manifest.json's
// publication predicate, so the dev server this suite runs against serves
// them. These tests guard the deploy promises: same-origin CSP-safe assets,
// readable with NO JavaScript, a working canvas with JS, sitemap inclusion,
// and no dependence on the full graph payload.

const PUBLISHED = [
    { slug: "sine-wave", h1: /波/ },
    { slug: "fourier-series", h1: /方波|Fourier/ },
    { slug: "s-plane", h1: /s-plane|極點/i },
    { slug: "transformer", h1: /Transformer/ },
];

test.describe("transformer interaction visibility", () => {
    test("desktop makes the heatmap the dominant interaction visual", async ({ page }) => {
        const viewport = { width: 1440, height: 900 };
        await page.setViewportSize(viewport);
        await page.goto("/depth/transformer.html");
        const lab = await page.locator(".lab-surface").boundingBox();
        const visual = await page.locator(".interaction-visual").boundingBox();
        const controls = await page.locator(".interaction-controls").boundingBox();
        expect(lab).not.toBeNull();
        expect(visual).not.toBeNull();
        expect(controls).not.toBeNull();
        expect(visual!.y).toBeLessThan(viewport.height);
        expect(visual!.width).toBeGreaterThan(lab!.width * 0.95);
        expect(controls!.y).toBeGreaterThan(visual!.y + visual!.height - 2);
        await expect(page.locator(".canvas-wrap")).toHaveCSS("border-top-width", "0px");
    });

    test("mobile interaction starts in the first viewport without horizontal overflow", async ({ page }) => {
        const viewport = { width: 390, height: 844 };
        await page.setViewportSize(viewport);
        await page.goto("/depth/transformer.html");
        const top = await page.locator(".lab-surface").evaluate((element) => Math.round(element.getBoundingClientRect().top));
        expect(top).toBeLessThan(viewport.height);
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
    });
});

test("sine-wave keeps frequency, adds physical wave speed, and retains advanced phase", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto("/depth/sine-wave.html");
    await expect(page.locator("#freq")).toBeVisible();
    await expect(page.locator("#speed")).toBeVisible();
    await expect(page.locator("#phase")).toBeVisible();
    await expect(page.locator("#freq-value")).toContainText("T = 1.00 s");
    await page.locator("#freq").evaluate((input: HTMLInputElement) => {
        input.value = "2";
        input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.locator("#freq-value")).toContainText("2.00 Hz · T = 0.50 s");
    await expect(page.locator("#speed-value")).toContainText("λ = 4.00 m");
    await page.locator("#speed").evaluate((input: HTMLInputElement) => {
        input.value = "16";
        input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.locator("#speed-value")).toContainText("16.0 m/s · λ = 8.00 m");
    const controlTops = await page.locator(".controls .control").evaluateAll((elements) =>
        elements.map((element) => Math.round(element.getBoundingClientRect().top)),
    );
    expect(new Set(controlTops).size).toBe(1);
    await expect(page.locator(".metaphor")).toContainText(/波峰.*波谷|波峰與波谷/);
});

test("depth publication path gate rejects prefix-collision siblings", () => {
    const depthDir = resolve("depth");
    expect(isInsideDirectory(depthDir, resolve("depth/sine-wave.html"))).toBe(true);
    expect(isInsideDirectory(depthDir, resolve("depth-escape/sine-wave.html"))).toBe(false);
});

test.describe("depth pages are readable without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("every published page serves real content with no JS", async ({ page }) => {
        for (const { slug, h1 } of PUBLISHED) {
            await page.goto(`/depth/${slug}.html`);
            await expect(page.locator("h1")).toContainText(h1);
            // the formal/glossary layer is plain HTML — readable content, not an app shell
            expect((await page.locator("main").innerText()).length).toBeGreaterThan(400);
        }
    });
});

test("published pages carry a canonical link and CSP-safe script shape", async ({ page }) => {
    for (const { slug } of PUBLISHED) {
        const res = await page.request.get(`/depth/${slug}.html`);
        expect(res.status(), `${slug} served`).toBe(200);
        const html = await res.text();

        // zh-Hant self-canonical injected at publish time; no en alternate yet
        expect(html).toContain(`<link rel="canonical" href="https://neblux.linku.tech/depth/${slug}.html">`);
        expect(html).not.toMatch(/hreflang="en"/i);

        // CSP guard (script-src 'self'): every <script> is either the JSON
        // node-meta block or an external same-origin module; no handlers.
        for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
            expect(
                /\ssrc\s*=\s*"\.\/[^"]+"/.test(tag) || /type\s*=\s*"application\/json"/.test(tag),
                `${slug}: unexpected script tag ${tag}`,
            ).toBe(true);
        }
        expect(html).not.toMatch(/\son\w+\s*=/i);
    }
});

for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
]) {
    for (const { slug } of PUBLISHED) {
        test(`${slug} boots on ${viewport.name} with painted canvas and healthy assets`, async ({ page }) => {
            await page.setViewportSize(viewport);
            const errors: string[] = [];
            const failedAssets: string[] = [];
            const requests: string[] = [];
            page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
            page.on("pageerror", (err) => errors.push(String(err)));
            page.on("requestfailed", (req) => failedAssets.push(`${req.url()}: ${req.failure()?.errorText}`));
            page.on("response", (res) => {
                if (["document", "script", "stylesheet"].includes(res.request().resourceType()) && !res.ok()) {
                    failedAssets.push(`${res.status()} ${res.url()}`);
                }
            });
            page.on("request", (req) => requests.push(new URL(req.url()).pathname));

            const response = await page.goto(`/depth/${slug}.html`);
            expect(response?.ok(), `${slug} document response`).toBe(true);
            const canvases = page.locator("canvas:visible");
            await expect(canvases.first()).toBeVisible();
            await expect.poll(async () => {
                for (const canvas of await canvases.all()) {
                    if (await canvas.evaluate((c: HTMLCanvasElement) => {
                        const g = c.getContext("2d");
                        if (!g || c.width === 0 || c.height === 0) return false;
                        const d = g.getImageData(0, 0, c.width, c.height).data;
                        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
                        return false;
                    })) return true;
                }
                return false;
            }).toBe(true);

            expect(failedAssets, `${slug} ${viewport.name} assets`).toEqual([]);
            expect(errors, `${slug} ${viewport.name} console`).toEqual([]);
            expect(requests.filter((p) => p.includes("all_nodes"))).toEqual([]);
        });
    }
}

test("sitemap lists exactly the published depth pages", async ({ page }) => {
    const res = await page.request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const { slug } of PUBLISHED) {
        expect(xml).toContain(`<loc>https://neblux.linku.tech/depth/${slug}.html</loc>`);
    }
    // no stray depth URLs beyond the published set
    const listed = [...xml.matchAll(/\/depth\/([a-z0-9-]+)\.html/g)].map((m) => m[1]);
    expect(new Set(listed)).toEqual(new Set(PUBLISHED.map((p) => p.slug)));
});
