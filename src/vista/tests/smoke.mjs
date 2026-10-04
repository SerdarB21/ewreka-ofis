// Ewreka Vista hızlı duman testi: sayfayı aç, ekran görüntüsü al, ağ isteklerini kaydet
import { createRequire } from 'module'
const require = createRequire('/opt/npm-tools/node_modules/')
const { chromium } = require('playwright')
const url = process.argv[2] || 'http://localhost:8703/modules/vista/index.html'
const out = process.argv[3] || '/tmp/vista-smoke.png'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const external = []
page.on('request', r => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) external.push(u) })
page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('[console.' + m.type() + ']', m.text().slice(0, 300)) })
page.on('pageerror', e => console.log('[pageerror]', e.message))
await page.goto(url)
await page.waitForTimeout(2500)
await page.screenshot({ path: out })
console.log('external requests:', external)
await browser.close()
