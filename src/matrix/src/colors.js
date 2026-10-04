// Excel renk yardımcıları: ARGB, tema rengi + ton (tint), dizinli palet
export const INDEXED = [
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080',
  '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF',
  '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
  '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696',
  '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333',
];

// Office 2013+ varsayılan tema (tema XML okunamazsa)
export const DEFAULT_THEME = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47', '0563C1', '954F72'];

// theme1.xml içinden renk şemasını çıkar. Excel tema dizini: 0=lt1 1=dk1 2=lt2 3=dk2 4-9=accent1-6 10=hlink 11=folHlink
export function parseThemeColors(xml) {
  if (!xml || typeof xml !== 'string') return DEFAULT_THEME.slice();
  const pick = (tag) => {
    const re = new RegExp(`<a:${tag}>([\\s\\S]*?)</a:${tag}>`);
    const m = re.exec(xml);
    if (!m) return null;
    const s = /<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/.exec(m[1]);
    if (s) return s[1].toUpperCase();
    const sys = /<a:sysClr[^>]*lastClr="([0-9A-Fa-f]{6})"/.exec(m[1]);
    if (sys) return sys[1].toUpperCase();
    return null;
  };
  const order = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
  return order.map((t, i) => pick(t) || DEFAULT_THEME[i]);
}

function rgbToHls(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, l, s];
}
function hlsToRgb(h, l, s) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map((x) => Math.round(x * 255));
}
export function applyTint(hex, tint) {
  if (!tint) return hex;
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  let [h, l, s] = rgbToHls(r, g, b);
  if (tint < 0) l = l * (1 + tint); else l = l * (1 - tint) + tint;
  const [R, G, B] = hlsToRgb(h, Math.max(0, Math.min(1, l)), s);
  return [R, G, B].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ExcelJS renk nesnesi -> '#RRGGBB' (bilinmiyorsa null)
export function excelColorToHex(c, theme) {
  if (!c) return null;
  let hex = null;
  if (c.argb && typeof c.argb === 'string') {
    const a = c.argb.replace('#', '');
    hex = a.length === 8 ? a.slice(2) : a.length === 6 ? a : null;
  } else if (c.theme !== undefined && c.theme !== null) {
    hex = (theme || DEFAULT_THEME)[c.theme] || null;
  } else if (c.indexed !== undefined && c.indexed !== null) {
    if (c.indexed === 64 || c.indexed === 65) return null; // sistem ön/arka plan
    hex = INDEXED[c.indexed] || null;
  }
  if (!hex) return null;
  if (c.tint) hex = applyTint(hex, c.tint);
  return '#' + hex.toUpperCase();
}

// '#rgb' / '#rrggbb' / 'rgb(r,g,b)' / 'rgba(...)' -> 'FFRRGGBB'
export function cssToArgb(css) {
  if (!css || typeof css !== 'string') return null;
  const s = css.trim();
  let m = /^#?([0-9a-f]{6})$/i.exec(s);
  if (m) return 'FF' + m[1].toUpperCase();
  m = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);
  if (m) return 'FF' + (m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toUpperCase();
  m = /^#?([0-9a-f]{8})$/i.exec(s); // #RRGGBBAA
  if (m) return (m[1].slice(6) + m[1].slice(0, 6)).toUpperCase();
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
  if (m) return 'FF' + [m[1], m[2], m[3]].map((x) => Math.min(255, +x).toString(16).padStart(2, '0')).join('').toUpperCase();
  const named = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080', grey: '808080', orange: 'FFA500' };
  if (named[s.toLowerCase()]) return 'FF' + named[s.toLowerCase()];
  return null;
}
