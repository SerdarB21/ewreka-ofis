// Dosyayı açar, durum bilgilerini yazdırır, Kaydet ile indirir.  node tests/roundtrip.cjs /test-files/ornek.xlsx out.xlsx [csv]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const PORT = process.env.PORT || 8701;
const [, , file, outPath, mode] = process.argv;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const external = [];
  page.on('request', (r) => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) external.push(u); });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[console.' + m.type() + ']', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${PORT}/modules/matrix/index.html?file=${encodeURIComponent(file)}`);
  await page.waitForTimeout(3500);
  const info = await page.evaluate(() => {
    const api = window.__matrix.univerAPI;
    const wb = api.getActiveWorkbook();
    const ws = wb.getActiveSheet();
    let notes = []; try { notes = ws.getNotes(); } catch (e) { notes = String(e); }
    return { dirty: window.EwrekaShell.dirty, sheets: wb.getSheets().map((s) => s.getSheetName()), active: ws.getSheetName(), notes,
      f8: ws.getRange('F8').getValue(), b10: ws.getRange('B10').getDisplayValue(), defined: wb.getDefinedNames().map((d) => d.getName() + '=' + d.getFormulaOrRefString()) };
  });
  console.log(JSON.stringify(info));
  if (outPath) {
    const dl = page.waitForEvent('download');
    if (mode === 'csv' || mode === 'csv-semicolon') {
      await page.evaluate(async (m) => { /* farklı kaydet menüsü */ }, mode);
      await page.click('.ew-bar [data-c="saveAs"]');
      await page.waitForTimeout(300);
      const items = await page.$$('.ew-menu button');
      await items[mode === 'csv' ? 1 : 2].click();
    } else {
      await page.click('.ew-bar [data-c="save"]');
    }
    const d = await dl;
    await d.saveAs(outPath);
    console.log('saved', outPath, await d.suggestedFilename());
    await page.waitForTimeout(300);
    console.log('dirty after save:', await page.evaluate(() => window.EwrekaShell.dirty));
  }
  console.log('external requests:', external.length ? external : 'none');
  await browser.close();
})();
