# Ewreka Ofis 1.0.0 — lisans incelemesi ve tamamlamalar

İnceleme tarihi: 4 Ekim 2026. Bu belge teknik incelemenin kapsamını ve sınırlarını
bildirir; hukuki uygunluk garantisi veya hukukçu görüşü değildir.

## Ücretsiz yayın politikası

Ewreka Ofis ticari gelir amacı taşımayan bir projedir. Ewreka Digital tarafından
her zaman tamamen ücretsiz sunulacaktır. Resmî indirme ve kullanım için ücretli
lisans veya abonelik zorunluluğu getirilmeyecektir. Bu politika açık kaynak
lisansına ticari kullanım yasağı eklemez. Bkz. [yayın politikası](../FREE-DISTRIBUTION.md).

## Lisans kapsamı

Birleşik Ewreka Ofis dağıtımı GNU AGPL sürüm 3 olarak sunulur. SuperDoc 1.47.1
npm paketinin lisans beyanı `AGPL-3.0` olduğundan, üçüncü taraf kodunun gelecekteki
lisans sürümlerine otomatik olarak izin verdiği iddia edilmez. Ewreka'nın özgün
dosyalarında önceden bulunan `AGPL-3.0-or-later` başlıkları korunur ve yalnızca
ilgili dosyalara uygulanır. Üçüncü taraf bileşenler kendi lisanslarını korur.

## Tamamlanan bildirimler

- 23 benzersiz paket/sürüm için toplam 25 eksik bildirim kaydı incelendi.
- Tam lisanslar npm README'lerinden veya sürümün gitHead commit'indeki upstream
  dosyalardan alındı. Upstream paket yalnızca standart MIT/ISC lisans adını
  veriyorsa özgün beyan, mevcut atıflar ve standart SPDX lisans metni birlikte
  korundu; bulunmayan telif yılı veya hak sahibi uydurulmadı.
- `buffers 0.1.1`: özgün yazar James Halliday'in
  [lisans commit'i](https://github.com/bitpay/node-buffers/commit/1b745ee35d33eb166e15ef1866073a07c6d7de87)
  MIT/X11 beyanını doğruluyor. Fork üzerinde erişilebilir bu commit'in özgün
  yazar ve değişiklik bilgileri kontrol edildi.
- `ot-text-unicode 4.0.0`: npm meta verisi ISC yazsa da dağıtılan README'nin tam
  lisansı MIT; özgün MIT metni korundu ve bu fark açıkça belirtildi.
- `https 1.0.0`: npm arşivi yalnızca package.json içeriyor; yürütülebilir kod yok.
- SuperDoc'un gömülü RTFJS kaynaklarındaki üç ayrı lisans/telif bloğu ve Font
  Awesome Free ikon bildirimleri ek dosyada korundu.
- SuperDoc kaynak ağacındaki font lisans metinleri, atıfları ve manifesti birlikte
  sunuluyor. Copyleft fontlar için upstream kaynak arşivleri de indirilebilir.

Paket beyanları, kaynak URL'leri, SHA-256 değerleri ve upstream metinleri
[license-evidence](license-evidence) dizinindedir. Bu tarama, paketlerin kendi
beyanlarının doğruluğunu bağımsız bir telif hakkı araştırmasıyla garanti etmez.

## SuperDoc 1.47.1 kaynak sunumu

Npm 1.47.1 paketinin tam kaynak ve derleme betiklerini içeren bir release etiketi
bulunamadı. Bu nedenle aşağıdaki yöntemle bir kaynak ağacı hazırlandı:

1. Kamuya açık `superdoc/docx-editor` ağacının
   `58664131738ffd4565ddf11fc7a9099412618a63` commit'i temel alındı.
2. Npm 1.47.1 tarball'ının bütünlük değeri Nota lockfile'ı ile doğrulandı.
3. Paketin kendi kaynak haritasındaki 1.834 ayrı runtime kaynak yolu karşılaştırıldı.
   1.829 dosya eşleşti; beş dosyanın içeriği tam olarak kaynak haritasından geri
   alındı. SVG kaynakları üretilen sarmalayıcılardan çözüldü. İki sanal modül
   derleyici çıktısı veya varlık URL'si olarak ayrıldı; özgün varlık ağacı korundu.
4. Temel ağacın paket sürümü 1.46.2 olduğu için yalnızca sürüm alanı 1.47.1
   olarak işaretlendi; workspace derleme ayarları ve lockfile korundu.
5. Bu ağacın runtime ESM ve CJS çıktıları Windows/Node.js 22.22.3/pnpm 10.25.0
   ortamında başarıyla üretildi. Tip bildirimlerinin üretimi kapalıydı; bu işlem
   upstream'in tüm testlerini veya byte-identical paket üretimini doğrulamaz.
6. 122 JavaScript/CJS runtime dosyası npm 1.47.1 dosyalarıyla birebir eşleşti.
   CSS küçültme açılarak karşılaştırıldığında iki CSS dosyasında aynı 684 üst
   düzey kuralın aynı içerikleri bulundu; sıraları farklı. Bu, kaskat davranışının
   eşdeğerliğini veya bütün npm paketinin birebir yeniden üretildiğini iddia etmez.
7. Upstream `check:font-licenses` kontrolü geçti.

Kaynak arşivi:
[SuperDoc-1.47.1-Kaynak-ve-Derleme.tar.gz](https://github.com/SerdarB21/ewreka-ofis/releases/download/v1.0.0/SuperDoc-1.47.1-Kaynak-ve-Derleme.tar.gz).
Arşivde tüm özgün kaynak ağacı, derleme betikleri, lockfile, lisanslar ve yapılan
geri alma işleminin dosya listesi bulunur. Bu, upstream tarafından etiketlenmiş
bir release değildir; nasıl hazırlandığı açıkça belirtilmiş bir kaynak sunumudur.

### Kaynak ağacını derleme

Arşivi açın. Node.js 22 ve pnpm 10.25.0 kullanın:

```powershell
npx --yes pnpm@10.25.0 install --filter superdoc... --ignore-scripts --frozen-lockfile
$env:SUPERDOC_SKIP_DTS='1'
npx --yes pnpm@10.25.0 --filter superdoc exec vite build
npx --yes pnpm@10.25.0 check:font-licenses
```

Unix kabuklarında ortam değişkenini `export SUPERDOC_SKIP_DTS=1` ile ayarlayın.

## Mevcut uygulama ile kaynak eşleşmesi

- Nota: `npm ci --ignore-scripts` ve Vite derlemesi geçti. Üretilen 17 dosyanın
  tamamının SHA-256 değeri teslim edilen Nota modülündeki dosyalarla birebir aynı.
- Mac Apple Silicon ve Intel: app.asar içindeki 374 dosya, Ewreka kaynak
  arşivindeki masaüstü/modül dosyalarıyla byte-for-byte eşleşti. Paketlenmiş
  package.json metadata dosyası farklı; bu karşılaştırma o dosyayı eşleşmiş saymaz.
- Windows installer ve bütün teslim arşivlerinin SHA-256 değerleri özgün teslim
  manifestiyle doğrulandı. Windows installer içeriği yeniden çıkarılıp sınanmadı.
- Uygulamanın gerçek Windows/Mac üzerinde açma-kaydetme testi ve tüm modüllerin
  yeniden derlenmesi bu lisans incelemesinin kapsamında yapılmadı.

## Dağıtım paketleri

Lisans bildirimleri tamamlanmış ZIP paketleri, mevcut 1.0.0 uygulama dosyalarını
değiştirmeden bunlara LICENSE, kapsam açıklaması ve tamamlanmış atıf dosyalarını
ekler. Windows ZIP'i içindeki installer özgün installer ile aynıdır; Mac ZIP'leri
özgün uygulama paketinin dışında ek bildirimler taşır. İçteki executable/app.asar
dosyaları yeniden yazılmaz ve uygulamanın sürümü değiştirilmez.

Güncel dağıtım arşivlerini sürüm sayfasındaki güncel SHA256SUMS.txt ile doğrulayın.

## Yayın sonrasında korunacak koşullar

- Her yeni dağıtım sürümünün karşılık gelen kaynaklarını ve derleme betiklerini sunun.
- Lisansları, üçüncü taraf teliflerini, ikon/font atıflarını koruyun.
- Bileşen sürümü yükseltirken o sürümün ve tüm yeni bağımlılıkların lisanslarını inceleyin.
  1.47.1 için yapılan doğrulama SuperDoc 2.x veya başka sürümlere aktarılmaz.
- `www.ewreka.net/ofis` uygulamanın kaynak bağlantısıdır. Kullanıcının bildirdiği
  site yayını tamamlandığında sayfa aynı sürümün kaynak arşivine ve bu kaynak
  tamamlayıcılarına açık bağlantılar sunmalıdır. GitHub Release bağlantıları
  site yayınına bağımlı değildir.
- İnternet üzerinden etkileşimli AGPL hizmeti kurulursa kaynak sunma koşulunu
  ayrıca değerlendirin. Ücretsiz olmak bu yükümlülüğü ortadan kaldırmaz.

## Resmî lisans kaynakları

- [GNU AGPL sürüm 3](https://www.gnu.org/licenses/agpl-3.0.html), özellikle 1, 4–6, 13–14.
- [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0.html), özellikle 4 ve 6.
- [SuperDoc lisans seçenekleri](https://docs.superdoc.dev/resources/license/).
- [SPDX MIT metni](https://spdx.org/licenses/MIT.html).
- [SPDX ISC metni](https://spdx.org/licenses/ISC.html).

Teknik kontroller olumlu olsa da bir kaynak haritasının her geliştirme dosyasını
temsil ettiği, hak sahipliğinin tümü veya tüm ülkelerde hukuki uygunluk bu
incelemeyle kesinleştirilemez. Özellikle kaynak ağacının geri alınması ve upstream
lisans beyanları hakkında kesin hukuki değerlendirme ayrıca yapılabilir.
