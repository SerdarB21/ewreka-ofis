const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const t0 = Date.now();
  await page.goto(`http://localhost:8701/modules/matrix/index.html?file=/test-files/buyuk.xlsx`);
  await page.waitForFunction(() => window.EwrekaShell && window.EwrekaShell.name === 'buyuk.xlsx' && !document.querySelector('.ew-busy'), null, { timeout: 120000 });
  console.log('open ms', Date.now() - t0);
  await page.waitForTimeout(1000);
  console.log('E20001', await page.evaluate(() => window.__matrix.univerAPI.getActiveWorkbook().getActiveSheet().getRange('E20001').getValue()));
  const t1 = Date.now();
  const dl = page.waitForEvent('download');
  await page.click('.ew-bar [data-c="save"]');
  const d = await dl; await d.saveAs('/tmp/buyuk-out.xlsx');
  console.log('save ms', Date.now() - t1);
  await page.screenshot({ path: '/home/claude/src/matrix/tests/shots/perf.png' });
  await browser.close();
})();
