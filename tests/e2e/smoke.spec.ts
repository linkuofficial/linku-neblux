import { test, expect } from "@playwright/test";

test("index page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Nodus/);
});

test("app page loads and shows graph container", async ({ page }) => {
    await page.goto("/app.html");
    await expect(page).toHaveTitle(/Nodus/);
    await expect(page.locator("#canvas")).toBeVisible();
});

test("onboarding can advance and close", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.removeItem("nodus-app-onboard-seen-v1");
    });
    await page.goto("/app.html");

    const onboard = page.locator("#app-onboard");
    const step = page.locator("#app-onboard-step");
    const next = page.locator("#app-onboard-next");

    await expect(onboard).toHaveClass(/visible/);
    await expect(step).toContainText("1/3");

    await next.click();
    await expect(step).toContainText("2/3");

    await next.click();
    await expect(step).toContainText("3/3");

    await next.click();
    await expect(onboard).not.toHaveClass(/visible/);
    await expect(onboard).toHaveAttribute("aria-hidden", "true");
});

test("node can be dragged in app graph", async ({ page }) => {
    await page.goto("/app.html");

    const dismiss = page.locator("#app-onboard-dismiss");
    if (await dismiss.isVisible()) {
        await dismiss.click();
    }

    const firstNode = page.locator("g.node").first();
    const firstHit = page.locator("g.node circle.hit").first();
    await expect(firstHit).toBeVisible();

    const initialTransform = await firstNode.getAttribute("transform");
    const box = await firstHit.boundingBox();
    if (!box) {
        throw new Error("Unable to resolve node position for drag test");
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 48, startY + 36, { steps: 8 });
    await page.mouse.up();

    await expect.poll(async () => firstNode.getAttribute("transform")).not.toBe(initialTransform);
});

test("explorer page loads", async ({ page }) => {
    await page.goto("/explorer.html");
    await expect(page).toHaveTitle(/Nodus/);
});

test("explorer node can be dragged after starting exploration", async ({ page }) => {
    await page.goto("/explorer.html");

    await expect.poll(async () => {
        return await page.evaluate(() => {
            return typeof startExploration === "function" && typeof g !== "undefined" && !!g;
        });
    }).toBeTruthy();

    await page.evaluate(() => {
        startExploration("calculus_field");
    });

    await expect.poll(async () => page.locator("g.node").count()).toBeGreaterThan(0);
    const firstNode = page.locator("g.node").first();
    const firstCore = page.locator("g.node circle.core").first();
    await expect(firstCore).toBeVisible();

    const initialTransform = await firstNode.getAttribute("transform");
    const box = await firstCore.boundingBox();
    if (!box) {
        throw new Error("Unable to resolve explorer node position for drag test");
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 50, startY + 30, { steps: 8 });
    await page.mouse.up();

    await expect.poll(async () => firstNode.getAttribute("transform")).not.toBe(initialTransform);
});

test("static data file is accessible", async ({ page }) => {
    const response = await page.request.get("/data/all_nodes.json");
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.nodes).toBeDefined();
    expect(json.nodes.length).toBeGreaterThan(0);
});
