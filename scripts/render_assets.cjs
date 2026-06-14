// Regenerate raster assets from their SVG sources via Playwright Chromium.
//   - og-image.png        (1200x630) social card, from og-image.svg
//   - apple-touch-icon.png (180x180) iOS home-screen icon, from favicon.svg
//   - icon-192.png / icon-512.png   PWA manifest icons, from favicon.svg
// Social platforms + iOS reject/ignore SVG for these slots, so we ship PNGs.
// Run: node scripts/render_assets.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'frontend/public');

async function render(page, svgPath, outPath, w, h, bg) {
  const svg = fs.readFileSync(svgPath, 'utf8');
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;padding:0;background:${bg}">` +
    `<div style="width:${w}px;height:${h}px">${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}</div></body></html>`,
    { waitUntil: 'networkidle' });
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('wrote', path.relative(ROOT, outPath));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await render(page, path.join(PUB, 'og-image.svg'), path.join(PUB, 'og-image.png'), 1200, 630, '#05070d');
  await render(page, path.join(PUB, 'favicon.svg'), path.join(PUB, 'apple-touch-icon.png'), 180, 180, '#051424');
  await render(page, path.join(PUB, 'favicon.svg'), path.join(PUB, 'icon-192.png'), 192, 192, '#051424');
  await render(page, path.join(PUB, 'favicon.svg'), path.join(PUB, 'icon-512.png'), 512, 512, '#051424');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
