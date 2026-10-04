const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const PORT = process.env.PORT || 8701;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
  await page.goto(`http://localhost:${PORT}/modules/matrix/index.html?file=/test-files/ornek.xlsx`);
  await page.waitForTimeout(3500);
  await page.click('.ew-bar [data-c="print"]');
  await page.waitForTimeout(1200);
  const html = await page.evaluate(() => { const f = document.getElementById('matrix-print-frame'); return f ? f.contentDocument.documentElement.outerHTML : null; });
  console.log('print html length', html && html.length);
  const p2 = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await p2.setContent(html);
  await p2.screenshot({ path: '/home/claude/src/matrix/tests/shots/print-preview.png', fullPage: true });
  await p2.pdf({ path: '/tmp/print.pdf' });
  await browser.close();
})();
