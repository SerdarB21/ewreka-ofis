// 4:3 dosya boyutunun korunması: aç → kaydet
import { createRequire } from 'module'
const require = createRequire('/opt/npm-tools/node_modules/')
const { chromium } = require('playwright')
const browser = await chromium.launch()
const page = await (await browser.newContext({ acceptDownloads: true })).newPage()
await page.goto('http://localhost:8703/modules/vista/index.html?file=/test-files/vista-43.pptx')
await page.waitForFunction(() => window.__ewrekaVista && document.title.includes('vista-43'))
await page.waitForTimeout(1200)
const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')])
await dl.saveAs(process.argv[2])
console.log('ok', await page.evaluate(() => ({ ratio: window.__ewrekaVista.slidesStore.viewportRatio, w: window.__ewrekaVista.slidesStore.exportWidthIn })))
await browser.close()
