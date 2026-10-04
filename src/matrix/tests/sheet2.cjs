const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:8701/modules/matrix/index.html?file=/test-files/ornek.xlsx`);
  await page.waitForTimeout(3000);
  await page.getByText(process.argv[2] || 'Özet Ğ', { exact: true }).last().click();
  await page.waitForTimeout(800);
  console.log('dirty after tab switch:', await page.evaluate(() => window.EwrekaShell.dirty));
  await page.screenshot({ path: '/home/claude/src/matrix/tests/shots/' + (process.argv[3] || 'sheet2') + '.png', clip: { x: 0, y: 0, width: 900, height: 500 } });
  await browser.close();
})();
