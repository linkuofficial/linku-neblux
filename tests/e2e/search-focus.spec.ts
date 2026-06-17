import { test, expect } from "@playwright/test";

// Regression guard for the Graph-page search-focus bug.
//
// The app canvas is tabindex=0 (keyboard a11y + "Skip to graph" skip-link), so a
// pointer press on it focuses it by default. The top chrome auto-collapses on
// desktop, briefly leaving #search-box at pointer-events:none mid-transition — a
// click aimed at the reappearing search box then falls through to the full-screen
// canvas, which grabs keyboard focus and silently swallows whatever the visitor
// types. The fix: a capture-phase mousedown preventDefault on the canvas suppresses
// focus-on-press while leaving d3 pan/drag and node clicks intact.

test("pressing the graph canvas does not steal keyboard focus", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("nodus-app-onboard-seen-v1", "1"));
    await page.goto("/app.html");

    await expect
        .poll(async () => page.evaluate(() => !!(window as any).__nodusApp?.ready()))
        .toBeTruthy();
    await page.waitForTimeout(400); // let the layout settle

    // A point clear of any node so the press lands on empty graph space.
    const empty = await page.evaluate(() => {
        const app = (window as any).__nodusApp;
        const pts = app
            .nodeIds()
            .map((id: string) => app.screenPos(id))
            .filter(Boolean);
        const candidates = [
            { x: 60, y: innerHeight - 60 },
            { x: innerWidth - 60, y: innerHeight - 60 },
            { x: 60, y: Math.round(innerHeight / 2) },
        ];
        for (const c of candidates) {
            if (pts.every((p: any) => Math.hypot(p.x - c.x, p.y - c.y) > 40)) return c;
        }
        return candidates[0];
    });

    await page.mouse.click(empty.x, empty.y);

    const canvasFocused = await page.evaluate(
        () => document.activeElement === document.getElementById("canvas")
    );
    expect(canvasFocused).toBe(false);
});

test("search box accepts a click then keystrokes", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("nodus-app-onboard-seen-v1", "1"));
    await page.goto("/app.html");

    await expect
        .poll(async () => page.evaluate(() => !!(window as any).__nodusApp?.ready()))
        .toBeTruthy();

    // The top chrome starts collapsed on desktop; nudge the pointer to the top edge
    // to reveal it, then let the reveal transition settle before clicking.
    await page.mouse.move(Math.round(page.viewportSize()!.width / 2), 8);
    await page.waitForTimeout(350);

    const input = page.locator("#search-input");
    await input.click();
    await input.type("calc");

    await expect(input).toBeFocused();
    await expect(input).toHaveValue("calc");
});
