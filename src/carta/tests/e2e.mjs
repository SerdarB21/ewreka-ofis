import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const OUT = '/home/claude/src/carta/tests/shots'; fs.mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:8704/modules/carta/index.html';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, acceptDownloads: true, locale: 'tr-TR' });
const page = await ctx.newPage();
const ext = [];
page.on('request', r => { const u = r.url(); if (!u.startsWith('http://localhost') && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('CONSOLE', m.type(), m.text().slice(0, 300)); });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
const step = async (n) => { await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };

await page.goto(base); await page.waitForTimeout(2500); await step('01-bos');
await page.goto(base + '?file=/test-files/carta-ornek.pdf'); await page.waitForTimeout(3000); await step('02-acik');
console.log('title', await page.title());
// sayfalar menüsü
await page.click('[data-action="pages"]'); await step('03-sayfalar-menu');
await page.click('text=Geçerli sayfayı sağa döndür'); await page.waitForTimeout(2500); await step('04-dondu');
console.log('dirty', await page.evaluate(() => EwrekaShell.dirty));
// araçlar -> filigran
await page.click('[data-action="tools"]'); await page.click('text=Filigran ekle…'); await page.waitForTimeout(400); await step('05-filigran-form');
await page.click('.carta-form button[type=submit]'); await page.waitForTimeout(3500); await step('06-filigran');
// sayfa numarası
await page.click('[data-action="tools"]'); await page.click('text=Sayfa numarası ekle…'); await page.click('.carta-form button[type=submit]'); await page.waitForTimeout(3500);
// metin notu ekle (FreeText)
await page.click('#editorFreeTextButton'); await page.waitForTimeout(300);
const box = await page.locator('.page[data-page-number="1"]').boundingBox();
await page.mouse.click(box.x + 150, box.y + 120); await page.waitForTimeout(400);
await page.keyboard.type('Ewreka Carta notu: ğüşıöç İĞÜŞÖÇ'); await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await step('07-not');
// kaydet
const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
const savePath = OUT + '/kaydedilen.pdf'; await dl.saveAs(savePath); console.log('saved', fs.statSync(savePath).size, 'name', dl.suggestedFilename());
await page.waitForTimeout(2500); await step('08-kaydedildi');
console.log('dirty after save', await page.evaluate(() => EwrekaShell.dirty));
// birleştir: dosya seçici
const [fc] = await Promise.all([page.waitForEvent('filechooser'), (async () => { await page.click('[data-action="tools"]'); await page.click('text=PDF birleştir (sona ekle)…'); })()]);
await fc.setFiles(['/home/claude/ewreka-ofis/test-files/carta-slaytlar.pdf']); await page.waitForTimeout(4000); await step('09-birlesti');
console.log('pages', await page.evaluate(() => PDFViewerApplication.pagesCount));
// küçük resimler
await page.click('#viewsManagerToggleButton'); await page.waitForTimeout(1500); await step('10-kucukresim');
// imza
await page.click('[data-action="sign"]'); await page.waitForTimeout(800); await step('11-imza');
await page.keyboard.press('Escape');
// yeni → hoş geldin (tarayıcı modunda confirm)
page.on('dialog', d => d.accept());
await page.click('.ew-bar [data-c="new"]'); await page.waitForTimeout(1500); await step('12-yeni');
// görüntüden PDF
const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('.cw-grid [data-a="images"]')]);
await fc2.setFiles(['/home/claude/ewreka-ofis/test-files/vista-test-img.png']); await page.waitForTimeout(3000); await step('13-gorunturden');
console.log('EXTERNAL', ext);
await browser.close();
