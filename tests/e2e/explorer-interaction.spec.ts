import { test, expect } from "@playwright/test";

/*
 * REAL-MOUSE explorer interaction guard. The other explorer specs drive the
 * graph through the __nodusExplorer.selectNode hook, which calls handleClick
 * directly — bypassing findNodeAtScreen AND any DOM overlay. That blind spot
 * once hid two real bugs (the onboarding modal eating clicks; d3.zoom's
 * dblclick stealing the expand gesture). This test uses actual mouse events at
 * canvas coordinates, with the first-visit tour dismissed, so it exercises the
 * true pointer path a user takes.
 */
test("explorer: real click selects, real double-click expands", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.addInitScript(() => localStorage.setItem("nodus-explorer-tour-v1", "done"));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/explorer.html");
    await page.waitForFunction(() => !!(window as any).__nodusExplorer?.ready());
    await page.evaluate(() => (window as any).__nodusExplorer.startExploration("calculus_field"));
    await expect.poll(() =>
        page.evaluate(() => (window as any).__nodusExplorer.nodeIds().length)
    ).toBeGreaterThan(2);
    await page.waitForTimeout(1200); // let the layout settle so screen coords are stable

    const hub = () => page.evaluate(() => {
        const app = (window as any).__nodusExplorer;
        const id = app.nodeIds().find((x: string) => x !== "calculus_field" && x.endsWith("_field"));
        return { id, ...app.screenPos(id) };
    });

    // Real single click → detail panel opens for that node.
    const a = await hub();
    await page.mouse.click(a.x, a.y);
    await expect(page.locator("#panel")).toHaveClass(/open/);

    // Opening the panel re-heats the force layout; let it settle so the hub's
    // screen position is stable and the double-click lands on it (otherwise the
    // node drifts between the coord read and the dblclick and the gesture misses).
    await page.waitForTimeout(900);

    // Real double-click on a hub field → its neighbours reveal (graph grows).
    const before = await page.evaluate(() => (window as any).__nodusExplorer.nodeIds().length);
    const b = await hub();
    await page.mouse.dblclick(b.x, b.y);
    // Generous budget: under parallel load the heavy canvas pages contend for CPU
    // and the async neighbour reveal can take a few seconds.
    await expect.poll(() =>
        page.evaluate(() => (window as any).__nodusExplorer.nodeIds().length)
    , { timeout: 12000 }).toBeGreaterThan(before);

    expect(errors, errors.join("\n")).toHaveLength(0);
});
