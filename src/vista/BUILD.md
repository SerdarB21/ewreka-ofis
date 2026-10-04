# Ewreka Vista — derleme

Ewreka Vista, Ewreka Ofis'in sunu (PowerPoint/.pptx) modülüdür. PPTist (AGPL-3.0, Vue 3 + Vite)
projesinin değiştirilmiş bir çatalıdır — bkz. `NOTICE` ve `LICENSE`.

## Gereksinimler
- Node.js 18+ (22 ile test edildi), npm
- (İsteğe bağlı) Python 3 + Pillow — yalnızca şablonları yeniden yerelleştirmek için

## Derleme

`/path/to/project` örnek depo yoludur; kendi depo klasörünüzün tam yoluyla değiştirin.

```bash
cd /path/to/project/src/vista
npm install --ignore-scripts      # ilk kez
npm run build                     # vue-tsc tür denetimi + vite build
# ya da yalnızca paketleme (daha hızlı):
npm run build-only
```

Çıktı `../../ewreka-ofis/modules/vista/` klasörüne yazılır (`vite.config.ts` → `build.outDir`,
`base: './'`, kaynak haritası yok). Klasör her derlemede temizlenir.

Çıktı içeriği: `index.html`, `assets/` (tek JS + tek CSS), `mocks/` (8 yerel şablon JSON),
`imgs/tpl/` (şablon görselleri). `index.html`, kabuğu `../../shared/ewreka-shell.js` ile yükler.

## Geliştirme
`npm run dev` Vite geliştirme sunucusunu açar. Bu modda `../../shared/ewreka-shell.js` bulunamadığından
kabuk çubuğu görünmez; editör boş bir sunuyla açılır. Kabukla birlikte denemek için derleyip
`ewreka-ofis` kökünden statik sunucu çalıştırın:

```bash
npm run build-only
cd /path/to/project/ewreka-ofis && python3 -m http.server 8703
# http://localhost:8703/modules/vista/index.html?file=/test-files/vista-ornek.pptx
```

## Testler (Playwright)
Tarayıcılar `/opt/pw-browsers` altında kurulu olmalı. Sunucu 8703 portunda çalışırken:

```bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
node tests/e2e.mjs /tmp/vista-e2e      # aç → düzenle → Ctrl+S (pptx) → PNG zip → yazdır → sunu → yeni
node tests/pdf.mjs /tmp                 # PDF yazdırma görünümü (print medyası) → vista-yazdir.pdf
node tests/tour.mjs /tmp/vista-tour     # menü/panel ekran görüntüleri
node tests/templates.mjs /tmp           # 8 şablonun tüm slaytları
node tests/smoke.mjs                    # hızlı açılış + dış istek denetimi
node tests/new.mjs /tmp/vista-yeni      # boş sunu: yer tutucuya yazma, yeni slayt, geri al/yinele, kaydet
node tests/roundtrip43.mjs /tmp/43.pptx # 4:3 dosyanın boyut/yazı boyutu korunumu
```
Tüm testler, `localhost` dışındaki her ağ isteğini raporlar (beklenen: "yok").

## Türkçeleştirme araçları
- `npm run i18n-check` (`tools/i18n_extract.py`): `src/` içinde yorum dışında kalan Çince metin
  parçalarını listeler. Çıktı boş olmalıdır.
- `tools/zh_tr.txt` + `tools/i18n_apply.py`: Çince → Türkçe sözlük ve uygulayıcı. Üst kaynak (PPTist)
  güncellenirse yeni dosyalara uygulanabilir.
- `npm run localize-templates` (`tools/templates_localize.py`): `public/mocks/template_*.json`
  şablonlarının Çince örnek metinlerini Türkçe yer tutucularla, uzak (pexels) görsellerini
  `public/imgs/tpl/` altındaki yerel soyut görsellerle, Çince fontları sistem fontlarıyla değiştirir.
  Üst kaynaktaki özgün şablonlar `public/mocks/` içine kopyalanıp betik yeniden çalıştırılabilir.

## Önemli değişiklik noktaları
- `src/ewreka/shell.ts` — EwrekaShell entegrasyonu (onNew/onOpen/onSave/onPrint/onUndo/onRedo,
  "Sunuyu başlat" eylemi, kaydedilmemiş değişiklik takibi, PDF/PNG dışa aktarma).
- `src/ewreka/blank.ts` — yer tutuculu başlık slaytı ve "Başlık ve içerik" yeni slayt düzeni.
- `src/ewreka/RenderHost.vue`, `renderHost.ts` — PNG/PDF için tüm slaytları işleyen gizli yüzey.
- `src/ewreka/pptxPreprocess.ts` — PPTX içe aktarmadan önce asıl slayttan miras alınan madde
  işaretlerini açık hale getirir (pptxtojson bunları tanımıyor).
- `vite.config.ts` — pptxtojson 2.2.0 paragraf aralığı (spcPct) hatası için derleme zamanı yaması.
- `src/hooks/useExport.ts` — `exportPPTXData()` PPTX'i `Uint8Array` olarak döndürür (13,333 × 7,5 inç).
- `src/hooks/useImport.ts` — `importPPTXData(ArrayBuffer)`; tuval genişliği 1000 px'te sabit.
- `src/services/index.ts` — yalnızca yerel şablon JSON'larını okur; hiçbir uzak sunucu yok.
