// Yeni belgede klavye ile düzenleme, doldurma tutamacı, geri al, kirli bayrağı, kaydetme
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const PORT = process.env.PORT || 8701;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) || m.text().startsWith('[matrix]')) console.log('[console.' + m.type() + ']', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${PORT}/modules/matrix/index.html`);
  await page.waitForTimeout(3000);
  await page.evaluate(() => { window.__matrixDebug = true; });
  const dirty = () => page.evaluate(() => window.EwrekaShell.dirty);
  console.log('dirty at start', await dirty());
  // seçim ve kaydırma kirli yapmamalı
  let box = null;
  for (const cv of await page.$$('canvas')) { const b = await cv.boundingBox(); if (b && (!box || b.width * b.height > box.width * box.height)) box = b; }
  console.log('canvas', box);
  // A1 hücresi: satır başlığı ~46px, sütun başlığı ~20px
  const cell = (c, r) => ({ x: box.x + 46 + 88 * c + 40, y: box.y + 20 + 20 * r + 10 });
  let p = cell(2, 4); await page.mouse.click(p.x, p.y);
  await page.mouse.wheel(0, 300); await page.waitForTimeout(300); await page.mouse.wheel(0, -300); await page.waitForTimeout(300);
  console.log('dirty after select/scroll', await dirty());
  p = cell(0, 0); await page.mouse.click(p.x, p.y);
  await page.keyboard.type('Ğüşİöç 123'); await page.keyboard.press('Enter');
  await page.keyboard.type('5'); await page.keyboard.press('Enter');
  await page.keyboard.type('=A2*10'); await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  console.log('dirty after typing', await dirty());
  // A3'ü A3:A6'ya doldur (doldurma tutamacı: hücrenin sağ alt köşesi)
  p = cell(0, 2); await page.mouse.click(p.x, p.y);
  const h = { x: box.x + 46 + 88 - 1, y: box.y + 20 + 20 * 3 - 1 };
  await page.mouse.move(h.x, h.y); await page.mouse.down();
  await page.mouse.move(h.x, h.y + 40, { steps: 5 }); await page.mouse.move(h.x, h.y + 61, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const vals = await page.evaluate(() => {
    const ws = window.__matrix.univerAPI.getActiveWorkbook().getActiveSheet();
    return ws.getRange('A1:A7').getValues().map((r) => r[0]).concat([ws.getRange('A4').getFormula?.()]);
  });
  console.log('values', JSON.stringify(vals));
  await page.screenshot({ path: '/home/claude/src/matrix/tests/shots/edit.png' });
  // geri al
  await page.evaluate(() => window.__matrix.univerAPI.undo()); await page.waitForTimeout(300);
  console.log('after undo A4:', await page.evaluate(() => window.__matrix.univerAPI.getActiveWorkbook().getActiveSheet().getRange('A4').getValue()));
  await page.evaluate(() => window.__matrix.univerAPI.redo()); await page.waitForTimeout(300);
  const snap = await page.evaluate(() => { const s = window.__matrix.univerAPI.getActiveWorkbook().save(); const sh = s.sheets[s.sheetOrder[0]]; return JSON.stringify(sh.cellData); });
  console.log('cellData', snap.slice(0, 800));
  const dl = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  const d = await dl; await d.saveAs('/tmp/edit.xlsx');
  await page.waitForTimeout(300);
  console.log('dirty after save', await dirty(), await d.suggestedFilename());
  await browser.close();
})();
