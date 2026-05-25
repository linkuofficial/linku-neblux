import { test, expect } from "@playwright/test";

test.describe("Nexus smoke", () => {
    test("landing to app navigation", async ({ page, baseURL }) => {
        await page.goto(baseURL || "http://127.0.0.1:3000");
        await expect(page).toHaveTitle(/Nexus/i);

        await page.goto(`${baseURL || "http://127.0.0.1:3000"}/app.html`);
        await expect(page.locator("#canvas")).toBeVisible();
        await expect(page.locator("#loading")).toBeHidden({ timeout: 20000 });
        await expect(page.locator("#search-input")).toBeVisible();

        await page.fill("#search-input", "quantum");
        await expect(page.locator("#search-results")).toBeVisible();
        await expect(page.locator("#search-results .sr").first()).toBeVisible();

        await page.click("#lang-toggle .lang-btn[data-lang='zh']");
        await expect(page.locator("#hdr h1")).toContainText("知識圖譜");

        await page.click("#lp-btn");
        await expect(page.locator("#learned-info")).toBeVisible();
        await expect(page.locator("#learned-info")).toContainText("已學");
    });
});
