// Univer kaynaklarına derleme zamanında uygulanan küçük yamalar (Ewreka Matrix).
// Univer sürümü package.json'da sabitlenmiştir (1.0.3); yükseltmede bu yamaların hâlâ eşleştiğini kontrol edin —
// eşleşmeyen yama derlemede uyarı olarak yazdırılır.
const PATCHES = [
  {
    file: '@univerjs/sheets-numfmt/lib/es/index.js',
    name: 'para birimi simgesi ₺ ve lira simgesi',
    apply: (code) => code
      .replace('[LocaleType.EN_US, "$"]', '[LocaleType.EN_US, "₺"]')
      .replace(/(case LocaleType\.EN_US:[\s\S]{0,120}?default: return \{\s*icon: )"DollarIcon"/, '$1"LiraIcon"'),
    expect: ['"₺"]', '"LiraIcon"'],
  },
  {
    file: '@univerjs/core/lib/es/index.js',
    name: 'varsayılan yazı tipi Calibri',
    // Varsayılan yazı tipi: Excel ile uyumlu Calibri 11 (sistemde yoksa işleyici Helvetica/Arial'a düşer).
    // Not: sayı gösterimi bilinçli olarak "en" bölge ayarında bırakıldı (1,234.56). Univer'in "tr" desteği yarım:
    // genel biçimde ondalık "." kalıyor ve "1234.5" girişi 12345 olarak okunuyor — veri bozulması riski.
    // Türkçe giriş (3,5 · 15.01.2026) src/input-tr.js içindeki giriş kancasıyla desteklenir.
    apply: (code) => code.replace(/(const DEFAULT_STYLES = \{\s*\/\*\*[\s\S]*?\*\/\s*ff: )"Arial"/, '$1"Calibri"'),
    expect: ['ff: "Calibri"'],
  },
  {
    file: '@univerjs/engine-render/lib/es/index.js',
    name: 'heceleme sözlükleri (yalnızca tr)',
    // Belge heceleme sözlükleri yalnızca Docs düzeninde kullanılır; tablo modülünde gereksiz (~5 MB).
    apply: (code) => code.replace(/\t\["([a-z0-9-]+)"\]: \(\) => import\("\.\/[^"]+"\),?\n/g, (m, lang) => (lang === 'tr' ? m : '')),
    expect: ['["tr"]: () => import('],
  },
];

export default function univerPatches() {
  const applied = new Set();
  return {
    name: 'ewreka-univer-patches',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@univerjs')) return null;
      const norm = id.replace(/\\/g, '/');
      const p = PATCHES.find((x) => norm.includes('node_modules/' + x.file));
      if (!p) return null;
      const out = p.apply(code);
      if (p.expect.every((e) => out.includes(e)) && out !== code) applied.add(p.name);
      return out === code ? null : { code: out, map: null };
    },
    buildEnd() {
      for (const p of PATCHES) if (!applied.has(p.name)) this.warn(`[ewreka] Univer yaması uygulanamadı: ${p.name} (${p.file})`);
    },
  };
}
