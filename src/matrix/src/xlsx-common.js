// xlsx içe/dışa aktarma için ortak eşlemeler ve birim dönüşümleri

// Univer BorderStyleTypes <-> Excel kenarlık adları
export const BORDER_FROM_EXCEL = {
  thin: 1, hair: 2, dotted: 3, dashed: 4, dashDot: 5, dashDotDot: 6, double: 7, medium: 8,
  mediumDashed: 9, mediumDashDot: 10, mediumDashDotDot: 11, slantDashDot: 12, thick: 13,
};
export const BORDER_TO_EXCEL = Object.fromEntries(Object.entries(BORDER_FROM_EXCEL).map(([k, v]) => [v, k]));

// Univer HorizontalAlign: 1 sol, 2 orta, 3 sağ, 4 iki yana, 5 iki yana, 6 dağıtılmış
export const H_ALIGN_FROM_EXCEL = { left: 1, center: 2, right: 3, justify: 4, distributed: 6, centerContinuous: 2, fill: 1 };
export const H_ALIGN_TO_EXCEL = { 1: 'left', 2: 'center', 3: 'right', 4: 'justify', 5: 'justify', 6: 'distributed' };
// Univer VerticalAlign: 1 üst, 2 orta, 3 alt
export const V_ALIGN_FROM_EXCEL = { top: 1, middle: 2, center: 2, bottom: 3, distributed: 2, justify: 2 };
export const V_ALIGN_TO_EXCEL = { 1: 'top', 2: 'middle', 3: 'bottom' };
// Univer TextDecoration
export const UNDERLINE_FROM_EXCEL = { single: 12, double: 10, singleAccounting: 18, doubleAccounting: 19 };
export const UNDERLINE_TO_EXCEL = { 12: 'single', 10: 'double', 18: 'singleAccounting', 19: 'doubleAccounting' };

// Excel sütun genişliği (karakter, MDW=7px Calibri 11) <-> piksel
export function colWidthToPx(w) {
  if (!w || w <= 0) return 0;
  return Math.max(1, Math.trunc(((256 * w + Math.trunc(128 / 7)) / 256) * 7));
}
export function pxToColWidth(px) {
  // Excel'in sakladığı genişlik (dolgu dahil); px = trunc(w*7 + 0.49) ile geri döner
  return Math.round((px / 7) * 256) / 256;
}
// Satır yüksekliği: punto <-> piksel (96 dpi)
export const rowHeightToPx = (pt) => Math.round((pt * 96) / 72);
export const pxToRowHeight = (px) => Math.round(((px * 72) / 96) * 100) / 100;

// Tarih <-> Excel seri numarası (ExcelJS tarihleri UTC olarak üretir)
export function dateToSerial(d, date1904) {
  const serial = d.getTime() / 86400000 + 25569;
  return date1904 ? serial - 1462 : serial;
}
export function serialToDate(serial, date1904) {
  const s = date1904 ? serial + 1462 : serial;
  return new Date(Math.round((s - 25569) * 86400000));
}

// Biçim kodunda tarih/saat simgesi var mı (tırnak içi ve renk/koşul blokları hariç)
export function isDateFormat(fmt) {
  if (!fmt) return false;
  const cleaned = String(fmt).replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '');
  return /[dmyhs]/i.test(cleaned) && !/^[#0.,%\s]*$/.test(cleaned);
}

// ExcelJS'in yerleşik biçim kimliklerinden ürettiği ABD biçimlerini Türkçe karşılıklarına çevir
const BUILTIN_TR = {
  'mm-dd-yy': 'dd.mm.yyyy',
  'm/d/yy': 'dd.mm.yyyy',
  'd-mmm-yy': 'dd.mmm.yy',
  'd-mmm': 'dd.mmm',
  'mmm-yy': 'mmm.yy',
  'm/d/yy h:mm': 'dd.mm.yyyy hh:mm',
  'm/d/yy "h":mm': 'dd.mm.yyyy hh:mm',
};
export function normalizeNumFmt(fmt) {
  return BUILTIN_TR[fmt] || fmt;
}

// Excel'in yeni işlev önekleri: Univer bunları öneksiz bekler
export function stripFormulaPrefixes(f) {
  return f.replace(/_xlfn\._xlws\./g, '').replace(/_xlfn\./g, '').replace(/_xlws\./g, '');
}
// Excel 2010+ işlevleri dosyaya _xlfn. önekiyle yazılmalı, aksi halde Excel #AD? gösterir
const FUTURE_FUNCS = ['AGGREGATE', 'ARABIC', 'BASE', 'BETA.DIST', 'BETA.INV', 'BINOM.DIST', 'BINOM.DIST.RANGE', 'BINOM.INV', 'BITAND', 'BITLSHIFT', 'BITOR', 'BITRSHIFT', 'BITXOR', 'BYCOL', 'BYROW', 'CEILING.MATH', 'CEILING.PRECISE', 'CHISQ.DIST', 'CHISQ.DIST.RT', 'CHISQ.INV', 'CHISQ.INV.RT', 'CHISQ.TEST', 'CHOOSECOLS', 'CHOOSEROWS', 'COMBINA', 'CONCAT', 'CONFIDENCE.NORM', 'CONFIDENCE.T', 'COT', 'COTH', 'COVARIANCE.P', 'COVARIANCE.S', 'CSC', 'CSCH', 'DAYS', 'DECIMAL', 'DROP', 'ERF.PRECISE', 'ERFC.PRECISE', 'EXPAND', 'EXPON.DIST', 'F.DIST', 'F.DIST.RT', 'F.INV', 'F.INV.RT', 'F.TEST', 'FILTER', 'FILTERXML', 'FLOOR.MATH', 'FLOOR.PRECISE', 'FORECAST.ETS', 'FORECAST.ETS.CONFINT', 'FORECAST.ETS.SEASONALITY', 'FORECAST.ETS.STAT', 'FORECAST.LINEAR', 'FORMULATEXT', 'GAMMA', 'GAMMA.DIST', 'GAMMA.INV', 'GAMMALN.PRECISE', 'GAUSS', 'HSTACK', 'HYPGEOM.DIST', 'IFNA', 'IFS', 'IMCOSH', 'IMCOT', 'IMCSC', 'IMCSCH', 'IMSEC', 'IMSECH', 'IMSINH', 'IMTAN', 'ISFORMULA', 'ISOWEEKNUM', 'LAMBDA', 'LET', 'LOGNORM.DIST', 'LOGNORM.INV', 'MAKEARRAY', 'MAP', 'MAXIFS', 'MINIFS', 'MODE.MULT', 'MODE.SNGL', 'MUNIT', 'NEGBINOM.DIST', 'NORM.DIST', 'NORM.INV', 'NORM.S.DIST', 'NORM.S.INV', 'NUMBERVALUE', 'PDURATION', 'PERCENTILE.EXC', 'PERCENTILE.INC', 'PERCENTRANK.EXC', 'PERCENTRANK.INC', 'PERMUTATIONA', 'PHI', 'POISSON.DIST', 'QUARTILE.EXC', 'QUARTILE.INC', 'RANDARRAY', 'RANK.AVG', 'RANK.EQ', 'REDUCE', 'RRI', 'SCAN', 'SEC', 'SECH', 'SEQUENCE', 'SHEET', 'SHEETS', 'SKEW.P', 'SORT', 'SORTBY', 'STDEV.P', 'STDEV.S', 'SWITCH', 'T.DIST', 'T.DIST.2T', 'T.DIST.RT', 'T.INV', 'T.INV.2T', 'T.TEST', 'TAKE', 'TEXTAFTER', 'TEXTBEFORE', 'TEXTJOIN', 'TEXTSPLIT', 'TOCOL', 'TOROW', 'UNICHAR', 'UNICODE', 'UNIQUE', 'VAR.P', 'VAR.S', 'VSTACK', 'WEBSERVICE', 'WEIBULL.DIST', 'WORKDAY.INTL', 'WRAPCOLS', 'WRAPROWS', 'XLOOKUP', 'XMATCH', 'XOR', 'Z.TEST', 'NETWORKDAYS.INTL', 'ACOT', 'ACOTH', 'ARRAYTOTEXT', 'VALUETOTEXT', 'IMAGE', 'ISOMITTED'];
const FUTURE_RE = new RegExp('(^|[^A-Za-z0-9_.])(' + FUTURE_FUNCS.map((f) => f.replace(/\./g, '\\.')).sort((a, b) => b.length - a.length).join('|') + ')\\s*\\(', 'gi');
export function addFormulaPrefixes(f) {
  // dize sabitlerinin içini değiştirmemek için tırnaklı bölümleri atla
  return f.split(/("(?:[^"]|"")*")/).map((part, i) => (i % 2 ? part : part.replace(FUTURE_RE, (m, pre, name) => `${pre}_xlfn.${name.toUpperCase()}(`))).join('');
}

// A1 başvuruları
export function colToIndex(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
export function indexToCol(i) {
  let s = ''; i += 1;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}
export function decodeA1Cell(a) {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(String(a).trim());
  if (!m) return null;
  return { r: parseInt(m[2], 10) - 1, c: colToIndex(m[1]) };
}
export function a1ToRange(ref) {
  const s = String(ref).replace(/^.*!/, '').trim();
  const [a, b] = s.split(':');
  const p = decodeA1Cell(a);
  if (!p) return null;
  const q = b ? decodeA1Cell(b) : p;
  if (!q) return null;
  return { startRow: Math.min(p.r, q.r), endRow: Math.max(p.r, q.r), startColumn: Math.min(p.c, q.c), endColumn: Math.max(p.c, q.c) };
}
export function rangeToA1(r) {
  const a = indexToCol(r.startColumn) + (r.startRow + 1);
  const b = indexToCol(r.endColumn) + (r.endRow + 1);
  return a === b ? a : `${a}:${b}`;
}
