# Ewreka Matrix — derleme notları

Ewreka Ofis'in tablo modülü (Excel alternatifi). Motor: **Univer** açık kaynak sürümü (Apache-2.0,
yalnızca `@univerjs/*` paketleri — `@univerjs-pro/*` KULLANILMAZ). Dosya köprüsü: **ExcelJS** (MIT) + **fflate** (MIT).

## Derleme

```bash
cd /home/claude/src/matrix
npm ci            # ya da npm install (sürümler package.json'da sabit: Univer 1.0.3, ExcelJS 4.4.0)
npm run build     # = node scripts/build-locale.mjs && vite build
```

Çıktı: `/home/claude/ewreka-ofis/modules/matrix/` (`base: './'`, kaynak haritası yok, ~8.2 MB).
`index.html` önce `../../shared/ewreka-shell.js` dosyasını klasik betik olarak yükler, ardından modülü.

| Parça | Boyut | Not |
|---|---|---|
| `assets/univer-*.js` | ~7.4 MB (gzip ~1.9 MB) | Univer + React + RxJS (tüm açık kaynak eklentiler) |
| `assets/exceljs-*.js` | ~0.86 MB | ExcelJS + fflate, yalnızca dosya açılırken/kaydedilirken yüklenir |
| `assets/index-*.js` | ~90 KB | Modül kodu + Türkçe dil paketi |
| `assets/univer-*.css` | ~128 KB | |

## Kaynak yapısı

```
src/main.js            Univer kurulumu, kabuk (EwrekaShell) bağlantısı, değişiklik izleme, yükle/kaydet
src/xlsx-import.js     .xlsx/.xlsm -> Univer IWorkbookData (ExcelJS)
src/xlsx-export.js     Univer anlık görüntüsü -> .xlsx (ExcelJS)
src/xlsx-normalize.js  ExcelJS'in okuyamadığı paket düzenlerini (openpyxl/LibreOffice notları) düzeltir (fflate)
src/xlsx-common.js     birim dönüşümleri, hizalama/kenarlık eşlemeleri, _xlfn. önekleri, A1 yardımcıları
src/cf.js              koşullu biçimlendirme içe/dışa aktarma
src/colors.js          tema renkleri + ton (tint), dizinli palet, CSS <-> ARGB
src/csv.js             CSV içe aktarma (ayırıcı/kodlama algılama) ve dışa aktarma
src/print.js           etkin sayfanın kullanılan alanını HTML tablosu olarak gizli iframe'de yazdırma
src/input-tr.js        Türkçe veri girişi kancası (15.01.2026 tarih, 3,5 ve 1.234,56 sayı)
src/icons.js           ₺ simgesi (araç çubuğundaki para birimi düğmesi)
src/theme.js           Ewreka teması (birincil renk Matrix yeşili #2ECC8A)
src/defaults.js        boş çalışma kitabı (Sayfa1, 1000x26, Calibri 11), yazı tipi listesi
src/locale/index.js    en-US paketleri + Türkçe çeviri derin birleştirme
src/locale/tr-TR.json  ÜRETİLİR (scripts/build-locale.mjs) — elle düzenlemeyin
locale-src/tr-*.json   çeviri sözlüğü: "İngilizce metin": "Türkçe" ve yola özel "@anahtar.yolu": "..."
scripts/build-locale.mjs  dil paketini üretir, eksik çevirileri listeler
scripts/vite-univer-patches.js  Univer'e derleme zamanı yamaları (eşleşmezse uyarı verir)
tests/                 Playwright + openpyxl testleri ve ekran görüntüleri (tests/shots/)
```

## Univer'e uygulanan yamalar (scripts/vite-univer-patches.js)

1. `sheets-numfmt`: en-US para birimi `$` → `₺`, araç çubuğu simgesi `DollarIcon` → `LiraIcon`.
2. `core`: varsayılan yazı tipi `Arial` → `Calibri` (yoksa Helvetica/Arial'a düşer).
3. `engine-render`: Docs'a ait 70+ dilin heceleme sözlükleri paketten çıkarıldı (~5 MB), yalnızca `tr` kaldı.

Univer sürümü yükseltilirse `npm run build` çıktısında `Univer yaması uygulanamadı` uyarısı olup olmadığına bakın.

## Dil (Türkçe)

Univer'de tr-TR paketi yok. `scripts/build-locale.mjs` kullanılan tüm eklentilerin (core, filter, sort,
conditional-formatting, data-validation, find-replace, hyper-link, note) en-US paketlerini düzleştirir,
`locale-src/tr-*.json` sözlüğünü uygular → 1214 metin çevrilir (araç çubuğu, menüler, bağlam menüleri,
iletişim kutuları, sayfa sekmesi menüsü, formül çubuğu, durum çubuğu, bul/değiştir, sıralama/filtre,
koşullu biçimlendirme, veri doğrulama, bağlantı, not paneli). Bilinçli olarak İngilizce bırakılanlar:
**işlev adları** (SUM, IF… — formüller Excel'in İngilizce sözdizimiyle yazılır, dosyada da böyle saklanır),
işlev açıklamaları/parametre yardımları (~4800 metin) ve emoji adları. Paket Univer'e `LocaleType.EN_US`
anahtarıyla verilir (içerik Türkçe), çünkü Univer'in bölgeye bağlı mantığı yalnızca bilinen anahtarları tanır.

Sayı gösterimi: Univer'in "tr" sayı biçimlendirmesi yarım olduğundan (genel biçimde ondalık "." kalıyor,
"1234.5" girişi 12345 okunuyor) gösterim en-US ayırıcılarıyla yapılır (1,234.56). Türkçe giriş
`src/input-tr.js` ile desteklenir: `15.01.2026`, `15/01/2026 14:30` → tarih (dd.mm.yyyy biçimi),
`3,5` / `0,125` / `1.234,56` → sayı. (`1,234` İngilizce binlik olarak 1234 okunur.)

## Dosya biçimleri

* **xlsx/xlsm içe aktarma**: tüm sayfalar (ad, sıra, gizli durum, sekme rengi), değerler (metin, sayı, mantıksal,
  tarih → seri numarası + tarih biçimi, hata), formüller (önbellek değeriyle; paylaşılan formüller ExcelJS ile
  hücre başına çözülür; `_xlfn.`/`_xlws.` önekleri kaldırılır; dizi formülleri), sayı biçimleri, yazı tipi
  (ad/boyut/kalın/italik/altı çizili/üstü çizili/renk/üst-alt simge), dolgular (tema rengi + ton dahil),
  kenarlıklar (13 stil + çaprazlar), yatay/dikey hizalama, metni kaydır, sığdırmak için daralt, döndürme,
  girinti, birleştirmeler, sütun genişlikleri (karakter → px, MDW=7), satır yükseklikleri (pt → px),
  gizli satır/sütunlar, donmuş bölmeler, kılavuz çizgileri, yakınlaştırma, etkin sayfa, zengin metin,
  köprüler (dış ve sayfa içi), notlar (yorumlar), otomatik filtre aralığı, veri doğrulama (liste, tam sayı,
  ondalık, tarih, metin uzunluğu, özel), koşullu biçimlendirme (simge kümeleri hariç), tanımlı adlar.
* **xlsx dışa aktarma**: aynı özellikler; formüller formül olarak, hesaplanmış sonuçlarıyla yazılır;
  Excel 2010+ işlevleri `_xlfn.` önekiyle (XLOOKUP, IFS, CONCAT, TEXTJOIN, FILTER…); Univer'in paylaşılan
  formülleri (`si`, doldurma tutamacıyla oluşur) `LexerTreeBuilder.moveFormulaRefOffset` ile hücre başına açılır.
* **CSV içe aktarma**: ayırıcı `,` `;` sekme `|` otomatik; UTF-8 (BOM'lu/BOM'suz), UTF-16, UTF-8 değilse
  windows-1254 (Türkçe). `;` ayırıcılı dosyalarda Türkçe sayılar (1.234,56; %12), dd.mm.yyyy ve ISO tarihler
  tanınır; baştaki sıfırlı ve 16+ haneli değerler metin kalır; `=` ile başlayan hücreler formül olarak
  çalıştırılmaz (CSV enjeksiyonuna karşı metin olarak kalır).
* **CSV dışa aktarma** (etkin sayfa, UTF-8 BOM'lu, CRLF): iki seçenek —
  `CSV (virgülle ayrılmış, UTF-8)` varsayılan, ondalık `.`; `CSV (noktalı virgülle ayrılmış, Türkçe Excel)`
  ondalık `,` — Türkçe bölge ayarlı Excel çift tıklamayla doğrudan sütunlara ayırır. Tarih biçimli hücreler
  görüntülendiği gibi, diğer sayılar ham değer olarak yazılır.

## Test

```bash
cd /home/claude/ewreka-ofis && python3 -m http.server 8701 &      # modül + test-files
cd /home/claude/src/matrix
python3 tests/make_test_xlsx.py && python3 tests/make_excel_like.py   # test-files/ornek.xlsx, excel-benzeri.xlsx
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
node tests/smoke.cjs /test-files/ornek.xlsx ornek          # ekran görüntüsü + dış ağ isteği denetimi
node tests/roundtrip.cjs /test-files/ornek.xlsx /tmp/rt.xlsx && python3 tests/verify_roundtrip.py /home/claude/ewreka-ofis/test-files/ornek.xlsx /tmp/rt.xlsx
node tests/roundtrip.cjs /test-files/ornek.xlsx /tmp/o.csv csv            # ya da csv-semicolon
node tests/edit.cjs        # klavye girişi, doldurma tutamacı, geri al, kirli bayrağı, Ctrl+S
node tests/input-tr.cjs    # Türkçe sayı/tarih girişi
node tests/ui-tour.cjs     # şerit sekmeleri, bağlam menüsü, sayfa menüsü, bul (tests/shots/)
node tests/print.cjs       # yazdırma HTML'i
node tests/perf.cjs        # 20.000 satırlık dosya (test-files/buyuk.xlsx)
node tests/reopen.cjs      # art arda aç / yeni / sayfa ekle / CSV aç
```

Test sırasında `window.__matrix = { univer, univerAPI }` ve `window.__matrixDebug = true` (komut günlüğü) kullanılabilir.
