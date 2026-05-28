import { test, expect } from '@playwright/test';

test.describe('Nexus regressions', () => {
    test('app and explorer ESC clears search input', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';

        await page.goto(`${root}/app.html`);
        await expect(page.locator('#loading')).toBeHidden({ timeout: 30000 });
        await page.fill('#search-input', 'quantum');
        await expect(page.locator('#search-results')).toBeVisible();
        await page.locator('#search-input').press('Escape');
        await expect(page.locator('#search-input')).toHaveValue('');
        await expect(page.locator('#search-results')).toHaveAttribute('aria-hidden', 'true');

        await page.goto(`${root}/explorer.html`);
        await page.fill('#search-input', 'a');
        await expect(page.locator('#search-input')).toHaveValue('a');
        await page.locator('#search-input').evaluate((el) => el.focus());
        await page.keyboard.press('Escape');
        await expect(page.locator('#search-input')).toHaveValue('');
        await expect(page.locator('#search-results')).toBeHidden();
    });

    test('app breadcrumb nav history survives reload in session', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';

        await page.goto(`${root}/app.html`);
        await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });
        await page.fill('#search-input', 'quantum');
        await expect(page.locator('#search-results .sr[data-node-id]').first()).toBeVisible();
        await page.locator('#search-results .sr[data-node-id]').first().click();
        await expect(page.locator('#panel')).toHaveClass(/open/);
        await expect(page.locator('#p-breadcrumb .bc-item').first()).toBeVisible();

        await page.reload();
        await expect(page.locator('#loading')).toBeHidden({ timeout: 30000 });
        await expect(page.locator('#p-breadcrumb .bc-item').first()).toBeVisible();
    });

    test('SEO/meta essentials exist on all entry pages', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';
        const pages = ['/', '/app.html', '/explorer.html'];

        for (const path of pages) {
            await page.goto(`${root}${path}`);
            await expect(page.locator('meta[name="description"]')).toHaveCount(1);
            await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
            await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
            await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
            await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
            await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
        }
    });

    test('explorer loads graph and search remains usable', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';
        await page.goto(`${root}/explorer.html`);

        await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });
        await expect(page.locator('#canvas')).toBeVisible();

        await page.fill('#search-input', 'physics');
        await expect(page.locator('#search-results .sr').first()).toBeVisible();
    });

    test('app first-visit onboarding can be dismissed and help opens with keyboard', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';

        await page.addInitScript(() => {
            localStorage.removeItem('nexus-app-onboard-seen-v1');
        });
        await page.goto(`${root}/app.html`);

        await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });
        await expect(page.locator('#app-onboard')).toHaveClass(/visible/);
        await page.click('#app-onboard-dismiss');
        await expect(page.locator('#app-onboard')).not.toHaveClass(/visible/);

        await page.keyboard.press('?');
        await expect(page.locator('#shortcuts-modal')).toHaveClass(/visible/);
        await expect(page.locator('#shortcut-search-label')).not.toHaveText('');
        await page.keyboard.press('Escape');
        await expect(page.locator('#shortcuts-modal')).not.toHaveClass(/visible/);
    });

    test('app keyboard shortcuts focus search and help button opens modal', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';

        await page.addInitScript(() => {
            localStorage.setItem('nexus-app-onboard-seen-v1', '1');
        });
        await page.goto(`${root}/app.html`);

        await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });
        await page.keyboard.press('/');
        await expect(page.locator('#search-input')).toBeFocused();
        await page.click('#help-btn');
        await expect(page.locator('#shortcuts-modal')).toHaveClass(/visible/);
        await page.click('#shortcuts-close');
        await expect(page.locator('#shortcuts-modal')).not.toHaveClass(/visible/);
    });

    test('explorer first-visit tour and help button coordinate correctly', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';

        await page.addInitScript(() => {
            localStorage.removeItem('nexus-explorer-tour-v1');
        });
        await page.goto(`${root}/explorer.html`);

        await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });
        await expect(page.locator('#onboard')).toHaveClass(/visible/);
        await page.keyboard.press('Escape');
        await expect(page.locator('#onboard')).not.toHaveClass(/visible/);

        await page.click('#btn-help');
        await expect(page.locator('#shortcuts')).toHaveClass(/visible/);
        await expect(page.locator('#shortcuts-intro')).not.toHaveText('');
        await page.click('#shortcuts-close');
        await expect(page.locator('#shortcuts')).not.toHaveClass(/visible/);
    });

    test('app search query deep-link auto-focuses best node', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';
        await page.goto(`${root}/app.html?search=quantum`);

        await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });
        await expect(page.locator('#search-input')).toHaveValue('quantum');
        await expect(page.locator('#panel')).toHaveClass(/open/);
        await expect(page.locator('#p-label')).not.toHaveText('');
    });

    test('index Search Directly gives visible focus feedback', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';
        await page.goto(`${root}/`);

        await page.click('#ctaSearch');
        await expect(page.locator('#searchInput')).toBeFocused();
        await expect(page.locator('#searchContainer')).toHaveClass(/search-cta-flash/);
    });

    test('index suggestion pills show tooltip before navigating on touch', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';

        await page.addInitScript(() => {
            window.__NEXUS_FORCE_TOUCH_TOOLTIP__ = true;
        });

        await page.goto(`${root}/`);

        const firstPill = page.locator('.pill-btn').first();
        await expect.poll(async () => {
            return await firstPill.evaluate((el) => el.getAttribute('data-tooltip-body') || '');
        }).not.toBe('');
        await firstPill.click();
        await expect(page.locator('#pillTooltip')).toHaveClass(/visible/);
        await expect(page.locator('#pillTooltipBody')).not.toHaveText('');
        await expect(page).toHaveURL(`${root}/`);

        await firstPill.click();
        await expect(page).toHaveURL(/app\.html\?search=black%20hole/);
    });

    test('explorer shows retry UI when API and static data both fail', async ({ page, baseURL }) => {
        const root = baseURL || 'http://127.0.0.1:3000';

        await page.route('**/api/graph/full', async (route) => {
            await route.abort();
        });
        await page.route('**/data/all_nodes.json', async (route) => {
            await route.abort();
        });

        await page.goto(`${root}/explorer.html`);

        await expect(page.locator('#loading')).toBeVisible();
        await expect(page.locator('#loading-retry')).toBeVisible();
        await expect(page.locator('#loading-text')).toContainText('Unable to load graph data');
    });
});
