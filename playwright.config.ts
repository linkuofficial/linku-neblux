import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    outputDir: "./test-results",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    // One local retry too: the heavy canvas pages (app/explorer load ~1MB graph +
    // stream descriptions) can lose a cold-start race against a single shared Vite
    // dev server and time out on appReady/networkidle. That's server contention,
    // not a product regression (the same specs pass green run serially) — a retry
    // absorbs the residual flake so "test:e2e all green" stays a trustworthy gate.
    retries: process.env.CI ? 2 : 1,
    // Cap local parallelism: Playwright's default (≈½ the CPU cores) spun up 8
    // workers here and stampeded the one dev server, starving those heavy pages
    // into false timeouts. 3 keeps a real speedup without the thundering herd.
    workers: process.env.CI ? 1 : 3,
    reporter: "list",
    use: {
        baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
        trace: "on-first-retry",
    },
    webServer: process.env.E2E_BASE_URL
        ? undefined
        : {
            command: "npm run dev -- --host 127.0.0.1 --port 3000",
            url: "http://127.0.0.1:3000",
            reuseExistingServer: true,
            timeout: 120000,
        },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
