// Ewreka Vista uçtan uca test: aç → düzenle → kaydet (pptx) → PNG zip → sunu modu → ağ denetimi
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire('/opt/npm-tools/node_modules/')
const { chromium } = require('playwright')

const BASE = 'http://localhost:8703/modules/vista/index.html'
const OUT = process.argv[2] || '/tmp/vista-e2e'
fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await ctx.newPage()
const external = [], errors = []
page.on('request', r => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) external.push(u) })
page.on('console', m => { if (m.text().startsWith('ADD') || m.text().startsWith('SLIDES')) console.log('   >>', m.text().slice(0, 1200)); else if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
const log = (...a) => console.log('•', ...a)
const state = () => page.evaluate(() => {
  const v = window.__ewrekaVista
  return { slides: v.slidesStore.slides.length, title: document.title, ratio: v.slidesStore.viewportRatio, idx: v.slidesStore.slideIndex }
})

await page.goto(BASE + '?file=/test-files/vista-ornek.pptx')
await page.waitForFunction(() => window.__ewrekaVista && window.__ewrekaVista.slidesStore.slides.length >= 4, null, { timeout: 15000 })
await page.waitForTimeout(1500)
log('açıldı', await state())
await page.evaluate(() => {
  window.__ewrekaVista.snapshotStore.$onAction(({ name }) => { if (name === 'addSnapshot') console.error('ADD SNAPSHOT ' + new Error().stack.split('\n').slice(2, 12).join(' | ')) })
  window.__ewrekaVista.slidesStore.$onAction(({ name }) => { if (!['updateSlideIndex'].includes(name)) console.error('SLIDES ACTION ' + name) })
})
await page.screenshot({ path: `${OUT}/01-acilis.png` })

// 2. slayta geç
await page.click('.thumbnail-item >> nth=1')
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/02-slayt2.png` })

// başlık metnini düzenle
const titleEl = page.locator('.canvas .editable-element-text').first()
await titleEl.click()
await page.waitForTimeout(200)
await titleEl.locator('.ProseMirror').click()
await page.keyboard.press('End')
await page.keyboard.type(' — düzenlendi ğüşİ')
await page.waitForTimeout(400)
await page.mouse.click(700, 820)
await page.waitForTimeout(800)
log('düzenleme sonrası', await state())
await page.screenshot({ path: `${OUT}/03-duzenleme.png` })

// Kaydet (Ctrl+S) → indirme
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.keyboard.press('Control+s')])
const pptxPath = `${OUT}/kaydedilen.pptx`
await dl.saveAs(pptxPath)
await page.waitForTimeout(500)
log('kaydedildi', dl.suggestedFilename(), fs.statSync(pptxPath).size, 'bayt', await state())

// Farklı kaydet → PNG zip
await page.click('.ew-bar [data-c="saveAs"]')
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/04-farkli-kaydet-menu.png` })
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('.ew-menu button:has-text("PNG")')])
await dl2.saveAs(`${OUT}/slaytlar.zip`)
log('png zip', dl2.suggestedFilename(), fs.statSync(`${OUT}/slaytlar.zip`).size, await page.title())

// Dışa aktarma iletişim kutusu (Yazdır)
await page.click('.ew-bar [data-c="print"]')
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/05-yazdir.png` })
log('yazdır diyaloğu', await page.title())
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
const closeBtn = page.locator('.export-dialog .btn.close, .modal .close-btn').first()
if (await closeBtn.count()) await closeBtn.click().catch(() => {})
await page.waitForTimeout(300)

// Sunu modu
await page.click('.ew-bar [data-action="slideshow"]')
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/06-sunu.png` })
log('sunu', await page.title())
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/07-sunu-2.png` })
log('sunu ileri', await page.title())
await page.mouse.click(700, 450, { button: 'right' })
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/08-sunu-menu.png` })
log('sunu menü', await page.title())
await page.keyboard.press('Escape')
await page.keyboard.press('Escape')
await page.waitForTimeout(800)
log('sunu sonrası', await state())

// Yeni sunu
page.once('dialog', d => d.accept())
await page.click('.ew-bar [data-c="new"]')
await page.waitForTimeout(1200)
log('yeni', await state())
await page.screenshot({ path: `${OUT}/09-yeni.png` })

// Kaydedilen dosyayı yeniden aç (gidiş-dönüş)
fs.copyFileSync(pptxPath, '/home/claude/ewreka-ofis/test-files/vista-kaydedilen.pptx')
await page.goto(BASE + '?file=/test-files/vista-kaydedilen.pptx')
await page.waitForFunction(() => window.__ewrekaVista && window.__ewrekaVista.slidesStore.slides.length >= 4, null, { timeout: 15000 })
await page.waitForTimeout(1200)
await page.click('.thumbnail-item >> nth=1'); await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/10-yeniden-acilis.png` })
log('yeniden açıldı', await state())

console.log('DIŞ İSTEKLER:', external.length ? external : 'yok')
console.log('KONSOL HATALARI:', errors.length ? errors : 'yok')
await browser.close()
