import { test, expect } from "@playwright/test";

// B1/B2 regression guard. localizeTag() only matched `Nth_century` and
// `bce_to_ce` date ranges, so ordinal centuries (1st/2nd/3rd/21st…) and
// ce_to_ce / bce_to_bce ranges fell through to English for zh/ja users.
// `21st_century` alone tags 27 nodes. This drives the real app in zh and
// asserts the tag chip localizes.
test("zh: ordinal-century tag localizes to 世紀, not English (B1)", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("neblux-app-onboard-seen-v1", "1");
        localStorage.setItem("neblux-lang", "zh");
    });
    await page.goto("/app.html");
    await expect
        .poll(() => page.evaluate(() => !!(window as any).__nebluxApp?.ready()))
        .toBeTruthy();

    const id = await page.evaluate(async () => {
        const j = await (await fetch("/data/all_nodes.json")).json();
        const n = j.nodes.find((x: any) => (x.display_tags || []).includes("21st_century"));
        return n?.id || null;
    });
    expect(id, "expected a node tagged 21st_century in the dataset").toBeTruthy();

    await page.evaluate((nid) => (window as any).__nebluxApp.selectNode(nid), id);
    const tags = page.locator("#p-tags");
    await expect(tags).toContainText("世紀");
    await expect(tags).not.toContainText("21st");
});
