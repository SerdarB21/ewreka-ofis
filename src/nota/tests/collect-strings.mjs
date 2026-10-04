// Arayüzdeki çevrilmemiş (ASCII-İngilizce görünen) metinleri toplar: her açılır menüyü açar, sağ tık menüsü vb.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const OUT = process.argv[2] || '/tmp/strings.json';
const SHOTDIR = process.argv[3] || null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:8702/modules/nota/index.html?file=/test-files/ornek.docx');
await page.waitForTimeout(4500);

const found = new Map();
async function harvest(tag) {
  const items = await page.evaluate(() => {
    const out = [];
    const skip = (el) => el.closest('.superdoc-page, .ProseMirror, [contenteditable="true"], .ew-bar, .ew-modal-bg');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue.trim();
      if (!t || !/[A-Za-z]{2,}/.test(t)) continue;
      const el = n.parentElement;
      if (!el || skip(el)) continue;
      out.push(['text', t, el.className && String(el.className).slice(0, 60)]);
    }
    document.querySelectorAll('[title],[aria-label],[placeholder],[data-tooltip]').forEach((el) => {
      if (skip(el)) return;
      for (const a of ['title', 'aria-label', 'placeholder', 'data-tooltip']) {
        const v = el.getAttribute(a);
        if (v && /[A-Za-z]{2,}/.test(v)) out.push([a, v, String(el.className).slice(0, 60)]);
      }
    });
    return out;
  });
  for (const [k, v, c] of items) {
    const key = k + '|' + v;
    if (!found.has(key)) found.set(key, { kind: k, value: v, cls: c, where: tag });
  }
}

await harvest('initial');
// her araç çubuğu öğesinin üzerine gel (ipuçları) ve tıkla (açılır menüler)
const items = await page.$$('#nota-toolbar [data-item^="btn-"]');
console.log('toolbar items', items.length);
const names = await page.$$eval('#nota-toolbar [data-item^="btn-"]', (els) => els.map((e) => e.getAttribute('data-item')));
console.log(names.join(' '));
// metnin bir kısmını seç
async function selectSomeText() {
  const run = await page.$('.superdoc-page .superdoc-line');
  if (run) { const b = await run.boundingBox(); await page.mouse.click(b.x + 30, b.y + b.height / 2); await page.mouse.click(b.x + 30, b.y + b.height / 2, { clickCount: 2 }); }
}
for (const name of names) {
  try {
    const el = await page.$(`#nota-toolbar [data-item="${name}"]`);
    if (!el || !(await el.isVisible())) continue;
    await el.hover(); await page.waitForTimeout(700); await harvest('hover:' + name);
    await selectSomeText();
    await el.click({ timeout: 1500 }); await page.waitForTimeout(500);
    await harvest('click:' + name);
    if (SHOTDIR) await page.screenshot({ path: `${SHOTDIR}/dd-${name}.png` });
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  } catch (e) { console.log('skip', name, e.message.split('\n')[0]); }
}
// tabloya sağ tıkla
const cell = await page.$('.superdoc-table-fragment');
if (cell) { const b = await cell.boundingBox(); await page.mouse.click(b.x + 20, b.y + 8, { button: 'right' }); await page.waitForTimeout(600); await harvest('ctx:table'); if (SHOTDIR) await page.screenshot({ path: `${SHOTDIR}/ctx-table.png` }); await page.keyboard.press('Escape'); }
const line = await page.$('.superdoc-page .superdoc-line');
if (line) { const b = await line.boundingBox(); await page.mouse.click(b.x + 20, b.y + 4, { button: 'right' }); await page.waitForTimeout(600); await harvest('ctx:text'); if (SHOTDIR) await page.screenshot({ path: `${SHOTDIR}/ctx-text.png` }); await page.keyboard.press('Escape'); }
// slash menu
if (line) { const b = await line.boundingBox(); await page.mouse.click(b.x + 2, b.y + 4); await page.keyboard.press('End'); await page.keyboard.press('Enter'); await page.keyboard.type('/'); await page.waitForTimeout(600); await harvest('slash'); if (SHOTDIR) await page.screenshot({ path: `${SHOTDIR}/slash.png` }); await page.keyboard.press('Escape'); }
// Ctrl+F
await page.keyboard.press('Control+f'); await page.waitForTimeout(600); await harvest('find'); if (SHOTDIR) await page.screenshot({ path: `${SHOTDIR}/find.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('Control+h'); await page.waitForTimeout(600); await harvest('replace');
await page.keyboard.press('Escape');
// link
await selectSomeText(); await page.keyboard.press('Control+k'); await page.waitForTimeout(600); await harvest('link'); if (SHOTDIR) await page.screenshot({ path: `${SHOTDIR}/link.png` });

const fs = await import('node:fs');
fs.writeFileSync(OUT, JSON.stringify([...found.values()], null, 1));
console.log('strings:', found.size);
await browser.close();
