import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const OUT = process.argv[2];
const b = await chromium.launch();
for (const w of [1440, 1100, 820]) {
  const page = await b.newPage({ viewport: { width: w, height: 700 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:8702/modules/nota/index.html?file=/test-files/ornek.docx');
  await page.waitForFunction(() => document.body.classList.contains('nota-ready') && window.__nota.sd?.activeEditor, null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/tb-${w}.png`, clip: { x: 0, y: 0, width: w, height: 140 } });
  const ov = await page.$('[data-item="btn-overflow"]');
  if (ov && await ov.isVisible()) { await ov.click(); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/tb-${w}-overflow.png`, clip: { x: 0, y: 0, width: w, height: 300 } }); }
  await page.close();
}
await b.close();
