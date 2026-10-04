// Kullanım: node tests/smoke.cjs [dosya-url-yolu] [ekran-adı]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const PORT = process.env.PORT || 8701;
const file = process.argv[2] || '';
const shot = process.argv[3] || 'smoke';
const OUT = process.env.SHOTS || '/home/claude/src/matrix/tests/shots';
(async () => {
  const browser = await chromium.launch({ executablePath: undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const external = [];
  page.on('request', (r) => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) external.push(u); });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[console.' + m.type() + ']', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const url = `http://localhost:${PORT}/modules/matrix/index.html` + (file ? `?file=${encodeURIComponent(file)}` : '');
  await page.goto(url);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/${shot}.png` });
  console.log('title:', await page.title());
  console.log('external requests:', external.length ? external : 'none');
  await browser.close();
})();
