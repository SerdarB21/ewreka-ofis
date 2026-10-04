// Türkçe dil paketi: tüm eklentilerin en-US paketleri + Türkçe çeviri (derin birleştirme)
import { mergeLocales } from '@univerjs/presets';
import core from '@univerjs/preset-sheets-core/locales/en-US';
import filter from '@univerjs/preset-sheets-filter/locales/en-US';
import sort from '@univerjs/preset-sheets-sort/locales/en-US';
import cf from '@univerjs/preset-sheets-conditional-formatting/locales/en-US';
import dv from '@univerjs/preset-sheets-data-validation/locales/en-US';
import fr from '@univerjs/preset-sheets-find-replace/locales/en-US';
import hl from '@univerjs/preset-sheets-hyper-link/locales/en-US';
import note from '@univerjs/preset-sheets-note/locales/en-US';
import tr from './tr-TR.json';

function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
function deepMerge(base, over) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    if (isObj(v) && (isObj(out[k]) || Array.isArray(out[k]))) out[k] = deepMerge(out[k], v);
    else if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}
// tr-TR.json düz (nokta ayrılmış anahtar) biçimindedir; ağaca çevir
function unflatten(flat) {
  const root = {};
  for (const [path, val] of Object.entries(flat)) {
    if (path.startsWith('//')) continue;
    const parts = path.split('.');
    let o = root;
    for (let i = 0; i < parts.length - 1; i++) { o = o[parts[i]] = isObj(o[parts[i]]) ? o[parts[i]] : {}; }
    o[parts[parts.length - 1]] = val;
  }
  return root;
}

const en = mergeLocales(core, filter, sort, cf, dv, fr, hl, note);
export const trTR = deepMerge(en, unflatten(tr));
