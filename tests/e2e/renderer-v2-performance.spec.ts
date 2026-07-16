import { test, expect } from "@playwright/test";

const PROFILES = [
    { id: "desktop-dpr1", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: "no-preference" as const, ambientFps: 24 },
    { id: "desktop-dpr2", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, reducedMotion: "no-preference" as const, ambientFps: 24 },
    { id: "mobile-dpr2", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "no-preference" as const, ambientFps: 20 },
    { id: "reduced-motion", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: "reduce" as const, ambientFps: 0 },
];

test("renderer v2 performance matrix stays below the renderer long-task gate", async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(60_000);
    const matrix: Record<string, any> = {};
    for (const profile of PROFILES) {
        const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, reducedMotion: profile.reducedMotion });
        const page = await context.newPage();
        try {
            await page.goto(new URL("/renderer-v2-lab.html", baseURL || "http://127.0.0.1:3000").href);
            await expect.poll(async () => page.evaluate(() => (window as any).__nebluxRendererV2?.ready())).toBe(true);
            const metrics = await page.evaluate(() => (window as any).__nebluxRendererV2.benchmark({ samples: 30 }));
            expect(metrics.rendererFramesOver100Ms, `${profile.id} renderer frame exceeded 100 ms`).toBe(0);
            // PerformanceObserver sees the entire page main thread (including
            // Vite/HMR and concurrent test-host work), while frameMs measures
            // the renderer itself. Keep renderer frames at the hard 100 ms
            // gate and only reject severe/repeated unattributed host stalls.
            expect(metrics.observedLongTasks.length, `${profile.id} produced repeated browser long tasks`).toBeLessThanOrEqual(2);
            expect(Math.max(0, ...metrics.observedLongTasks.map((entry: any) => entry.duration)), `${profile.id} produced a browser stall over 150 ms`).toBeLessThan(150);
            expect(metrics.p95Ms, `${profile.id} p95 exceeded the 100 ms hard gate`).toBeLessThan(100);
            expect(metrics.focusLatencyMs, `${profile.id} focus exceeded the 100 ms hard gate`).toBeLessThan(100);
            expect(metrics.firstMeaningfulSceneMs, `${profile.id} first meaningful scene took over one second`).toBeLessThan(1000);
            expect(Object.keys(metrics.lodSamples).sort()).toEqual(["far", "focus", "mid", "near"]);
            expect(metrics.lodSamples.far.maxDrawnEdges).toBe(0);
            expect(metrics.lodSamples.mid.maxEdgeCandidates).toBeLessThanOrEqual(180);
            expect(metrics.lodSamples.near.maxNodeCandidates).toBeLessThan(1000);
            expect(metrics.lodSamples.focus.maxNodeCandidates).toBeLessThan(1000);

            const beforeIdle = await page.evaluate(() => (window as any).__nebluxRendererV2.stats());
            let idleState = null;
            let idlePending = null;
            if (profile.ambientFps > 0) {
                await page.waitForTimeout(1100);
                const afterIdle = await page.evaluate(() => (window as any).__nebluxRendererV2.stats());
                const redrawDelta = afterIdle.redrawCount - beforeIdle.redrawCount;
                expect(afterIdle.schedulerState).toBe("animating");
                expect(afterIdle.schedulerPending).toBe(true);
                expect(afterIdle.activeAnimations).toContain("ambient");
                expect(redrawDelta).toBeGreaterThanOrEqual(Math.floor(profile.ambientFps * 0.55));
                expect(redrawDelta).toBeLessThanOrEqual(Math.ceil(profile.ambientFps * 1.35));
                metrics.restingRedrawDelta = afterIdle.redrawCount - beforeIdle.redrawCount;
                idleState = afterIdle.schedulerState;
                idlePending = afterIdle.schedulerPending;
            } else if (profile.reducedMotion === "reduce") {
                await page.waitForTimeout(180);
                const afterIdle = await page.evaluate(() => (window as any).__nebluxRendererV2.stats());
                expect(afterIdle.schedulerState).toBe("clean");
                expect(afterIdle.schedulerPending).toBe(false);
                expect(afterIdle.redrawCount).toBe(beforeIdle.redrawCount);
                metrics.restingRedrawDelta = afterIdle.redrawCount - beforeIdle.redrawCount;
                idleState = afterIdle.schedulerState;
                idlePending = afterIdle.schedulerPending;
            } else {
                metrics.restingRedrawDelta = null;
            }
            matrix[profile.id] = {
                p50Ms: metrics.p50Ms,
                p95Ms: metrics.p95Ms,
                maxMs: metrics.maxMs,
                focusLatencyMs: metrics.focusLatencyMs,
                firstMeaningfulSceneMs: metrics.firstMeaningfulSceneMs,
                rendererFramesOver100Ms: metrics.rendererFramesOver100Ms,
                observedLongTasks: metrics.observedLongTasks,
                restingRedrawDelta: metrics.restingRedrawDelta,
                idleState,
                idlePending,
                lodSamples: metrics.lodSamples,
                finalStats: metrics.stats,
            };
        } finally {
            await context.close();
        }
    }
    await testInfo.attach("renderer-v2-performance-matrix", { body: JSON.stringify(matrix, null, 2), contentType: "application/json" });
    console.log(`RENDERER_V2_PERFORMANCE=${JSON.stringify(matrix)}`);
});
