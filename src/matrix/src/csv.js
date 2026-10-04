// CSV içe/dışa aktarma
import { LocaleType } from '@univerjs/presets';
import { uid, emptySheet, DEFAULT_FONT, DEFAULT_FONT_SIZE, DEFAULT_ROWS, DEFAULT_COLS } from './defaults.js';
import { isDateFormat } from './xlsx-common.js';

// ---------------------------------------------------------------- kod çözme
export function decodeText(bytes) {
  let b = bytes;
  if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return new TextDecoder('utf-8').decode(b.subarray(3));
  if (b[0] === 0xFF && b[1] === 0xFE) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder('utf-16be').decode(b.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch (_) {
    // UTF-8 değil: Türkçe Windows kod sayfası (windows-1254) dene
    try { return new TextDecoder('windows-1254').decode(b); } catch (_) { return new TextDecoder('iso-8859-9').decode(b); }
  }
}

// ---------------------------------------------------------------- ayrıştırma
export function detectDelimiter(text) {
  const sample = text.slice(0, 64 * 1024);
  const lines = [];
  let cur = '', q = false;
  for (let i = 0; i < sample.length && lines.length < 30; i++) {
    const ch = sample[i];
    if (ch === '"') q = !q;
    if (!q && (ch === '\n' || ch === '\r')) { if (cur) lines.push(cur); cur = ''; if (ch === '\r' && sample[i + 1] === '\n') i++; continue; }
    cur += ch;
  }
  if (cur && lines.length < 30) lines.push(cur);
  const cands = [',', ';', '\t', '|'];
  let best = ',', bestScore = -1;
  for (const d of cands) {
    const counts = lines.map((l) => countOutsideQuotes(l, d));
    const nonZero = counts.filter((c) => c > 0);
    if (!nonZero.length) continue;
    // tutarlılık: en sık görülen sayıya eşit satır oranı * ortalama
    const freq = {};
    nonZero.forEach((c) => { freq[c] = (freq[c] || 0) + 1; });
    const [mode, modeCount] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    const score = (modeCount / lines.length) * 10 + Math.min(+mode, 50) / 50;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}
function countOutsideQuotes(line, d) {
  let n = 0, q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (!q && ch === d) n++; }
  return n;
}

export function parseCsv(text, delim) {
  const rows = [];
  let row = [], field = '', i = 0, q = false;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        q = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { q = true; i++; continue; }
    if (ch === delim) { row.push(field); field = ''; i++; continue; }
    if (ch === '\r' || ch === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++; continue;
    }
    field += ch; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---------------------------------------------------------------- değer tanıma
function toSerial(y, m, d, hh = 0, mi = 0, ss = 0) {
  const t = Date.UTC(y, m - 1, d, hh, mi, ss);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return t / 86400000 + 25569;
}

function typedValue(raw, delim) {
  let s = raw.trim();
  if (s === '') return null;
  // Türkçe yazımda yüzde işareti başta olabilir: %12 -> 12%
  if (/^-?%\s?\d/.test(s)) s = s.replace(/^(-?)%\s?/, '$1') + '%';
  // baştaki sıfırları ve uzun rakam dizilerini (telefon, IBAN, kimlik) metin olarak koru
  if (/^0\d+$/.test(s) || /^\d{16,}$/.test(s)) return { v: raw, t: 1 };
  let m;
  const trNumbers = delim === ';' || delim === '\t';
  if (trNumbers) {
    // Türkçe biçim: 1.234,56  veya 1234,56
    if ((m = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(%?)$/.exec(s))) {
      const num = parseFloat(m[1] + m[2].replace(/\./g, '') + (m[3] ? '.' + m[3] : ''));
      if (Number.isFinite(num)) return m[4] ? { v: num / 100, t: 2, n: m[3] ? '0.' + '0'.repeat(m[3].length) + '%' : '0%' } : { v: num, t: 2 };
    }
  }
  if ((m = /^(-?)(\d+)(?:\.(\d+))?(%?)$/.exec(s)) && !(trNumbers && /^\d{1,3}\.\d{3}$/.test(s))) {
    const num = parseFloat(m[1] + m[2] + (m[3] ? '.' + m[3] : ''));
    if (Number.isFinite(num)) return m[4] ? { v: num / 100, t: 2, n: m[3] ? '0.' + '0'.repeat(m[3].length) + '%' : '0%' } : { v: num, t: 2 };
  }
  if (!trNumbers && (m = /^(-?)(\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$/.exec(s))) {
    const num = parseFloat(m[1] + m[2].replace(/,/g, '') + (m[3] ? '.' + m[3] : ''));
    if (Number.isFinite(num)) return { v: num, t: 2, n: m[3] ? '#,##0.' + '0'.repeat(m[3].length) : '#,##0' };
  }
  // tarih: gg.aa.yyyy [ss:dd[:ss]]
  if ((m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s))) {
    const ser = toSerial(+m[3], +m[2], +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    if (ser !== null) return { v: ser, t: 2, n: m[4] ? 'dd.mm.yyyy hh:mm' : 'dd.mm.yyyy' };
  }
  // ISO: yyyy-aa-gg[ ss:dd]
  if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s))) {
    const ser = toSerial(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    if (ser !== null) return { v: ser, t: 2, n: m[4] ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd' };
  }
  const up = s.toLocaleUpperCase('tr-TR');
  if (up === 'TRUE' || up === 'DOĞRU') return { v: 1, t: 3 };
  if (up === 'FALSE' || up === 'YANLIŞ') return { v: 0, t: 3 };
  return { v: raw, t: 1 };
}

export function csvToWorkbook(bytes, fileName) {
  const text = decodeText(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const delim = /\.tsv$/i.test(fileName || '') ? '\t' : detectDelimiter(text);
  const rows = parseCsv(text, delim);
  // sondaki boş satırları at
  while (rows.length && rows[rows.length - 1].every((x) => x === '')) rows.pop();

  const styles = {};
  const fmtIds = {};
  const fmtStyle = (pattern) => {
    if (!fmtIds[pattern]) { const id = 'f' + Object.keys(fmtIds).length; fmtIds[pattern] = id; styles[id] = { n: { pattern } }; }
    return fmtIds[pattern];
  };
  const cellData = {};
  let maxCol = 0;
  rows.forEach((row, r) => {
    row.forEach((raw, c) => {
      const tv = typedValue(raw, delim);
      if (!tv) return;
      const cell = { v: tv.v, t: tv.t };
      if (tv.n) cell.s = fmtStyle(tv.n);
      (cellData[r] ||= {})[c] = cell;
      maxCol = Math.max(maxCol, c + 1);
    });
  });
  const sid = uid('sh');
  const name = (fileName || 'Sayfa1').replace(/\.[^.]+$/, '').replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || 'Sayfa1';
  const sheet = emptySheet(sid, name, {
    cellData,
    rowCount: Math.max(DEFAULT_ROWS, rows.length + 100),
    columnCount: Math.max(DEFAULT_COLS, maxCol + 5),
  });
  return {
    id: uid('wb'), name, appVersion: '1.0.0', locale: LocaleType.EN_US,
    styles, defaultStyle: { ff: DEFAULT_FONT, fs: DEFAULT_FONT_SIZE },
    sheetOrder: [sid], sheets: { [sid]: sheet },
    __csvDelimiter: delim,
  };
}

// ---------------------------------------------------------------- dışa aktarma
// Seçim: varsayılan "," + UTF-8 BOM (Excel BOM'u görünce UTF-8 olarak açar, Türkçe karakterler bozulmaz).
// ";" seçeneği Türkçe bölgesel ayarlı Excel'de çift tıklamayla doğrudan sütunlara ayrılır (ondalık ayırıcı ",").
export function workbookToCsv(snap, sheetId, delim, displayValues) {
  const sh = snap.sheets[sheetId];
  if (!sh) throw new Error('Etkin sayfa bulunamadı.');
  const styles = snap.styles || {};
  const cd = sh.cellData || {};
  let maxR = -1, maxC = -1;
  for (const [r, row] of Object.entries(cd)) {
    for (const [c, cell] of Object.entries(row || {})) {
      if (cell && (cell.v !== undefined && cell.v !== null && cell.v !== '' || cell.p)) { maxR = Math.max(maxR, +r); maxC = Math.max(maxC, +c); }
    }
  }
  const lines = [];
  const decimalComma = delim === ';';
  for (let r = 0; r <= maxR; r++) {
    const out = [];
    for (let c = 0; c <= maxC; c++) {
      const cell = cd[r] && cd[r][c];
      let s = '';
      if (cell) {
        const st = typeof cell.s === 'string' ? styles[cell.s] : cell.s;
        const pattern = st && st.n && st.n.pattern;
        let v = cell.v;
        if ((v === undefined || v === null) && cell.p && cell.p.body) v = cell.p.body.dataStream.replace(/\r\n$/, '').replace(/\r/g, '\n');
        if (cell.t === 3) s = (v === 1 || v === true || v === '1' || String(v).toUpperCase() === 'TRUE') ? 'TRUE' : 'FALSE';
        else if (typeof v === 'number' || cell.t === 2) {
          if (pattern && isDateFormat(pattern) && displayValues && displayValues[r] && displayValues[r][c] !== undefined) s = String(displayValues[r][c]);
          else {
            const n = Number(v);
            s = Number.isFinite(n) ? String(+n.toPrecision(15)) : String(v);
            if (decimalComma) s = s.replace('.', ',');
          }
        } else if (v !== undefined && v !== null) s = String(v);
      }
      out.push(quote(s, delim));
    }
    lines.push(out.join(delim));
  }
  const text = '﻿' + lines.join('\r\n') + (lines.length ? '\r\n' : '');
  return new TextEncoder().encode(text);
}

function quote(s, delim) {
  if (s === '') return '';
  if (s.includes(delim) || s.includes('"') || s.includes('\n') || s.includes('\r') || /^\s|\s$/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
