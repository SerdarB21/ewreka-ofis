// Arayüz turu: şerit sekmeleri, bağlam menüsü, sayfa sekmesi menüsü, bul/değiştir, sayı biçimi
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const PORT = process.env.PORT || 8701;
const OUT = '/home/claude/src/matrix/tests/shots';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[console.' + m.type() + ']', m.text().slice(0, 200)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${PORT}/modules/matrix/index.html?file=/test-files/ornek.xlsx`);
  await page.waitForTimeout(3500);
  const shot = async (n, clip) => page.screenshot({ path: `${OUT}/${n}.png`, clip });
  await shot('tour-start');
  for (const tab of ['Ekle', 'Formüller', 'Veri', 'Görünüm']) {
    const el = page.getByText(tab, { exact: true }).first();
    if (await el.count()) { await el.click(); await page.waitForTimeout(400); await shot('tour-tab-' + tab, { x: 0, y: 48, width: 1440, height: 110 }); }
    else console.log('tab not found', tab);
  }
  await page.getByText('Giriş', { exact: true }).first().click();
  // bağlam menüsü
  let box = null;
  for (const cv of await page.$$('canvas')) { const b = await cv.boundingBox(); if (b && (!box || b.width * b.height > box.width * box.height)) box = b; }
  await page.mouse.click(box.x + 300, box.y + 120, { button: 'right' });
  await page.waitForTimeout(500);
  await shot('tour-context');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  // sayfa sekmesi menüsü
  await page.getByText('Satışlar', { exact: true }).last().click({ button: 'right' });
  await page.waitForTimeout(500);
  await shot('tour-sheetmenu');
  await page.keyboard.press('Escape'); await page.mouse.click(box.x + 600, box.y + 300); await page.waitForTimeout(200);
  // bul / değiştir
  await page.keyboard.press('Control+f'); await page.waitForTimeout(600);
  await shot('tour-find');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  console.log('univer text in DOM:', await page.evaluate(() => (document.body.innerText.match(/univer/gi) || []).length));
  await browser.close();
})();
