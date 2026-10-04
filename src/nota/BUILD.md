# Ewreka Nota — derleme

Ewreka Ofis'in Word (.docx) modülü. Motor: **SuperDoc 1.47.1** (npm `superdoc`, AGPL-3.0).

> **Neden SuperDoc 2.x değil?** 2.x serisinin tamamı, `@superdoc/docx-engine` adlı **özel lisanslı** bir pakete
> bağımlı. O paketin lisansı yeniden dağıtımı (§3.1d), "rakip ürün" kullanımını ve yapay zekâ ile incelemeyi yasaklıyor;
> AGPL'li, dağıtılan bir masaüstü uygulamasıyla bağdaşmıyor. Bu yüzden tamamen AGPL-3.0 olan 1.x serisi
> (`legacy` etiketi, 1.47.1 — 2026-10-02) **tam sürüm olarak sabitlendi**. 2.x'e geçmeden önce
> `npm view superdoc@<sürüm> dependencies` ile `@superdoc/docx-engine` bağımlılığının hâlâ olup olmadığını denetleyin.

## Gereksinimler
- Node 20+ (22 ile sınandı), npm
- Python 3 + `python-docx` (yalnızca şablon/sınama belgesi üretmek için)

## Derleme
```bash
cd /home/claude/src/nota
npm ci                 # ya da npm install
npm run build          # → ../../ewreka-ofis/modules/nota/  (base './', kaynak haritası yok)
```
Çıktı yaklaşık 6,1 MB (ana paket ~5,9 MB, küçültülmüş). İnternet gerekmez; tüm varlıklar göreli yollarla yüklenir.
Küçültmesiz tanılama derlemesi: `NOTA_NOMINIFY=1 npx vite build`.

## Boş belge şablonu
`src/assets/blank.docx` derlemeye gömülüdür. Yeniden üretmek için:
```bash
python3 tools/make_blank_docx.py
```
SuperDoc'un kendi boş şablonundan (`tools/superdoc-blank-base.docx`, AGPL) türetilir: A4, 2,5 cm kenar boşlukları,
Calibri 11 / Calibri Light başlıklar, dil `tr-TR`, ondalık ayırıcı virgül. Her "Yeni" belgede belge kimliği (GUID) ve
oluşturma tarihi çalışma anında yenilenir (`src/docx-meta.js`).

## Kaynak yapısı
| Dosya | Görev |
|---|---|
| `index.html` | Sayfa iskeleti; `../../shared/ewreka-shell.js` klasik betik olarak yüklenir |
| `src/main.js` | SuperDoc kurulumu, EwrekaShell entegrasyonu (aç/kaydet/yazdır/geri al), dışa aktarımlar |
| `src/i18n-tr.js` | Türkçe arayüz: SuperDoc kancaları (toolbar texts, bul/değiştir, parola, sağ tık `menuProvider`) + MutationObserver tabanlı DOM çeviri katmanı (belge içeriğine dokunmaz) + Word stil adları |
| `src/net-guard.js` | fetch/XHR/sendBeacon/WebSocket için uzak istek engeli (telemetri zaten `telemetry: {enabled:false}` ile kapalı) |
| `src/fonts.js` | Sistem yazı tipi listesi (kurulu olanlar tuval ölçümüyle süzülür) |
| `src/print.js` | Sanal sayfaları sırayla çizdirip kopyalar → `#nota-print`; yazdırma CSS'i yalnızca sayfaları basar |
| `src/statusbar.js` | Durum çubuğu: Sayfa X / N, Sözcük sayısı (seçim / toplam), yakınlaştırma |
| `src/docx-meta.js` | JSZip ile paket meta verisi: "Superdoc*" özel özelliklerini siler, tarihleri günceller |
| `src/style.css` | Ewreka teması (Nota mavisi #4C8DFF, sarı odak), tuval, durum çubuğu, yazdırma CSS'i |

## Sınama
```bash
cd /home/claude/ewreka-ofis && python3 -m http.server 8702 &
cd /home/claude/src/nota
python3 tests/make_test_docs.py          # test-files/ornek.docx, uzun.docx
node tests/e2e.mjs /tmp/nota-e2e         # 24 denetim: aç, yaz, kaydet, yeniden aç, HTML/TXT, PDF, bul, zoom, boş belge, bozuk dosya, uzak istek yok
node tests/desktop-sim.mjs /tmp/nota-desk # sahte window.ewreka köprüsü: başlatma dosyası, yerinde kaydet, PDF dışa aktar, menüden geri al/yinele
node tests/collect-strings.mjs /tmp/s.json # tüm menüleri açıp çevrilmemiş metin arar
```
Playwright: `/opt/npm-tools/node_modules/playwright` (Chromium `/opt/pw-browsers`). Ekran görüntüleri: `tests/screenshots/`.
