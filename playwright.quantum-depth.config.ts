import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/depth-preview',
  outputDir: './test-results/quantum-depth',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 3,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev:depth -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/wavefunction.html',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
