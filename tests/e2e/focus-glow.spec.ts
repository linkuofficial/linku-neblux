import { test, expect } from "@playwright/test";

/*
 * Regression guard for the node-connection glow aesthetic: clicking a node must
 * light up its connections as animated focus-curves (.link.focus-curve.active)
 * with flowing photons (.photon), plus a focus-ring halo on the node. This broke
 * silently once during the CSS componentization refactor, so it's worth pinning.
 */

// In-page: pick the highest-degree visible node (guarantees it has edges to light)
// and dispatch a real click on its core/hit circle.
const CLICK_HUB = () => {
    const nodes = Array.from(document.querySelectorAll("g.node")) as any[];
    const deg = new Map<string, number>();
    for (const l of Array.from(document.querySelectorAll(".link")) as any[]) {
        const d = (l as any).__data__; if (!d) continue;
        const s = d.source?.id ?? d.source, t = d.target?.id ?? d.target;
        deg.set(s, (deg.get(s) || 0) + 1); deg.set(t, (deg.get(t) || 0) + 1);
    }
    let best: any = null, bestDeg = -1;
    for (const n of nodes) {
        const id = (n as any).__data__?.id;
        const dg = deg.get(id) || 0;
        if (dg > bestDeg) { bestDeg = dg; best = n; }
    }
    const target = best?.querySelector("circle.hit") || best?.querySelector("circle.core");
    target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return bestDeg;
};

async function assertGlow(page) {
    const counts = await page.evaluate(() => ({
        active: document.querySelectorAll(".link.focus-curve.active").length,
        photon: document.querySelectorAll(".photon").length,
        ring: document.querySelectorAll(".focus-ring").length,
    }));
    expect(counts.active, "focus-curve.active edges should light up").toBeGreaterThan(0);
    expect(counts.photon, "flowing photons should be drawn").toBeGreaterThan(0);
    expect(counts.ring, "selected node should get a focus-ring halo").toBeGreaterThan(0);
}

test("app: clicking a node lights up its connections", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("nodus-app-onboard-seen-v1", "1"));
    await page.goto("/app.html");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("g.node").first()).toBeVisible();
    await page.waitForTimeout(800);
    const deg = await page.evaluate(CLICK_HUB);
    expect(deg).toBeGreaterThan(0);
    await page.waitForTimeout(600);
    await assertGlow(page);
});

test("explorer: clicking a node lights up its connections", async ({ page }) => {
    await page.goto("/explorer.html");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => { (window as any).startExploration?.("calculus_field"); });
    await page.waitForTimeout(1800);
    const deg = await page.evaluate(CLICK_HUB);
    expect(deg).toBeGreaterThan(0);
    await page.waitForTimeout(600);
    await assertGlow(page);
});
