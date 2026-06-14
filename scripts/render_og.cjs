const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const root = path.resolve(__dirname, '..');
  const svg = fs.readFileSync(path.join(root, 'frontend/public/og-image.svg'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;padding:0;background:#05070d">${svg}</body></html>`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(root, 'frontend/public/og-image.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
