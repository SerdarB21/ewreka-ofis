import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire('/opt/npm-tools/node_modules/')
const { chromium } = require('playwright')
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', e => console.log('[pageerror]', e.message))
await page.goto('http://localhost:8703/modules/vista/index.html?file=/test-files/vista-ornek.pptx')
await page.waitForFunction(() => window.__ewrekaVista && window.__ewrekaVista.slidesStore.slides.length >= 4)
await page.waitForTimeout(1200)
const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${n}.png` }) }
const clickTool = async (i) => { await page.locator('.add-element-handler > *').nth(i).click({ position: { x: 10, y: 10 } }).catch(e => console.log('x', i, e.message.slice(0, 80))) }
await page.click('.thumbnail-item >> nth=2'); await page.waitForTimeout(300)
await page.click('.canvas .editable-element-shape >> nth=0').catch(() => {})
await page.click('.toolbar .tab:has-text("Animasyon")').catch(() => {})
await page.click('button:has-text("Animasyon ekle")').catch(() => {}); await shot('u01-animasyon-havuzu')
await page.keyboard.press('Escape'); await page.mouse.click(700, 840); await page.waitForTimeout(300)
for (let i = 0; i < 9; i++) { await clickTool(i); await shot('u1' + i + '-arac'); await page.keyboard.press('Escape'); await page.mouse.click(700, 840); await page.waitForTimeout(300) }
await page.click('.left-handler .handler-item >> nth=2').catch(() => {}); await shot('u20-yorumlar')
await page.click('.left-handler .handler-item >> nth=3').catch(() => {}); await shot('u21-secim')
await page.click('.left-handler .handler-item >> nth=4').catch(() => {}); await shot('u22-bul')
await browser.close()
