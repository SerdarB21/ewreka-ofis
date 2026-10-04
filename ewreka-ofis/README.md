# Ewreka Ofis

**Ewreka Digital** tarafından geliştirilen ücretsiz ve açık kaynak ofis paketi.

| Uygulama | Karşılığı | Dosya türleri | Motor |
|---|---|---|---|
| **Ewreka Nota** | Kelime işlemci | .docx | SuperDoc 1.47 (AGPL-3.0) |
| **Ewreka Matrix** | Elektronik tablo | .xlsx, .xlsm, .csv | Univer (Apache-2.0) + kendi ExcelJS köprümüz |
| **Ewreka Vista** | Sunum | .pptx | PPTist çatalı (AGPL-3.0) |
| **Ewreka Carta** | PDF görüntüleme/düzenleme | .pdf | Mozilla PDF.js (Apache-2.0) + pdf-lib (MIT) |

Masaüstü kabuğu Electron (MIT) ile yazılmıştır. Lisans: **GNU AGPL-3.0-only** (bkz. `LICENSE`).

## Klasör yapısı

```
ewreka-ofis/            Electron uygulaması (dağıtılan paket)
  main/                 ana süreç (pencereler, dosya aç/kaydet, menü, ewreka:// protokolü)
  launcher/             başlangıç ekranı
  shared/               ortak üst çubuk (ewreka-shell.js/.css) ve logolar
  modules/<modül>/      modüllerin DERLENMİŞ çıktıları (aşağıdaki kaynaklardan üretilir)
  build/                ikonlar, kurulum betiği (installer.nsh), lisans metinleri
src/nota, src/matrix, src/vista, src/carta   modül kaynak kodları (her birinde BUILD.md)
```

## Derleme

Gereken: Node.js 20+ (22 önerilir).

```bash
# 1) Modülleri derle (her biri çıktısını ewreka-ofis/modules/<modül> içine yazar)
cd src/nota   && npm ci && npm run build
cd ../matrix  && npm ci && npm run build
cd ../vista   && npm ci && npm run build
cd ../carta   && ./build.sh            # PDF.js'i indirir, Ewreka eklentileriyle birleştirir

# 2) Masaüstü uygulamasını çalıştır
cd ../../ewreka-ofis && npm ci && npm start

# 3) Kurulum dosyaları
npm run dist:win     # Windows: dist/EwrekaOfis-Kurulum-<sürüm>.exe (Linux'ta wine + wine32 gerekir)
npm run dist:mac     # macOS: bir Mac üzerinde çalıştırın (imza için Apple Developer kimliği)
```

Linux üzerinden Mac paketi üretmek için: `npx electron-builder --mac dir`, ardından
[rcodesign](https://github.com/indygreg/apple-platform-rs) ile `rcodesign sign "dist/mac-arm64/Ewreka Ofis.app"` (ad-hoc imza) ve `zip -qry -y` ile paketleme.

## Test

Her modül tarayıcıda da çalışır: `cd ewreka-ofis && python3 -m http.server 8080` →
`http://localhost:8080/modules/carta/index.html?file=/test-files/ornek.pdf`. Modül klasörlerindeki `tests/` dizinlerinde Playwright testleri vardır.

## Gizlilik

Uygulama hiçbir sunucuya veri göndermez; telemetri/analitik yoktur ve tüm bileşenler çevrimdışı çalışır.
