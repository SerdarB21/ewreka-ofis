// Ewreka Nota uçtan uca sınama: aç, yaz, kaydet (indir), yazdır/PDF, boş belge
// node tests/e2e.mjs <çıktı-klasörü>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/npm-tools/node_modules/playwright');

const OUT = process.argv[2] || '/tmp/nota-e2e';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8702/modules/nota/index.html';
const results = [];
const ok = (name, cond, info = '') => { results.push({ name, ok: !!cond, info }); console.log(cond ? 'PASS' : 'FAIL', name, info); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, locale: 'tr-TR' });
const remote = [];
const errors = [];
ctx.on('request', (r) => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) remote.push(u); });

async function newPage(q) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors.push(m.text()); console.log('[console.error]', m.text().slice(0, 200)); } });
  await page.goto(BASE + (q || ''));
  await page.waitForFunction(() => document.body.classList.contains('nota-ready') && window.__nota && window.__nota.sd && window.__nota.sd.activeEditor, null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  return page;
}

async function clickText(page, text, where = 'end') {
  // sayfadaki bir metin satırına tıkla
  const box = await page.evaluate(({ text }) => {
    const lines = [...document.querySelectorAll('.superdoc-page .superdoc-line')];
    const l = lines.find((x) => x.textContent.includes(text));
    if (!l) return null;
    const r = l.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, { text });
  if (!box) return false;
  await page.mouse.click(where === 'end' ? box.x + box.w - 2 : box.x + 3, box.y + box.h / 2);
  await page.waitForTimeout(150);
  if (where === 'end') await page.keyboard.press('End');
  return true;
}

async function saveVia(page, file) {
  const dl = page.waitForEvent('download', { timeout: 20000 });
  await page.keyboard.press('Control+s');
  const d = await dl;
  await d.saveAs(file);
  return d.suggestedFilename();
}

// ---------- 1) örnek belgeyi aç ----------
let page = await newPage('?file=/test-files/ornek.docx');
await page.screenshot({ path: path.join(OUT, '01-ornek-acik.png') });
let title = await page.title();
ok('açılışta kirli değil', !title.startsWith('•'), title);
const info1 = await page.evaluate(() => ({ pages: document.querySelectorAll('.superdoc-page').length, status: document.getElementById('nota-status').innerText.replace(/\s+/g, ' ') }));
ok('sayfalar çizildi', info1.pages >= 2, JSON.stringify(info1));
ok('durum çubuğu sözcük sayısı', /Sözcük: \d+/.test(info1.status), info1.status);
ok('marka sızıntısı yok', !(await page.evaluate(() => /superdoc/i.test(document.body.innerText))), '');

// yaz
ok('satıra tıklandı', await clickText(page, 'Ortalanmış paragraf'));
await page.keyboard.type(' Eklenen metin: ğüşıöç İĞÜŞÖÇ.');
await page.waitForTimeout(500);
title = await page.title();
ok('yazınca kirli', title.startsWith('•'), title);
await page.keyboard.press('Enter');
await page.keyboard.type('Yeni paragraf satırı');
await page.waitForTimeout(900); // geçmiş gruplaması ayrı adım olsun
// geri al / yinele
await page.keyboard.type('X');
await page.waitForTimeout(150);
await page.evaluate(() => window.__nota.sd.activeEditor.commands.undo());
await page.waitForTimeout(200);
const afterUndo = await page.evaluate(() => window.__nota.sd.activeEditor.state.doc.textContent.endsWith('X'));
ok('geri al çalışıyor', !afterUndo);
await page.screenshot({ path: path.join(OUT, '02-yazildi.png') });

const saved1 = path.join(OUT, 'kaydedilen-ornek.docx');
const name1 = await saveVia(page, saved1);
ok('kaydet indirdi', fs.existsSync(saved1) && fs.statSync(saved1).size > 1000, name1 + ' ' + (fs.existsSync(saved1) ? fs.statSync(saved1).size : 0));
await page.waitForTimeout(300);
title = await page.title();
ok('kaydedince kirli temizlendi', !title.startsWith('•'), title);

// HTML ve düz metin dışa aktarımı (Farklı kaydet menüsü)
for (const [label, ext] of [['Web sayfası (HTML)', 'html'], ['Düz metin', 'txt']]) {
  await page.click('.ew-bar [data-c="saveAs"]');
  await page.waitForTimeout(200);
  const dl = page.waitForEvent('download', { timeout: 15000 });
  await page.click(`.ew-menu button:has-text("${label}")`);
  const d = await dl; const f = path.join(OUT, 'disa-aktar.' + ext); await d.saveAs(f);
  const txt = fs.readFileSync(f, 'utf8');
  ok(`dışa aktar ${ext}`, txt.includes('Eklenen metin') && txt.includes('Giriş'), f + ' ' + txt.length + 'B');
}

// yazdırma hazırlığı + Chromium PDF (Electron printToPDF ile aynı motor)
const prep = await page.evaluate(async () => { const r = await window.__nota.preparePrint(); document.body.classList.add('nota-printing'); return r; });
ok('yazdırma sayfaları toplandı', prep.count >= 2, JSON.stringify(prep));
await page.emulateMedia({ media: 'print' });
await page.screenshot({ path: path.join(OUT, '03-yazdirma-gorunumu.png'), fullPage: false });
const pdfPath = path.join(OUT, 'yazdir.pdf');
await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
await page.evaluate(() => { window.__nota.cleanupPrint(); document.body.classList.remove('nota-printing'); });
ok('PDF üretildi', fs.statSync(pdfPath).size > 5000, fs.statSync(pdfPath).size + 'B');

// Bul düğmesi
await page.click('.ew-bar [data-action="find"]');
await page.waitForTimeout(600);
const findOpen = await page.evaluate(() => !!document.querySelector('.sd-find-replace__input'));
ok('Bul düğmesi arama kutusunu açar', findOpen);
if (findOpen) {
  await page.keyboard.type('madde');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '04-bul.png') });
  const cnt = await page.evaluate(() => document.querySelector('.sd-surface-floating')?.innerText || '');
  ok('arama sonuç sayısı Türkçe', /\d+ \/ \d+|Sonuç yok/.test(cnt), cnt.replace(/\s+/g, ' '));
  await page.keyboard.press('Escape');
}
// yakınlaştırma
await page.click('#nota-status [data-k="in"]');
await page.waitForTimeout(500);
const z = await page.evaluate(() => [window.__nota.sd.getZoom(), document.querySelector('#nota-status [data-k="pct"]').textContent]);
ok('yakınlaştırma', z[0] === 110 && z[1] === '%110', JSON.stringify(z));
await page.click('#nota-status [data-k="pct"]');
await page.close();

// ---------- 2) kaydedileni yeniden aç ----------
fs.copyFileSync(saved1, '/home/claude/ewreka-ofis/test-files/_kaydedilen.docx');
page = await newPage('?file=/test-files/_kaydedilen.docx');
const reopened = await page.evaluate(() => window.__nota.sd.activeEditor.state.doc.textContent);
ok('kaydedilen yeniden açıldı', reopened.includes('Eklenen metin: ğüşıöç İĞÜŞÖÇ.') && reopened.includes('Yeni paragraf satırı'));
await page.screenshot({ path: path.join(OUT, '05-yeniden-acildi.png') });
await page.close();

// ---------- 3) uzun belge: sanal sayfalar + yazdırma ----------
page = await newPage('?file=/test-files/uzun.docx');
const total = await page.evaluate(() => window.__nota.state.totalPages);
await page.evaluate(() => { const c = document.getElementById('nota-canvas'); c.scrollTop = c.scrollHeight * 0.6; });
await page.waitForTimeout(800);
const st = await page.evaluate(() => document.querySelector('#nota-status [data-k="page"]').textContent);
ok('kaydırınca sayfa bilgisi güncellenir', !/^Sayfa 1 \//.test(st), st + ' toplam=' + total);
await page.screenshot({ path: path.join(OUT, '06-uzun-kaydirildi.png') });
const prep2 = await page.evaluate(async () => window.__nota.preparePrint());
ok('uzun belgede tüm sayfalar yazdırmaya alındı', prep2.count === total, JSON.stringify(prep2) + ' toplam=' + total);
await page.emulateMedia({ media: 'print' });
const pdf2 = path.join(OUT, 'uzun.pdf');
await page.pdf({ path: pdf2, preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
await page.close();

// ---------- 4) boş yeni belge ----------
page = await newPage('');
await page.screenshot({ path: path.join(OUT, '07-bos-belge.png') });
const tb = await page.evaluate(() => { const lab = (sel) => { const e = document.querySelector(sel); if (!e) return ''; const i = e.querySelector('input'); return (i && i.value) || [...e.querySelectorAll('.sd-button-label, .button-label')].map((x) => x.textContent).join(' ') || e.textContent; }; return [lab('[data-item="btn-fontFamily"]'), lab('[data-item="btn-fontSize"]')]; });
ok('boş belge varsayılanı Calibri 11', /Calibri/.test(tb[0] || '') && /11/.test(tb[1] || ''), JSON.stringify(tb));
await page.mouse.click(700, 300);
await page.keyboard.type('Merhaba dünya! Ewreka Nota ile yazılmış İlk Belge.');
await page.keyboard.press('Enter');
await page.keyboard.press('Control+b');
await page.keyboard.type('Kalın satır');
await page.waitForTimeout(400);
ok('boş belgede yazınca kirli', (await page.title()).startsWith('•'));
await page.screenshot({ path: path.join(OUT, '08-bos-yazildi.png') });
const saved2 = path.join(OUT, 'yeni-belge.docx');
const n2 = await saveVia(page, saved2);
ok('yeni belge kaydedildi', fs.statSync(saved2).size > 1000, n2);
await page.close();

// ---------- 5) bozuk dosya ----------
fs.writeFileSync('/home/claude/ewreka-ofis/test-files/_bozuk.docx', 'bu bir docx değil');
page = await newPage('?file=/test-files/_bozuk.docx');
await page.waitForTimeout(500);
const toast = await page.evaluate(() => document.querySelector('.ew-toast')?.innerText || '');
ok('bozuk dosya için Türkçe hata', /açılamadı/.test(toast), toast);
await page.close();

ok('uzak (localhost dışı) istek yok', remote.length === 0, remote.join(', '));
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, errors, remote }, null, 1));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} geçti; sayfa hataları: ${errors.length}`);
await browser.close();
