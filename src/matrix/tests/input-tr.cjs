// Türkçe sayı/tarih girişi ve gösterimi
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const PORT = process.env.PORT || 8701;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => { if (m.text().startsWith('[matrix]')) console.log(m.text().slice(0, 400)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${PORT}/modules/matrix/index.html`);
  await page.waitForTimeout(3000);
  await page.evaluate(() => { window.__matrixDebug = true; });
  let box = null;
  for (const cv of await page.$$('canvas')) { const b = await cv.boundingBox(); if (b && (!box || b.width * b.height > box.width * box.height)) box = b; }
  await page.mouse.click(box.x + 80, box.y + 30);
  for (const t of ['1.234,5', '3,5', '15.01.2026', '%12', '12%', '1234.5', 'DOĞRU', '=A2*2', '=SUM(A1:A2)', '₺1.250,00', '1,5E3']) { await page.keyboard.type(t); await page.keyboard.press('Enter'); }
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const ws = window.__matrix.univerAPI.getActiveWorkbook().getActiveSheet();
    const out = [];
    for (let i = 0; i < 11; i++) { const rg = ws.getRange(i, 0); out.push([rg.getValue(), rg.getDisplayValue(), rg.getNumberFormat && rg.getNumberFormat()]); }
    return out;
  });
  console.log(JSON.stringify(r));
  await page.screenshot({ path: '/home/claude/src/matrix/tests/shots/input-tr.png', clip: { x: 0, y: 120, width: 600, height: 300 } });
  await browser.close();
})();
