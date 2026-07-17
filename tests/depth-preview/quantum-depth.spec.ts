import { test, expect } from '@playwright/test';

const PAGES = [
  { slug: 'wavefunction', title: '波函數', control: '#wave-width' },
  { slug: 'quantum-superposition', title: '量子疊加', control: '#relative-phase' },
  { slug: 'uncertainty-principle', title: '不確定性原理', control: '#localization' },
  { slug: 'quantum-tunneling', title: '量子穿隧', control: '#barrier-width' },
  { slug: 'quantum-spin', title: '量子自旋', control: '#magnet-angle' },
  { slug: 'quantum-entanglement', title: '量子糾纏', control: '#measure-pair' },
];

async function canvasSignature(page) {
  return page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width === 0 || canvas.height === 0) return { painted: 0, signature: '' };
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    let hash = 2166136261;
    const stride = Math.max(4, Math.floor(pixels.length / 20000 / 4) * 4);
    for (let i = 0; i < pixels.length; i += stride) {
      if (pixels[i + 3] > 0) painted += 1;
      hash ^= pixels[i] + pixels[i + 1] * 3 + pixels[i + 2] * 7 + pixels[i + 3] * 11;
      hash = Math.imul(hash, 16777619);
    }
    return { painted, signature: String(hash >>> 0) };
  });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  for (const entry of PAGES) {
    test(`${entry.slug} teaches through one working interaction on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      const failed: string[] = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('requestfailed', (request) => failed.push(`${request.url()}: ${request.failure()?.errorText}`));

      const response = await page.goto(`/${entry.slug}.html`);
      expect(response?.ok()).toBe(true);
      await expect(page.locator('h1')).toContainText(entry.title);
      await expect(page.locator('main')).toHaveAttribute('data-ready', 'true');
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(5, 7, 13)');
      await expect(page.locator('.eyebrow')).toHaveCSS('color', 'rgb(155, 168, 189)');
      await expect(page.locator('.site-header')).toHaveCSS('min-height', '56px');
      await expect(page.locator('.canvas-wrap')).toHaveCSS('border-radius', '0px');
      expect(await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('system-ui');
      await expect(page.locator(entry.control)).toBeVisible();
      await expect(page.locator('input, button')).toHaveCount(1);
      await expect(page.locator('.result-line')).not.toBeEmpty();
      const before = await canvasSignature(page);
      expect(before.painted).toBeGreaterThan(100);
      const beforeResult = await page.locator('.result-line').innerText();

      if (entry.control === '#measure-pair') {
        await page.locator(entry.control).focus();
        await page.keyboard.press('Enter');
      } else {
        await page.locator(entry.control).evaluate((element: HTMLInputElement) => {
          element.value = element.id === 'relative-phase'
            ? String((Number(element.min) + Number(element.max)) / 2)
            : element.max;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }
      await expect.poll(async () => (await page.locator('.result-line').innerText()) !== beforeResult).toBe(true);
      const after = await canvasSignature(page);
      expect(after.signature).not.toBe(before.signature);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      expect(errors).toEqual([]);
      expect(failed).toEqual([]);
    });
  }
}

test.describe('quantum candidates remain readable without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all six expose the complete teaching layer and a static phenomenon visual', async ({ page }) => {
    for (const entry of PAGES) {
      await page.goto(`/${entry.slug}.html`);
      await expect(page.locator('h1')).toContainText(entry.title);
      await expect(page.locator('.static-fallback')).toBeVisible();
      expect((await page.locator('main').innerText()).length).toBeGreaterThan(600);
    }
  });
});

test('standalone formula disclosures keep the shared symbol tooltip behavior', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const entry of PAGES) {
    await page.goto(`/${entry.slug}.html`);
    await page.locator('.formal-details summary').click();
    const symbol = page.locator('.formal-body .sym[data-tip]').first();
    await symbol.click();
    await expect(page.locator('.sym-tip')).toBeVisible();
    await expect(page.locator('.sym-tip')).toHaveText(await symbol.getAttribute('data-tip') ?? '');
    await expect(symbol).toHaveClass(/is-active/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
});
