const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const PORT = process.env.PORT || 8701;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[console.' + m.type() + ']', m.text().slice(0, 300)); });
  page.on('dialog', (d) => { console.log('dialog:', d.message()); d.accept(); });
  await page.goto(`http://localhost:${PORT}/modules/matrix/index.html?file=/test-files/ornek.xlsx`);
  await page.waitForTimeout(3000);
  const state = () => page.evaluate(() => { const wb = window.__matrix.univerAPI.getActiveWorkbook(); return { name: window.EwrekaShell.name, dirty: window.EwrekaShell.dirty, sheets: wb.getSheets().map((s) => s.getSheetName()), units: document.querySelectorAll('canvas').length }; });
  console.log('1', JSON.stringify(await state()));
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.ew-bar [data-c="open"]')]);
  await fc.setFiles('/home/claude/ewreka-ofis/test-files/excel-benzeri.xlsx');
  await page.waitForTimeout(2500);
  console.log('2', JSON.stringify(await state()));
  // sayfa ekle (+)
  await page.mouse.click(35, 881); await page.waitForTimeout(600);
  console.log('3 after add sheet', JSON.stringify(await state()));
  await page.click('.ew-bar [data-c="new"]'); await page.waitForTimeout(1500);
  console.log('4 after new', JSON.stringify(await state()));
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('.ew-bar [data-c="open"]')]);
  await fc2.setFiles('/home/claude/ewreka-ofis/test-files/utf8-virgul.csv');
  await page.waitForTimeout(2000);
  console.log('5 csv', JSON.stringify(await state()));
  await page.screenshot({ path: '/home/claude/src/matrix/tests/shots/reopen-csv.png', clip: { x: 0, y: 120, width: 700, height: 200 } });
  await browser.close();
})();
