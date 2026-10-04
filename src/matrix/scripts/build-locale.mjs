// Türkçe dil paketini üretir: tüm eklentilerin en-US paketlerini düzleştirir, locale-src/tr-*.json sözlüğünü
// (İngilizce metin -> Türkçe; "@yol.anahtar" ile yola özel) uygular ve src/locale/tr-TR.json yazar.
// İşlev açıklamaları (engine-formula.functionList) ve emoji adları İngilizce bırakılır.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const presets = ['core', 'filter', 'sort', 'conditional-formatting', 'data-validation', 'find-replace', 'hyper-link', 'note'];
const flat = {};
function walk(obj, pre) {
  for (const [k, v] of Object.entries(obj)) {
    const p = pre ? pre + '.' + k : k;
    if (typeof v === 'string') flat[p] = v; else if (v && typeof v === 'object') walk(v, p);
  }
}
for (const p of presets) walk((await import(`@univerjs/preset-sheets-${p}/locales/en-US`)).default, '');
const dict = {};
for (const f of fs.readdirSync(path.join(root, 'locale-src')).filter((f) => /^tr-.*\.json$/.test(f)).sort()) Object.assign(dict, JSON.parse(fs.readFileSync(path.join(root, 'locale-src', f), 'utf8')));
const SKIP = [/^ui\.emojiPicker\.emojiTitles\./, /^ui\.emojiPicker\.emojiSearchIndex\./, /^engine-formula\.functionList\./];
const out = {};
const missing = [];
for (const [p, v] of Object.entries(flat)) {
  if (SKIP.some((re) => re.test(p))) continue;
  const t = dict['@' + p] ?? dict[v];
  if (t === undefined) { if (v.trim() !== '' && !/^[<>=]+$/.test(v) && !/^[A-Z]\d$/.test(v)) missing.push(p + '\t' + JSON.stringify(v)); continue; }
  if (t !== v) out[p] = t;
}
fs.writeFileSync(path.join(root, 'src/locale/tr-TR.json'), JSON.stringify(out, null, 0).replace(/","/g, '",\n"'));
console.log(`çevrilen: ${Object.keys(out).length}, eksik: ${missing.length}`);
if (missing.length) console.log(missing.join('\n'));
