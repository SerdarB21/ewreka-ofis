/* Ewreka Nota — Türkçe arayüz
 * 1) SuperDoc'un kendi yapılandırma kancaları (toolbar texts, find/replace, parola, sağ tık menüsü) için metinler.
 * 2) Kancası olmayan metinler için DOM çeviri katmanı: MutationObserver ile metin düğümleri ve
 *    title / aria-label / placeholder öznitelikleri birebir sözlükten çevrilir.
 *    Belge içeriği (sayfalar, ProseMirror) ASLA çevrilmez.
 */
const isMac = !!(window.EwrekaShell && window.EwrekaShell.isMac);
const K = (k) => (isMac ? '⌘' + k : 'Ctrl+' + k);

// ---- 1) SuperDoc toolbarTexts (ipuçları ve menü etiketleri) ----
export const TOOLBAR_TEXTS = {
  bold: `Kalın (${K('B')})`,
  fontFamily: 'Yazı tipi',
  ai: 'Yapay zekâ ile metin',
  fontSize: 'Yazı tipi boyutu',
  italic: `İtalik (${K('I')})`,
  underline: `Altı çizili (${K('U')})`,
  highlight: 'Metin vurgu rengi',
  strikethrough: 'Üstü çizili',
  color: 'Yazı tipi rengi',
  search: 'Bul',
  link: `Bağlantı (${K('K')})`,
  image: 'Resim ekle',
  tableOfContents: 'İçindekiler',
  table: 'Tablo ekle',
  tableActions: 'Tablo seçenekleri',
  addRowBefore: 'Üste satır ekle',
  addRowAfter: 'Alta satır ekle',
  addColumnBefore: 'Sola sütun ekle',
  addColumnAfter: 'Sağa sütun ekle',
  deleteRow: 'Satırı sil',
  deleteColumn: 'Sütunu sil',
  deleteTable: 'Tabloyu sil',
  removeBorders: 'Kenarlıkları kaldır',
  mergeCells: 'Hücreleri birleştir',
  splitCell: 'Hücreyi böl',
  fixTables: 'Tabloları onar',
  textAlign: 'Hizalama',
  bulletList: 'Madde işaretleri',
  numberedList: 'Numaralandırma',
  indentLeft: 'Girintiyi azalt',
  indentRight: 'Girintiyi artır',
  directionLtr: 'Soldan sağa',
  directionRtl: 'Sağdan sola',
  zoom: 'Yakınlaştırma',
  undo: `Geri al (${K('Z')})`,
  redo: `Yinele (${isMac ? '⇧⌘Z' : 'Ctrl+Y'})`,
  trackChanges: 'Değişiklikleri izle',
  trackChangesAccept: 'Seçimdeki değişiklikleri kabul et',
  trackChangesReject: 'Seçimdeki değişiklikleri reddet',
  trackChangesOriginal: 'Özgün hâlini göster',
  trackChangesFinal: 'Son hâlini göster',
  clearFormatting: 'Tüm biçimlendirmeyi temizle',
  copyFormat: 'Biçim boyacısı',
  lineHeight: 'Satır aralığı',
  formatText: 'Normal',
  ruler: 'Cetveli göster/gizle',
  formattingMarks: 'Biçimlendirme işaretlerini göster/gizle',
  pageBreak: 'Sayfa sonu ekle',
  documentEditingMode: 'Düzenleme',
  documentSuggestingMode: 'Değişiklik önerme',
  documentViewingMode: 'Görüntüleme',
  documentEditingModeDescription: 'Belgeyi doğrudan düzenleyin',
  documentSuggestingModeDescription: 'Düzenlemeler izlenen değişiklik olur',
  documentViewingModeDescription: 'Belgenin yalnızca son hâlini görün',
  linkedStyles: 'Stiller',
};

export const FIND_REPLACE_TEXTS = {
  findPlaceholder: 'Belgede bul…',
  findAriaLabel: 'Bul',
  replacePlaceholder: 'Şununla değiştir…',
  replaceAriaLabel: 'Değiştir',
  noResultsLabel: 'Sonuç yok',
  previousMatchLabel: 'Önceki',
  previousMatchAriaLabel: 'Önceki eşleşme',
  nextMatchLabel: 'Sonraki',
  nextMatchAriaLabel: 'Sonraki eşleşme',
  closeLabel: 'Kapat',
  closeAriaLabel: 'Kapat',
  replaceLabel: 'Değiştir',
  replaceAllLabel: 'Tümünü değiştir',
  toggleReplaceLabel: 'Değiştir alanını aç/kapat',
  toggleReplaceAriaLabel: 'Değiştir alanını aç/kapat',
  matchCaseLabel: 'Büyük/küçük harf duyarlı',
  matchCaseAriaLabel: 'Büyük/küçük harf duyarlı',
  ignoreDiacriticsLabel: 'Aksanları yoksay',
  ignoreDiacriticsAriaLabel: 'Aksanları yoksay',
};

export const PASSWORD_TEXTS = {
  title: 'Parola gerekli',
  invalidTitle: 'Parola yanlış',
  description: 'Bu belge parola ile korunuyor. Açmak için parolayı girin.',
  placeholder: 'Parola',
  inputAriaLabel: 'Belge parolası',
  submitLabel: 'Aç',
  cancelLabel: 'İptal',
  busyLabel: 'Şifre çözülüyor…',
  invalidMessage: 'Parola yanlış. Lütfen yeniden deneyin.',
  timeoutMessage: 'Şifre çözme zaman aşımına uğradı. Lütfen yeniden deneyin.',
  genericErrorMessage: 'Bu belgenin şifresi çözülemedi.',
};

// ---- Word yerleşik stil adları (Türkçe Word adlarıyla) ----
export const STYLE_NAMES = {
  'normal': 'Normal',
  'title': 'Konu Başlığı',
  'subtitle': 'Alt Konu Başlığı',
  'quote': 'Alıntı',
  'intense quote': 'Belirgin Alıntı',
  'list paragraph': 'Liste Paragraf',
  'no spacing': 'Aralık Yok',
  'caption': 'Resim Yazısı',
  'header': 'Üst Bilgi',
  'footer': 'Alt Bilgi',
  'toc heading': 'İçindekiler Başlığı',
  'body text': 'Gövde Metni',
  'body text 2': 'Gövde Metni 2',
  'body text 3': 'Gövde Metni 3',
  'list': 'Liste',
  'list 2': 'Liste 2',
  'list 3': 'Liste 3',
  'list bullet': 'Madde İşareti',
  'list bullet 2': 'Madde İşareti 2',
  'list bullet 3': 'Madde İşareti 3',
  'list number': 'Liste Numarası',
  'list number 2': 'Liste Numarası 2',
  'list number 3': 'Liste Numarası 3',
  'list continue': 'Liste Devamı',
  'list continue 2': 'Liste Devamı 2',
  'list continue 3': 'Liste Devamı 3',
  'macro': 'Makro Metni',
  'macro text': 'Makro Metni',
  'footnote text': 'Dipnot Metni',
  'endnote text': 'Son Not Metni',
  'balloon text': 'Balon Metni',
  'comment text': 'Açıklama Metni',
  'plain text': 'Düz Metin',
  'normal (web)': 'Normal (Web)',
  'table of figures': 'Şekiller Tablosu',
  'bibliography': 'Kaynakça',
  'block text': 'Blok Metin',
  'signature': 'İmza',
  'salutation': 'Selamlama',
  'closing': 'Kapanış',
  'date': 'Tarih',
  'index 1': 'Dizin 1',
  'index heading': 'Dizin Başlığı',
};
for (let i = 1; i <= 9; i++) { STYLE_NAMES['heading ' + i] = 'Başlık ' + i; STYLE_NAMES['toc ' + i] = 'İçindekiler ' + i; }
export function styleIdToName(id) {
  if (!id) return id;
  if (/^TOC/.test(id)) return id.replace(/^TOC(\d+)$/, 'toc $1').replace(/^TOCHeading$/, 'toc heading');
  return String(id).replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase();
}
function styleLookup(n) {
  const a = STYLE_NAMES[String(n).trim().toLowerCase()]; if (a) return a;
  return STYLE_NAMES[styleIdToName(n)] || null;
}
export function styleName(n) { if (!n) return n; const t = STYLE_NAMES[String(n).trim().toLowerCase()]; return t || n; }

// ---- 2) DOM sözlüğü (birebir eşleşme, baş/son boşluklar korunur) ----
export const DICT = {
  // araç çubuğu aria-label'ları
  'Toolbar': 'Araç çubuğu', 'Toolbar separator': 'Ayırıcı', 'Overflow items': 'Diğer araçlar',
  'Undo': 'Geri al', 'Redo': 'Yinele',
  'Accept tracked changes': 'İzlenen değişiklikleri kabul et', 'Reject tracked changes': 'İzlenen değişiklikleri reddet',
  'Zoom': 'Yakınlaştırma', 'Font family': 'Yazı tipi', 'Font family options': 'Yazı tipi seçenekleri',
  'Font size': 'Yazı tipi boyutu', 'Font size options': 'Yazı tipi boyutu seçenekleri',
  'Bold': 'Kalın', 'Italic': 'İtalik', 'Underline': 'Altı çizili', 'Strikethrough': 'Üstü çizili',
  'Color': 'Yazı tipi rengi', 'Text color': 'Yazı tipi rengi', 'Highlight': 'Vurgu rengi', 'Highlight color': 'Metin vurgu rengi',
  'Link': 'Bağlantı', 'Link dropdown': 'Bağlantı', 'Image': 'Resim', 'Table': 'Tablo', 'Insert table': 'Tablo ekle',
  'Table actions': 'Tablo seçenekleri', 'Table options': 'Tablo seçenekleri',
  'Text align': 'Hizalama', 'Alignment': 'Hizalama', 'Align left': 'Sola hizala', 'Align center': 'Ortala',
  'Align right': 'Sağa hizala', 'Justify': 'İki yana yasla',
  'Bullet list': 'Madde işaretleri', 'Bullet list options': 'Madde işareti seçenekleri',
  'Numbered list': 'Numaralandırma', 'Numbered list options': 'Numaralandırma seçenekleri',
  'Opaque circle': 'Dolu daire', 'Outline circle': 'Boş daire', 'Opaque square': 'Dolu kare',
  'Left indent': 'Girintiyi azalt', 'Right indent': 'Girintiyi artır',
  'Line height': 'Satır aralığı', 'Linked styles': 'Stiller', 'Linked style': 'Stil', 'Format text': 'Normal',
  'Copy formatting': 'Biçim boyacısı', 'Format painter': 'Biçim boyacısı', 'Clear formatting': 'Tüm biçimlendirmeyi temizle',
  'Document mode': 'Belge modu', 'Editing': 'Düzenleme', 'Suggesting': 'Değişiklik önerme', 'Viewing': 'Görüntüleme',
  'Edit document directly': 'Belgeyi doğrudan düzenleyin', 'Edits become suggestions': 'Düzenlemeler izlenen değişiklik olur',
  'View clean version of document only': 'Belgenin yalnızca son hâlini görün',
  'Ruler': 'Cetvel', 'Formatting marks': 'Biçimlendirme işaretleri', 'Search': 'Ara', 'Table of contents': 'İçindekiler',
  'Table of Contents': 'İçindekiler',
  // renk seçici
  'None': 'Yok', 'Clear color selection': 'Renk seçimini temizle', 'Custom colors': 'Özel renkler', 'Custom color': 'Özel renk',
  'black': 'siyah', 'dark gray': 'koyu gri', 'medium gray': 'orta gri', 'light gray': 'açık gri', 'very light gray': 'çok açık gri',
  'transparent gray': 'saydam gri', 'white': 'beyaz', 'dark red': 'koyu kırmızı', 'red': 'kırmızı', 'coral red': 'mercan kırmızısı',
  'light red': 'açık kırmızı', 'pale pink': 'soluk pembe', 'transparent pink': 'saydam pembe', 'bright pink': 'parlak pembe',
  'dark purple': 'koyu mor', 'purple': 'mor', 'orchid': 'orkide', 'light purple': 'açık mor', 'lavender': 'lavanta',
  'neon pink': 'neon pembe', 'maroon': 'bordo', 'red-orange': 'kırmızı-turuncu', 'burnt orange': 'yanık turuncu',
  'peach': 'şeftali', 'pale peach': 'soluk şeftali', 'transparent peach': 'saydam şeftali', 'orange': 'turuncu',
  'olive': 'zeytin yeşili', 'mustard yellow': 'hardal sarısı', 'yellow': 'sarı', 'light yellow': 'açık sarı',
  'very pale yellow': 'çok soluk sarı', 'transparent yellow': 'saydam sarı', 'neon yellow': 'neon sarı',
  'forest green': 'orman yeşili', 'green': 'yeşil', 'medium green': 'orta yeşil', 'light green': 'açık yeşil', 'mint': 'nane yeşili',
  'transparent mint': 'saydam nane', 'bright teal': 'parlak camgöbeği', 'navy blue': 'lacivert', 'blue': 'mavi',
  'sky blue': 'gök mavisi', 'cornflower blue': 'peygamber çiçeği mavisi', 'light blue': 'açık mavi', 'very light blue': 'çok açık mavi',
  'cyan': 'camgöbeği', 'deep purple': 'koyu eflatun', 'indigo': 'çivit mavisi', 'violet': 'menekşe', 'lavender pink': 'lavanta pembesi',
  'light lilac': 'açık leylak', 'transparent lilac': 'saydam leylak', 'neon purple': 'neon mor',
  // bağlantı
  'Add link': 'Bağlantı ekle', 'Edit link': 'Bağlantıyı düzenle', 'Insert link': 'Bağlantı ekle', 'Apply': 'Uygula',
  'Remove': 'Kaldır', 'Text': 'Metin', 'Type or paste a link': 'Bir bağlantı yazın veya yapıştırın', 'Open link': 'Bağlantıyı aç',
  'Copy link': 'Bağlantıyı kopyala', 'Remove link': 'Bağlantıyı kaldır', 'Invalid link - not clickable': 'Geçersiz bağlantı',
  'Go to': 'Git', 'Anchor': 'Yer işareti',
  // tablo
  'Add row before': 'Üste satır ekle', 'Add row after': 'Alta satır ekle', 'Add column before': 'Sola sütun ekle',
  'Add column after': 'Sağa sütun ekle', 'Insert row above': 'Üste satır ekle', 'Insert row below': 'Alta satır ekle',
  'Insert column left': 'Sola sütun ekle', 'Insert column right': 'Sağa sütun ekle', 'Delete row': 'Satırı sil',
  'Delete column': 'Sütunu sil', 'Delete table': 'Tabloyu sil', 'Remove borders': 'Kenarlıkları kaldır',
  'Delete cell and table borders': 'Hücre ve tablo kenarlıklarını kaldır', 'Merge cells': 'Hücreleri birleştir',
  'Split cell': 'Hücreyi böl', 'Split cells': 'Hücreleri böl', 'Fix tables': 'Tabloları onar', 'Edit table': 'Tabloyu düzenle',
  'Cell background': 'Hücre arka planı',
  // sağ tık menüsü
  'Insert text': 'Metin ekle', 'Replace text': 'Metni değiştir', 'Cut': 'Kes', 'Copy': 'Kopyala', 'Paste': 'Yapıştır',
  'Remove section': 'Bölümü kaldır', 'Create section': 'Bölüm oluştur', 'Accept change': 'Değişikliği kabul et',
  'Reject change': 'Değişikliği reddet', 'Update table of contents': 'İçindekileri güncelle',
  'Restart numbering': 'Numaralandırmayı yeniden başlat', 'Continue numbering': 'Numaralandırmaya devam et',
  'Decrease indent': 'Girintiyi azalt', 'Increase indent': 'Girintiyi artır', 'Searching:': 'Aranıyor:',
  'Type search string': 'Aranacak metni yazın', 'Type something...': 'Bir şeyler yazın…', 'Ignore': 'Yoksay',
  'Add to dictionary': 'Sözlüğe ekle', 'No suggestions': 'Öneri yok',
  // açıklamalar / izlenen değişiklikler
  'Add a comment': 'Açıklama ekleyin', 'Add comment': 'Açıklama ekle', 'Comment': 'Gönder', 'Comments': 'Açıklamalar',
  'Reply': 'Yanıtla', 'IMPORTED': 'İÇE AKTARILDI', 'Resolve': 'Çözümle', 'Resolved': 'Çözümlendi', 'Reopen': 'Yeniden aç', 'Cancel': 'İptal',
  'Delete': 'Sil', 'Edit': 'Düzenle', 'Save': 'Kaydet', 'Post': 'Gönder', 'Internal': 'Dahili', 'External': 'Harici',
  'Accept': 'Kabul et', 'Reject': 'Reddet', 'Change': 'Değişiklik', 'Added': 'Eklendi:', 'Deleted': 'Silindi:',
  'Replaced': 'Değiştirildi:', 'with': '→', 'Format:': 'Biçim:', 'Added hyperlink': 'Bağlantı eklendi:',
  'Changed hyperlink to': 'Bağlantı değiştirildi:', 'Added new line': 'Yeni satır eklendi', 'Added table': 'Tablo eklendi',
  'Deleted table': 'Tablo silindi', 'Footnotes': 'Dipnotlar', 'reply': 'yanıt', 'replies': 'yanıt',
  // parola / genel
  'Password Required': 'Parola gerekli', 'Enter password': 'Parolayı girin', 'Open': 'Aç', 'Close': 'Kapat',
  'Done': 'Tamam', 'OK': 'Tamam', 'Insert': 'Ekle', 'Upload': 'Yükle', 'Loading...': 'Yükleniyor…', 'Loading…': 'Yükleniyor…',
  'No results': 'Sonuç yok', 'Previous': 'Önceki', 'Next': 'Sonraki', 'Replace': 'Değiştir', 'Replace all': 'Tümünü değiştir',
  'Match case': 'Büyük/küçük harf duyarlı', 'Find': 'Bul',
};

const MONTHS = { Jan: 'Oca', Feb: 'Şub', Mar: 'Mar', Apr: 'Nis', May: 'May', Jun: 'Haz', Jul: 'Tem', Aug: 'Ağu', Sep: 'Eyl', Oct: 'Eki', Nov: 'Kas', Dec: 'Ara' };
const MON_RE = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
const VARIANT = { default: 'varsayılan', first: 'ilk sayfa', even: 'çift sayfa', odd: 'tek sayfa' };
const AREA = { Header: 'Üst bilgi', Footer: 'Alt bilgi', header: 'Üst bilgi', footer: 'Alt bilgi' };

function dict(s) { return Object.prototype.hasOwnProperty.call(DICT, s) ? DICT[s] : null; }

// Kalıplar: [regex, (eşleşme) => çeviri | null]
const PATTERNS = [
  [/^undefined( .*)?$/, () => ''],
  [/^(.+) (unset|set|selected|active|inactive)$/, (m) => { const h = dict(m[1]); if (!h) return null; return h + ' ' + ({ unset: 'kapalı', set: 'açık', selected: 'seçili', active: 'etkin', inactive: 'etkin değil' })[m[2]]; }],
  [/^(.+?) - (.*)$/, (m) => { if (m[1] === 'undefined') return ''; const h = dict(m[1]); if (!h) return null; if (m[2] === 'undefined' || m[2] === '') return h; return h + ' - ' + (dict(m[2]) || styleLookup(m[2]) || m[2]); }],
  [/^(\d+) of (\d+)$/, (m) => `${m[1]} / ${m[2]}`],
  [/^Selected: (.*)$/, (m) => 'Seçili: ' + m[1]],
  [/^(\d+) (reply|replies)$/, (m) => `${m[1]} yanıt`],
  [/^Page (\d+)$/, (m) => 'Sayfa ' + m[1]],
  [/^Page (\d+) of (\d+)$/, (m) => `Sayfa ${m[1]} / ${m[2]}`],
  [/^Editing (Header|Footer|header|footer) \((\w+)\) ?(.*?) – Press Esc to return$/, (m) => `${AREA[m[1]]} düzenleniyor (${VARIANT[m[2]] || m[2]})${m[3] ? ' ' + m[3].replace(/^Page (\d+)$/, 'Sayfa $1') : ''} – Dönmek için Esc`],
  [/^(Header|Footer|header|footer) content area\. Double click to start typing\.$/, (m) => `${AREA[m[1]]} alanı. Yazmaya başlamak için çift tıklayın.`],
  [/^(.*) \(opens in new tab\)$/, (m) => `${m[1]} (yeni sekmede açılır)`],
  [/^(.*) - external link$/, (m) => `${m[1]} - dış bağlantı`],
  [/^Cursor moved\.?$/, () => 'İmleç taşındı.'],
  [new RegExp('^(\\d{1,2}):(\\d{2})(AM|PM) ' + MON_RE + ' (\\d{1,2})$'), (m) => { let h = +m[1] % 12; if (m[3] === 'PM') h += 12; return `${m[5]} ${MONTHS[m[4]]} ${String(h).padStart(2, '0')}:${m[2]}`; }],
  [new RegExp('^' + MON_RE + ' (\\d{1,2}), (\\d{4})$'), (m) => `${+m[2]} ${MONTHS[m[1]]} ${m[3]}`],
  [/^(.+) – editing$/, (m) => `${m[1]} – düzenliyor`],
];
// Belge sayfaları içinde bile çevrilebilecek (yalnızca öznitelik) kalıplar
const PAGE_ATTR_PATTERNS = PATTERNS.filter((p) => /content area|opens in new tab|external link/.test(p[0].source));

export function translate(s, inPage) {
  if (s == null) return null;
  const str = String(s);
  const m0 = /^(\s*)([\s\S]*?)(\s*)$/.exec(str);
  const core = m0[2];
  if (!core || !/[A-Za-z]/.test(core)) return null;
  if (!inPage) {
    const d = dict(core);
    if (d != null) return m0[1] + d + m0[3];
  }
  for (const [re, fn] of (inPage ? PAGE_ATTR_PATTERNS : PATTERNS)) {
    const m = re.exec(core);
    if (m) { const r = fn(m); if (r != null) return m0[1] + r + m0[3]; }
  }
  return null;
}

// ---- DOM çeviri katmanı ----
const PAGE_SEL = '.superdoc-page, .presentation-editor__pages, #nota-print';
const SKIP_SEL = '.ProseMirror, [contenteditable="true"], .ew-bar, .ew-menu, .ew-modal-bg, .ew-toasts, script, style, #nota-status';
const STYLE_CTX_SEL = '.style-item, .style-name, [data-item="btn-linkedStyles"], .linked-style-buttons';
const ATTRS = ['title', 'aria-label', 'placeholder', 'data-tooltip', 'alt'];

function translateText(node) {
  const el = node.parentElement;
  if (!el || el.tagName === 'TEXTAREA' || el.closest(SKIP_SEL) || el.closest(PAGE_SEL)) return;
  const v = node.nodeValue;
  if (!v || !/[A-Za-z]/.test(v)) return;
  let t = null;
  if (el.closest(STYLE_CTX_SEL)) {
    const core = v.trim();
    const sn = STYLE_NAMES[core.toLowerCase()];
    if (sn) t = v.replace(core, sn);
  }
  if (t == null) t = translate(v, false);
  if (t != null && t !== v) node.nodeValue = t;
}

function translateAttrs(el) {
  if (!el.getAttribute) return;
  const inPage = !!el.closest(PAGE_SEL);
  if (!inPage && el.closest('.ew-bar, .ew-menu, .ew-modal-bg, #nota-status')) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v || !/[A-Za-z]/.test(v)) continue;
    let t = translate(v, inPage);
    if (t == null && a === 'aria-label' && !inPage) {
      const m = /^Linked style - (.+)$/.exec(v); if (m) t = 'Stil - ' + styleName(styleIdToName(m[1]));
    }
    if (t != null && t !== v) el.setAttribute(a, t);
  }
}

function pageAttrPass(el) {
  translateAttrs(el);
  el.querySelectorAll && el.querySelectorAll('[aria-label],[title]').forEach(translateAttrs);
}

const FILTER = {
  acceptNode(n) {
    if (n.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
    if (n.matches(PAGE_SEL)) { pageAttrPass(n); return NodeFilter.FILTER_REJECT; }
    if (n.matches(SKIP_SEL)) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  },
};

function walk(root) {
  if (root.nodeType === 3) { translateText(root); return; }
  if (root.nodeType !== 1) return;
  if (root.closest(PAGE_SEL)) { pageAttrPass(root); return; }
  if (root.closest(SKIP_SEL)) return;
  translateAttrs(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, FILTER);
  let n;
  while ((n = tw.nextNode())) {
    if (n.nodeType === 3) translateText(n);
    else translateAttrs(n);
  }
}

let observer = null;
let pending = new Set();
let scheduled = false;
function flush() {
  scheduled = false;
  const nodes = pending; pending = new Set();
  for (const n of nodes) { if (n.isConnected) walk(n); }
}
function queue(n) {
  pending.add(n);
  if (!scheduled) { scheduled = true; queueMicrotask(flush); }
}

export function installTranslator(root = document.body) {
  if (observer) return;
  walk(root);
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach(queue);
      else queue(m.target);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

// Sağ tık menüsü: SuperDoc menuProvider kancası ile etiketleri çevir
export function translateMenuSections(_ctx, sections) {
  try {
    return sections.map((s) => ({ ...s, items: (s.items || []).map((it) => ({ ...it, label: (it.label && (dict(it.label) || translate(it.label, false))) || it.label })) }));
  } catch (_) { return sections; }
}
