/* Ewreka Nota — yazı tipi listesi
 * Windows ve macOS'ta yaygın olan sistem yazı tipleri. Uzak yazı tipi YOK: yalnızca kurulu olanlar kullanılır.
 * Liste, sistemde gerçekten kurulu olanlara göre süzülür (tuval ölçümüyle); Word'ün temel yazı tipleri
 * (Calibri, Cambria, Arial, Times New Roman, Courier New) belgelerde sık geçtiği için her zaman listelenir.
 */
const CANDIDATES = [
  // [ad, yedek yığın]
  ['Aptos', 'Calibri, sans-serif'],
  ['Arial', 'Helvetica, Liberation Sans, sans-serif'],
  ['Arial Black', 'Arial, sans-serif'],
  ['Arial Narrow', 'Arial, sans-serif'],
  ['Book Antiqua', 'Palatino Linotype, Palatino, serif'],
  ['Bookman Old Style', 'serif'],
  ['Calibri', 'Carlito, sans-serif'],
  ['Calibri Light', 'Calibri, Carlito, sans-serif'],
  ['Cambria', 'Caladea, serif'],
  ['Candara', 'sans-serif'],
  ['Century Gothic', 'sans-serif'],
  ['Comic Sans MS', 'cursive'],
  ['Consolas', 'Menlo, monospace'],
  ['Constantia', 'serif'],
  ['Corbel', 'sans-serif'],
  ['Courier New', 'Courier, monospace'],
  ['Franklin Gothic Medium', 'sans-serif'],
  ['Garamond', 'EB Garamond, serif'],
  ['Georgia', 'serif'],
  ['Gill Sans', 'sans-serif'],
  ['Helvetica', 'Arial, sans-serif'],
  ['Helvetica Neue', 'Helvetica, Arial, sans-serif'],
  ['Impact', 'sans-serif'],
  ['Lucida Console', 'monospace'],
  ['Lucida Sans Unicode', 'sans-serif'],
  ['Menlo', 'monospace'],
  ['Palatino Linotype', 'Palatino, serif'],
  ['Palatino', 'Palatino Linotype, serif'],
  ['Segoe UI', 'sans-serif'],
  ['Tahoma', 'Verdana, sans-serif'],
  ['Times New Roman', 'Times, serif'],
  ['Trebuchet MS', 'sans-serif'],
  ['Verdana', 'sans-serif'],
];
const ALWAYS = new Set(['Calibri', 'Cambria', 'Arial', 'Times New Roman', 'Courier New']);

let ctx = null;
function width(font) {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  ctx.font = font;
  return ctx.measureText('mmmmmmmmmmlliWWğüşİıöç0123456789').width;
}

export function isFontInstalled(name) {
  try {
    for (const base of ['monospace', 'serif', 'sans-serif']) {
      const a = width(`72px ${base}`);
      const b = width(`72px "${name}", ${base}`);
      if (Math.abs(a - b) > 0.5) return true;
    }
  } catch (_) { return true; }
  return false;
}

export function buildFontList() {
  const list = [];
  for (const [name, fallback] of CANDIDATES) {
    if (!ALWAYS.has(name) && !isFontInstalled(name)) continue;
    const key = `${name}, ${fallback}`;
    list.push({ label: name, key, fontWeight: 400, props: { style: { fontFamily: key }, 'data-item': 'btn-fontFamily-option' } });
  }
  return list;
}
