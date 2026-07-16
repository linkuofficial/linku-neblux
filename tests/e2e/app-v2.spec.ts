import { expect, test } from '@playwright/test';

test.describe('internal Main Galaxy v2 scaffold', () => {
    test('loads the canonical WP5.5 scene through the v2 adapter', async ({ page }) => {
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.constellationCount())).toBeGreaterThan(0);
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.sceneSize())).toEqual({ nodes: 687, edges: 3138 });
        await expect.poll(() => page.evaluate(() => {
            const debug = (window as any).__nebluxApp.debug();
            return { archetypes: debug.unknownArchetypes, overlays: debug.unknownOverlays };
        })).toEqual({ archetypes: 0, overlays: 0 });
        await expect(page.locator('#v2-canvas')).toBeVisible();
    });

    test('fits the full canonical scene into the overview instead of resetting to a fixed camera', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await page.locator('#v2-reset').click();
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.camera().zoom)).toBeLessThan(1);
        const visible = await page.evaluate(() => {
            const app = (window as any).__nebluxApp;
            const points = app.nodeIds().map((id: string) => app.screenPos(id));
            return {
                camera: app.camera(),
                minX: Math.min(...points.map((point: any) => point.x)), maxX: Math.max(...points.map((point: any) => point.x)),
                minY: Math.min(...points.map((point: any) => point.y)), maxY: Math.max(...points.map((point: any) => point.y)),
            };
        });
        expect(visible.camera.zoom).toBeLessThan(1);
        expect(visible.minX).toBeGreaterThanOrEqual(35);
        expect(visible.maxX).toBeLessThanOrEqual(1245);
        expect(visible.minY).toBeGreaterThanOrEqual(81);
        expect(visible.maxY).toBeLessThanOrEqual(727);
    });

    test('restores an internal node URL and keeps optional indices non-blocking', async ({ page }) => {
        await page.route('**/data/atlas/depth-index.json', (route) => route.fulfill({ status: 404 }));
        await page.route('**/data/atlas/portal-index.json', (route) => route.fulfill({ status: 500 }));
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect(page.locator('#v2-card')).toBeVisible();
        await expect(page.locator('#v2-card-title')).toHaveText(/Mathematics/i);
        await expect(page.locator('#v2-card-depth')).toBeHidden();
        await expect(page.locator('#v2-card-portals')).toBeHidden();
    });

    test('URL precedence keeps node focus ahead of constellation and search', async ({ page }) => {
        await page.goto('/app-v2.html?node=mathematics_field&constellation=light&search=physics');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect(page.locator('#v2-card-title')).toHaveText(/Mathematics/i);
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.constellationCount())).toBeGreaterThan(0);
    });

    test('uses the saved locale for labels, search and the DOM keyboard mirror', async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('neblux-lang', 'zh'));
        await page.goto('/app-v2.html?search=%E6%95%B8%E5%AD%B8');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect(page.locator('#v2-card-title')).toHaveText('數學');
        await expect(page.locator('#v2-node-mirror button')).toHaveCount(687);
    });

    test('renders structured localized panel content with English fallback and readable Wonder stations', async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('neblux-lang', 'zh'));
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect(page.locator('#v2-card-type')).toHaveText('領域');
        await expect.poll(() => page.locator('#v2-card-description details').count()).toBeGreaterThan(0);
        await expect(page.locator('#v2-card-description')).not.toContainText('Description is unavailable.');

        await page.goto('/app-v2.html?node=complex_systems_concept');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect(page.locator('#v2-card-stations')).toContainText(/湧現|網路/);
        await expect(page.locator('#v2-card-stations')).not.toContainText('emergence ·');
    });

    test('keeps the latest three selected nodes as clickable breadcrumbs', async ({ page }) => {
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await page.evaluate(() => {
            const app = (window as any).__nebluxApp;
            ['mathematics_field', 'physics_field', 'chemistry_field', 'biology_field'].forEach((id) => app.selectNode(id));
        });
        await expect(page.locator('#v2-card-breadcrumb button')).toHaveCount(3);
        await expect(page.locator('#v2-card-breadcrumb')).toContainText('Physics');
        await expect(page.locator('#v2-card-breadcrumb')).toContainText('Biology');
    });

    test('keeps invalid higher-priority URLs fail-closed instead of falling through to search', async ({ page }) => {
        await page.goto('/app-v2.html?node=missing-node&search=mathematics');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect(page.locator('#v2-card')).toBeHidden();
        await expect(page.locator('#v2-status')).toHaveText(/unavailable|無法使用/i);
    });

    test('exposes the legacy constellation hook without writing history', async ({ page }) => {
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.constellationCount())).toBeGreaterThan(0);
        const result = await page.evaluate(() => {
            const app = (window as any).__nebluxApp;
            const before = location.search;
            const constellation = app.constellations()[0];
            return { focused: app.focusConstellation(constellation.id), before, after: location.search, debug: app.debug(), screen: app.constellationScreen(constellation.id) };
        });
        expect(result.focused).toBe(true);
        expect(result.after).toBe(result.before);
        expect(result.debug.guidedSegmentsDrawn).toBeGreaterThanOrEqual(0);
        expect(result.screen).not.toBeNull();
    });

    test('keeps the canonical scene cache mounted across interaction-only visual updates', async ({ page }) => {
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        const result = await page.evaluate(() => {
            const app = (window as any).__nebluxApp;
            const before = app.debug();
            app.selectNode('mathematics_field');
            app.selectNode('physics_field');
            const after = app.debug();
            return { before: before.sceneRebuilds, after: after.sceneRebuilds, animations: after.activeAnimations };
        });
        expect(result.after).toBe(result.before);
        expect(result.animations).toContain('ambient');
    });

    test('shows clickable Wonder names and spines in the far overview', async ({ page }) => {
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.constellationCount())).toBeGreaterThan(0);
        const target = await page.evaluate(() => {
            const app = (window as any).__nebluxApp;
            app.zoomTo(0.55);
            const items = app.constellations();
            for (let y = 110; y < innerHeight - 70; y += 12) {
                for (let x = 70; x < innerWidth - 70; x += 12) {
                    const name = app.constellationNameAt(x, y);
                    if (name && !app.nodeAtScreen(x, y)) {
                        const item = items.find((entry: any) => entry.name === name);
                        if (item) return { id: item.id, point: { x, y } };
                    }
                }
            }
            return null;
        });
        expect(target).toBeTruthy();
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.debug().constellationsDrawn)).toBeGreaterThan(0);
        const canvas = await page.locator('#v2-canvas').boundingBox();
        await page.mouse.move(canvas!.x + target.point.x, canvas!.y + target.point.y);
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.debug().hoveredConstellationId)).toBe(target.id);
        await page.mouse.click(canvas!.x + target.point.x, canvas!.y + target.point.y);
        await expect(page).toHaveURL(new RegExp(`constellation=${encodeURIComponent(target.id)}`));
    });

    test('migrates legacy Learning Path mode to an initially quiet state', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('neblux-learning-mode', 'true');
            localStorage.setItem('neblux-learned', JSON.stringify(['mathematics_field']));
            localStorage.removeItem('neblux-learning-state-version');
        });
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect.poll(() => page.evaluate(() => ({ mode: (window as any).__nebluxApp.debug().learningMode, segments: (window as any).__nebluxApp.debug().learningSegments, version: localStorage.getItem('neblux-learning-state-version') }))).toEqual({ mode: false, segments: 0, version: '2' });
    });

    test('provides measured safe viewport regions once the detail card opens', async ({ page }) => {
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.debug().safeRectCount)).toBeGreaterThan(3);
    });

    test('persists local Learning Path state and mirrors keyboard focus on the canvas', async ({ page }) => {
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        const rootId = await page.evaluate(() => {
            const app = (window as any).__nebluxApp;
            app.setLearningMode(true);
            for (const id of app.nodeIds()) {
                app.selectNode(id);
                if (!(document.querySelector('#v2-learning-toggle') as HTMLButtonElement).disabled) return id;
            }
            return null;
        });
        expect(rootId).toBeTruthy();
        await page.locator('#v2-learning-toggle').click();
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.debug().learnedNodes)).toBe(1);
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('neblux-learned') || '[]'))).toContain(rootId);

        const mirrorIndex = 5;
        const mirrorId = await page.evaluate((index) => (window as any).__nebluxApp.nodeIds()[index], mirrorIndex);
        await page.locator('#v2-node-mirror button').nth(mirrorIndex).focus();
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.debug().keyboardNodeId)).toBe(mirrorId);
    });

    test('keeps the world point under the pointer stable while wheel zooming', async ({ page }) => {
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        const before = await page.evaluate(() => (window as any).__nebluxApp.screenPos('mathematics_field'));
        const canvas = await page.locator('#v2-canvas').boundingBox();
        await page.mouse.move(canvas!.x + before.x, canvas!.y + before.y);
        await page.mouse.wheel(0, -120);
        const after = await page.evaluate(() => (window as any).__nebluxApp.screenPos('mathematics_field'));
        expect(Math.abs(after.x - before.x)).toBeLessThan(1.5);
        expect(Math.abs(after.y - before.y)).toBeLessThan(1.5);
    });

    test('supports a two-finger pinch without selecting a node', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await page.evaluate(() => (window as any).__nebluxApp.zoomTo(0.55));
        const before = await page.evaluate(() => (window as any).__nebluxApp.camera().zoom);
        const box = await page.locator('#v2-canvas').boundingBox();
        const session = await page.context().newCDPSession(page);
        const cx = box!.x + box!.width / 2; const cy = box!.y + box!.height / 2;
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 35, y: cy, id: 1 }, { x: cx + 35, y: cy, id: 2 }] });
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 75, y: cy, id: 1 }, { x: cx + 75, y: cy, id: 2 }] });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.camera().zoom)).toBeGreaterThan(before * 1.5);
        await expect(page.locator('#v2-card')).toBeHidden();
    });

    test('remains usable at mobile width with reduced motion', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await expect(page.locator('#v2-card')).toBeVisible();
        await expect.poll(() => page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > window.innerWidth, pending: (window as any).__nebluxApp.debug().schedulerPending }))).toEqual({ overflow: false, pending: false });
    });

    test('keeps a mobile focus point above the open bottom sheet', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        const point = await page.evaluate(() => (window as any).__nebluxApp.screenPos('mathematics_field'));
        const card = await page.locator('#v2-card').boundingBox();
        expect(card).not.toBeNull();
        expect(point.y).toBeLessThan(card!.y - 12);
    });

    test('treats a dragged star as a pan rather than a click and exposes hover state', async ({ page }) => {
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        const target = await page.evaluate(() => {
            const app = (window as any).__nebluxApp;
            return app.nodeIds().map((id: string) => ({ id, point: app.screenPos(id) })).find(({ id, point }: any) => point.x > 80 && point.x < innerWidth - 80 && point.y > 130 && point.y < innerHeight - 80 && app.nodeAtScreen(point.x, point.y) === id);
        });
        expect(target).toBeTruthy();
        const canvas = await page.locator('#v2-canvas').boundingBox();
        expect(canvas).not.toBeNull();
        await page.mouse.move(canvas!.x + target.point.x, canvas!.y + target.point.y);
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.debug().hoveredNodeId)).toBe(target.id);
        await page.mouse.down();
        await page.mouse.move(canvas!.x + target.point.x + 8, canvas!.y + target.point.y);
        await page.mouse.up();
        await expect(page.locator('#v2-card')).toBeHidden();
    });

    test('clears focus on Escape and browser back instead of leaving stale scene state', async ({ page }) => {
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await page.locator('#v2-search-input').fill('mathematics');
        await page.locator('#v2-search-results button').first().click();
        await expect(page).toHaveURL(/node=/);
        await page.goBack();
        await expect(page.locator('#v2-card')).toBeHidden();
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.debug().hasRing)).toBe(false);
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await page.keyboard.press('Escape');
        await expect(page.locator('#v2-card')).toBeHidden();
        await expect(page).not.toHaveURL(/node=/);
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp.debug().hasRing)).toBe(false);
    });

    test('moves the desktop language control out from under the detail card', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        const language = await page.locator('#v2-languages').boundingBox();
        const card = await page.locator('#v2-card').boundingBox();
        expect(language).not.toBeNull();
        expect(card).not.toBeNull();
        expect(language!.x + language!.width).toBeLessThan(card!.x);
        await page.locator('#v2-languages button').nth(1).click();
        await expect(page.locator('#v2-languages button').nth(1)).toHaveClass(/is-active/);
    });

    test('keeps camera controls outside an open detail panel on desktop and mobile', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        const desktopControls = await page.locator('.v2-controls').boundingBox();
        const desktopCard = await page.locator('#v2-card').boundingBox();
        expect(desktopControls!.x + desktopControls!.width).toBeLessThan(desktopCard!.x);

        await page.setViewportSize({ width: 390, height: 844 });
        const mobileControls = await page.locator('.v2-controls').boundingBox();
        const mobileCard = await page.locator('#v2-card').boundingBox();
        expect(mobileControls!.y + mobileControls!.height).toBeLessThan(mobileCard!.y);
    });

    test('localizes all Learning Path card strings', async ({ page }) => {
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        await page.locator('#v2-languages button').nth(1).click();
        await expect(page.locator('#v2-learning-toggle')).toHaveText(/加入學習路徑|從學習路徑移除/);
        await expect(page.locator('#v2-learning-next')).toContainText(/下一步：|學習路徑已完成/);
        await page.locator('#v2-languages button').nth(2).click();
        await expect(page.locator('#v2-learning-toggle')).toHaveText(/学習パスに追加|学習パスから外す/);
        await expect(page.locator('#v2-learning-next')).toContainText(/次：|学習パスを完了/);
    });

    test('does not make first paint wait for a delayed optional presentation bundle', async ({ page }) => {
        await page.route('**/data/atlas/main-presentation.json', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ schemaVersion: '1.0.0', bundles: [] }) });
        });
        await page.goto('/app-v2.html');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready()), { timeout: 900 }).toBe(true);
        await expect(page.locator('#v2-canvas')).toBeVisible();
    });

    test('falls back to English descriptions when a new locale description file fails', async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('neblux-lang', 'zh'));
        await page.route('**/data/i18n/ja_descriptions.json', (route) => route.fulfill({ status: 500 }));
        await page.route('**/data/i18n/ja_descriptions_batch1.json', (route) => route.fulfill({ status: 500 }));
        await page.goto('/app-v2.html?node=mathematics_field');
        await expect.poll(() => page.evaluate(() => (window as any).__nebluxApp?.ready())).toBe(true);
        const chineseDescription = await page.locator('#v2-card-description').textContent();
        await page.locator('#v2-languages button').nth(2).click();
        await expect.poll(() => page.locator('#v2-card-description').textContent()).not.toBe(chineseDescription);
    });
});
