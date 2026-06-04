import { test, expect } from "@playwright/test";

test("index page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Nodus/);
});

test("app page loads and shows graph container", async ({ page }) => {
    await page.goto("/app.html");
    await expect(page).toHaveTitle(/Nodus/);
    await expect(page.locator("#graph-container, #graph, svg")).toHaveCount({ minimum: 1 });
});

test("explorer page loads", async ({ page }) => {
    await page.goto("/explorer.html");
    await expect(page).toHaveTitle(/Nodus/);
});

test("static data file is accessible", async ({ page }) => {
    const response = await page.request.get("/data/all_nodes.json");
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.nodes).toBeDefined();
    expect(json.nodes.length).toBeGreaterThan(0);
});
