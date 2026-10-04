// Hızlı ekran görüntüsü + konsol + uzak istek denetimi
// node tests/shot.mjs <url-path> <out.png> [bekleme ms] [js-ifadesi]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/npm-tools/node_modules/playwright');

const [, , path = '/modules/nota/index.html', out = 'shot.png', wait = '4000', evalJs] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const remote = [];
page.on('request', (r) => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) remote.push(u); });
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[console.' + m.type() + ']', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message, (e.stack||'').split('\n').slice(0,6).join(' | ')));
await page.goto('http://localhost:8702' + path);
await page.waitForTimeout(+wait);
if (evalJs) console.log('eval =>', JSON.stringify(await page.evaluate(evalJs), null, 1)?.slice(0, 4000));
await page.screenshot({ path: out });
console.log('remote requests:', remote);
await browser.close();
