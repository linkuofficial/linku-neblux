import { test, expect, Page } from "@playwright/test";

// Tour "constellation" overlay on the full graph (P0-5). Pixel checks run with
// animation frozen (reducedMotion) so an A/B diff — overlay present vs cleared —
// isolates exactly the pixels the layer paints, with no twinkle/photon noise.
test.use({ reducedMotion: "reduce" });

const appReady = (page: Page) =>
    expect
        .poll(
            async () =>
                page.evaluate(
                    () =>
                        !!(window as any).__nebluxApp?.ready() &&
                        ((window as any).__nebluxApp.constellationCount?.() || 0) > 0,
                ),
            { timeout: 20000 },
        )
        .toBeTruthy();

test("the overlay is present zoomed out and gone zoomed in", async ({ page }) => {
    await page.goto("/app.html");
    await appReady(page);

    // Deterministic zoom crossfade: fully present at k≤0.55, absent at k≥0.9.
    const tLow = await page.evaluate(() => {
        (window as any).__nebluxApp.zoomTo(0.42);
        return (window as any).__nebluxApp.constellationT();
    });
    const tHigh = await page.evaluate(() => {
        (window as any).__nebluxApp.zoomTo(1.7);
        return (window as any).__nebluxApp.constellationT();
    });
    expect(tLow).toBe(1);
    expect(tHigh).toBe(0);

    // Pixel proof: count pixels that change when the overlay is toggled off, at
    // each zoom. Many zoomed out (arcs + names + label crossfade), ≈none zoomed in.
    const diff = await page.evaluate(async () => {
        const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const app = (window as any).__nebluxApp;
        const canvas = document.getElementById("canvas") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d")!;
        const saved = app.constellations();
        const changed = async (k: number) => {
            app.zoomTo(k);
            await wait(300);
            const on = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            app.setConstellations([]);
            await wait(200);
            const off = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            app.setConstellations(saved);
            await wait(200);
            let c = 0;
            for (let i = 0; i < on.length; i += 4) {
                if (
                    Math.abs(on[i] - off[i]) +
                        Math.abs(on[i + 1] - off[i + 1]) +
                        Math.abs(on[i + 2] - off[i + 2]) >
                    24
                )
                    c++;
            }
            return c;
        };
        const low = await changed(0.42);
        const high = await changed(1.7);
        return { low, high };
    });
    expect(diff.low).toBeGreaterThan(400);
    expect(diff.high).toBeLessThan(diff.low / 10);
});

test("clicking a constellation name enters its tour", async ({ page }) => {
    // Suppress the first-visit onboarding + welcome overlays so a real click on a
    // name reaches the canvas (they otherwise cover the graph's centre).
    await page.addInitScript(() => {
        try {
            localStorage.setItem("neblux-app-onboard-seen-v1", "1");
        } catch {}
    });
    await page.goto("/app.html");
    await appReady(page);
    await page.evaluate(() => document.getElementById("welcome-overlay")?.classList.add("hidden"));

    // Zoom out, find an on-screen name whose hit-box resolves to its own tour.
    // Wait a frame after zooming so draw() repopulates the name hit-boxes.
    const target = await page.evaluate(async () => {
        const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const app = (window as any).__nebluxApp;
        const canvas = document.getElementById("canvas");
        app.zoomTo(0.42);
        await wait(400);
        const W = window.innerWidth,
            H = window.innerHeight;
        for (const c of app.constellations()) {
            const s = app.constellationScreen(c.id);
            // On-screen; hit-box resolves to this tour; no star under it (star
            // clicks win); and the point actually lands on the canvas — not on a
            // header/legend/filter overlay that would swallow a real click.
            if (
                s &&
                s.x > 70 && s.x < W - 70 && s.y > 70 && s.y < H - 70 &&
                app.constellationNameAt(s.x, s.y) === c.id &&
                app.nodeAtScreen(s.x, s.y) === null &&
                document.elementFromPoint(s.x, s.y) === canvas
            )
                return { id: c.id, x: s.x, y: s.y };
        }
        return null;
    });
    expect(target).not.toBeNull();

    await page.mouse.click(target!.x, target!.y);
    await expect(page).toHaveURL(new RegExp(`wonders\\.html\\?w=${target!.id}`));
});

test("app.html?constellation=<id> frames and lights only that tour", async ({ page }) => {
    await page.goto("/app.html?constellation=the-mind");
    await appReady(page);

    // Focus applies after the (deferred) tour-index load: most of the sky dims,
    // only the tour's ~6 stars stay lit, and its internal edges highlight.
    await expect
        .poll(async () => page.evaluate(() => (window as any).__nebluxApp.debug().dimmedNodes), { timeout: 8000 })
        .toBeGreaterThan(600);
    const dbg = await page.evaluate(() => (window as any).__nebluxApp.debug());
    expect(dbg.activeEdges).toBeGreaterThan(0);
});
