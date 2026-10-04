// Arayüz turu: çeşitli panel ve menülerin ekran görüntüleri
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire('/opt/npm-tools/node_modules/')
const { chromium } = require('playwright')
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const external = []
page.on('request', r => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) external.push(u) })
page.on('pageerror', e => console.log('[pageerror]', e.message))
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 200)) })
await page.goto('http://localhost:8703/modules/vista/index.html?file=/test-files/vista-ornek.pptx')
await page.waitForFunction(() => window.__ewrekaVista && window.__ewrekaVista.slidesStore.slides.length >= 4)
await page.waitForTimeout(1200)
const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${n}.png` }) }
const esc = async () => { await page.keyboard.press('Escape'); await page.mouse.click(1300, 880); await page.waitForTimeout(300) }

// şablonlar
await page.click('.thumbnails .select-btn, .thumbnails .add-slide .select-btn').catch(async () => { await page.click('.add-slide >> .select-btn') })
await shot('t01-sablonlar')
await page.mouse.click(700, 880); await page.waitForTimeout(300)
// hamburger menü
await page.click('.editor-header-part.left .menu-item'); await shot('t02-menu')
await page.click('.popover-menu-item:has-text("Klavye kısayolları")'); await shot('t03-kisayollar')
await page.click('.drawer .close-btn'); await page.waitForTimeout(400)
// slayt 3: şekil seç
await page.click('.thumbnail-item >> nth=2'); await page.waitForTimeout(400)
await page.click('.canvas .editable-element-shape >> nth=0').catch(() => {})
await shot('t04-sekil-stil')
await page.click('.toolbar .tabs .tab >> nth=2').catch(() => {}); await shot('t05-animasyon')
await page.click('.canvas .editable-element-shape >> nth=0', { button: 'right' }).catch(() => {}); await shot('t06-sag-tik')
await page.keyboard.press('Escape'); await page.mouse.click(700, 160); await page.waitForTimeout(300)
// geçiş sekmesi
await page.click('.toolbar .tabs .tab >> nth=1').catch(() => {}); await shot('t07-gecis')
// ekle menüleri
await page.click('.add-element-handler .insert-handler-item >> nth=1 >> .arrow').catch(() => {}); await shot('t08-sekil-ekle')
await esc()
await page.click('.add-element-handler .insert-handler-item >> nth=4').catch(() => {}); await shot('t09-grafik')
await esc()
await page.click('.add-element-handler .insert-handler-item >> nth=6').catch(() => {}); await shot('t10-denklem')
await esc()
// tablo slaytı
await page.click('.thumbnail-item >> nth=3'); await page.waitForTimeout(400)
await page.click('.canvas .editable-element-table >> nth=0').catch(() => {}); await shot('t11-tablo')
// dışa aktarma
await page.click('.editor-header-part.right .menu-item >> nth=-1'); await shot('t12-disa-aktar')
await page.click('.export-dialog .tab >> nth=1').catch(() => {}); await shot('t13-disa-aktar-resim')
await esc()
// küçük resim sağ tık
await page.click('.thumbnail-item >> nth=0', { button: 'right' }); await shot('t14-kucuk-resim-menu')
await page.keyboard.press('Escape'); await page.mouse.click(700, 880)
// sunu araçları
await page.keyboard.press('F5'); await page.waitForTimeout(1200)
await page.mouse.move(60, 860); await page.waitForTimeout(600); await shot('t15-sunu-araclar')
await page.mouse.click(700, 400, { button: 'right' }); await shot('t16-sunu-sag-tik')
await page.keyboard.press('Escape'); await page.waitForTimeout(200)
await page.click('.tool-btn >> nth=3').catch(() => {}); await shot('t17-sunucu-gorunumu')
await page.keyboard.press('Escape'); await page.waitForTimeout(500)
console.log('DIŞ İSTEKLER:', external.length ? external : 'yok')
await browser.close()
