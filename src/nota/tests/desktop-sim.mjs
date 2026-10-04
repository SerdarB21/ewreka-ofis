// Masaüstü (Electron) köprüsü benzetimi: window.ewreka sahte köprüsüyle başlatma dosyası, kaydetme ve
// PDF dışa aktarma (printToPDF → Chromium Page.printToPDF, Electron ile aynı motor) sınanır.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const OUT = process.argv[2] || '/tmp/nota-desktop';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200)); });
const saves = [];
const launch = fs.readFileSync('/home/claude/ewreka-ofis/test-files/ornek.docx').toString('base64');
await page.exposeFunction('__simLaunch', () => launch);
await page.exposeFunction('__simSave', (opts) => { saves.push(opts); const p = path.join(OUT, opts.defaultName); fs.writeFileSync(p, Buffer.from(opts.b64, 'base64')); return { path: '/belgeler/' + opts.defaultName, name: opts.defaultName }; });
let pdfOpts = null;
await page.exposeFunction('__simPrintToPDF', async (o) => {
  pdfOpts = o;
  // Electron: webContents.printToPDF({ pageSize, margins, printBackground }) — CSS @page boyutu ile eşdeğer
  const buf = await page.pdf({ width: o.pageSize.width + 'in', height: o.pageSize.height + 'in', margin: { top: 0, bottom: 0, left: 0, right: 0 }, printBackground: true });
  return buf.toString('base64');
});
await page.addInitScript(() => {
  const b64ToU8 = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
  const u8ToB64 = (u) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const listeners = new Set();
  window.ewreka = {
    isDesktop: true, platform: 'win32',
    info: async () => ({ version: '1.0.0', electron: 'sim' }),
    getLaunchFile: async () => ({ name: 'ornek.docx', path: 'C:/belgeler/ornek.docx', data: b64ToU8(await window.__simLaunch()) }),
    openDialog: async () => null, openInApp: async () => null, readFile: async () => null,
    save: async (o) => window.__simSave({ ...o, data: undefined, b64: u8ToB64(o.data) }),
    setState: (s) => { window.__lastState = s; }, closeWindow: () => {}, openWindow: async () => {},
    recent: async () => [], removeRecent: async () => {}, openExternal: async () => {}, showInFolder: async () => {},
    confirm: async () => 0,
    printToPDF: async (o) => b64ToU8(await window.__simPrintToPDF(o)),
    getPathForFile: () => null,
    onCommand: (fn) => { listeners.add(fn); window.__sendCmd = (c) => { for (const f of listeners) f(c); }; return () => listeners.delete(fn); },
  };
});
await page.goto('http://localhost:8702/modules/nota/index.html');
await page.waitForFunction(() => document.body.classList.contains('nota-ready') && window.__nota.sd && window.__nota.sd.activeEditor, null, { timeout: 30000 });
await page.waitForTimeout(1000);
const st0 = await page.evaluate(() => window.__lastState);
console.log('state after launch', JSON.stringify(st0));

// düzenle → kaydet (yerel yol üzerine)
{ const b = await page.evaluate(() => { const l = [...document.querySelectorAll('.superdoc-page .superdoc-line')].find((x) => x.textContent.includes('Ortalanmış')); const r = l.getBoundingClientRect(); return { x: r.right - 2, y: r.y + r.height / 2 }; }); await page.mouse.click(b.x, b.y); await page.keyboard.press('End'); }
await page.keyboard.type(' Masaüstü sınaması.');
await page.waitForTimeout(400);
console.log('dirty', JSON.stringify(await page.evaluate(() => window.__lastState)));
// macOS menüsünden gelen geri al / yinele komutları
await page.evaluate(() => window.__sendCmd('undo'));
await page.waitForTimeout(200);
const undone = await page.evaluate(() => !window.__nota.sd.activeEditor.state.doc.textContent.includes('Masaüstü sınaması.'));
await page.evaluate(() => window.__sendCmd('redo'));
await page.waitForTimeout(200);
const redone = await page.evaluate(() => window.__nota.sd.activeEditor.state.doc.textContent.includes('Masaüstü sınaması.'));
console.log('undo via menu', undone, 'redo via menu', redone);
await page.keyboard.press('Control+s');
await page.waitForTimeout(1500);
console.log('save 1', JSON.stringify({ ...saves[0], b64: saves[0] && saves[0].b64.length }));

// PDF dışa aktar (Farklı kaydet menüsü)
await page.click('.ew-bar [data-c="saveAs"]');
await page.waitForTimeout(200);
await page.click('.ew-menu button:has-text("PDF olarak dışa aktar")');
await page.waitForFunction(() => !document.querySelector('.ew-busy'), null, { timeout: 30000 });
await page.waitForTimeout(800);
console.log('pdf opts', JSON.stringify(pdfOpts));
console.log('saves', saves.map((s) => [s.defaultName, s.export, s.path, s.b64.length]));
await page.screenshot({ path: path.join(OUT, 'desktop-after-pdf.png') });
const toasts = await page.evaluate(() => [...document.querySelectorAll('.ew-toast')].map((t) => t.innerText));
console.log('toasts', toasts);
console.log('title', await page.title());
await browser.close();
