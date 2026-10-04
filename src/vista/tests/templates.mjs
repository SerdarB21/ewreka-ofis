// Şablon galerisi: her şablonun tüm slaytlarını küçük boyutta tek görüntüde işler
import { createRequire } from 'module'
const require = createRequire('/opt/npm-tools/node_modules/')
const { chromium } = require('playwright')
const OUT = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1700, height: 1200 } })
const external = []
page.on('request', r => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) external.push(u) })
page.on('pageerror', e => console.log('[pageerror]', e.message))
await page.goto('http://localhost:8703/modules/vista/index.html')
await page.waitForFunction(() => window.__ewrekaVista && window.__ewrekaVista.slidesStore.slides.length >= 1)
await page.waitForTimeout(800)
for (let i = 1; i <= 8; i++) {
  await page.evaluate(async (i) => {
    const d = await (await fetch(`./mocks/template_${i}.json`)).json()
    const v = window.__ewrekaVista
    v.renderState.mode = ''
    v.slidesStore.setTheme(d.theme)
    v.slidesStore.setSlides(d.slides)
    await new Promise(r => setTimeout(r, 100))
    v.renderState.size = 270
    v.renderState.mode = 'image'
  }, i)
  await page.waitForTimeout(1500)
  await page.addStyleTag({ content: '.ew-render-host{left:0!important;top:0!important;z-index:99999!important;display:flex;flex-wrap:wrap;gap:6px;background:#888;width:1700px;padding:6px}' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/sablon-${i}.png`, fullPage: false })
}
console.log('external', external)
await browser.close()
