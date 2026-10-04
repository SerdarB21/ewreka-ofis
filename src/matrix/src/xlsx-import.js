// .xlsx / .xlsm -> Univer IWorkbookData (ExcelJS ile)
import ExcelJS from 'exceljs';
import { LocaleType } from '@univerjs/presets';
import { excelColorToHex, parseThemeColors } from './colors.js';
import { normalizeXlsx } from './xlsx-normalize.js';
import { importConditionalFormats } from './cf.js';
import { uid, emptySheet, DEFAULT_FONT, DEFAULT_FONT_SIZE, DEFAULT_ROWS, DEFAULT_COLS } from './defaults.js';
import { BORDER_FROM_EXCEL, H_ALIGN_FROM_EXCEL, V_ALIGN_FROM_EXCEL, UNDERLINE_FROM_EXCEL, colWidthToPx, rowHeightToPx, dateToSerial, normalizeNumFmt, stripFormulaPrefixes, a1ToRange, decodeA1Cell, isDateFormat } from './xlsx-common.js';

const CT = { STRING: 1, NUMBER: 2, BOOLEAN: 3, FORCE_STRING: 4 };

export async function xlsxToWorkbook(data, fileName) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4B)) throw new Error('Dosya bir Excel çalışma kitabı (.xlsx) değil. Eski .xls biçimi desteklenmiyor.');
  let wb = null;
  let lastErr = null;
  // 1) ExcelJS paket düzenine göre düzeltilmiş kopya, 2) notlar çıkarılmış kopya (son çare)
  for (const attempt of [{}, { dropComments: true }]) {
    try {
      const fixed = normalizeXlsx(bytes, attempt);
      wb = new ExcelJS.Workbook();
      await wb.xlsx.load(fixed.buffer.slice(fixed.byteOffset, fixed.byteOffset + fixed.byteLength));
      if (attempt.dropComments) console.warn('[matrix] notlar okunamadı, notsuz açıldı');
      break;
    } catch (err) { console.warn('[matrix] xlsx yükleme denemesi başarısız', err); lastErr = err; wb = null; }
  }
  if (!wb) throw new Error('Dosya geçerli bir Excel çalışma kitabı değil ya da bozuk (' + (lastErr && lastErr.message ? lastErr.message : lastErr) + ')');
  const theme = parseThemeColors(wb._themes && (wb._themes.theme1 || Object.values(wb._themes)[0]));
  const date1904 = !!(wb.properties && wb.properties.date1904);

  const styles = {};
  const styleKeys = new Map();
  const styleId = (obj) => {
    if (!obj) return undefined;
    const key = JSON.stringify(obj);
    let id = styleKeys.get(key);
    if (!id) { id = 's' + styleKeys.size.toString(36); styleKeys.set(key, id); styles[id] = obj; }
    return id;
  };

  const out = {
    id: uid('wb'),
    name: (fileName || 'Tablo').replace(/\.[^.]+$/, ''),
    appVersion: '1.0.0',
    locale: LocaleType.EN_US,
    styles,
    defaultStyle: { ff: DEFAULT_FONT, fs: DEFAULT_FONT_SIZE },
    sheetOrder: [],
    sheets: {},
    resources: [],
  };
  if (date1904) out.dateSystem = 'date1904';

  const nameToId = {};
  const notesRes = {};
  const filterRes = {};
  const dvRes = {};
  const cfRes = {};
  const hyperlinksInternal = [];
  const sheets = wb.worksheets;
  if (!sheets.length) throw new Error('Çalışma kitabında sayfa yok.');

  // önce sayfa kimlikleri (iç bağlantılar için)
  for (const ws of sheets) { const id = uid('sh'); nameToId[ws.name] = id; ws.__uid = id; }

  for (const ws of sheets) {
    const sid = ws.__uid;
    const props = ws.properties || {};
    const view = (ws.views && ws.views[0]) || {};
    const defColW = props.defaultColWidth ? colWidthToPx(props.defaultColWidth) : 64;
    const defRowH = rowHeightToPx(props.defaultRowHeight || 15);
    const sheet = emptySheet(sid, ws.name, {
      defaultColumnWidth: defColW,
      defaultRowHeight: defRowH,
      hidden: ws.state && ws.state !== 'visible' ? 1 : 0,
      tabColor: excelColorToHex(props.tabColor, theme) || '',
      showGridlines: view.showGridLines === false ? 0 : 1,
      zoomRatio: view.zoomScale ? Math.max(0.1, Math.min(4, view.zoomScale / 100)) : 1,
      rightToLeft: view.rightToLeft ? 1 : 0,
    });

    // donmuş bölmeler
    if (view.state === 'frozen' && (view.xSplit || view.ySplit)) {
      const xs = view.xSplit || 0, ys = view.ySplit || 0;
      sheet.freeze = { xSplit: xs, ySplit: ys, startRow: ys, startColumn: xs };
    }

    // sütunlar
    let maxCol = 0;
    const cols = ws.columns || [];
    cols.forEach((col, i) => {
      if (!col) return;
      const cd = {};
      if (col.width !== undefined && col.width !== null && (col.isCustomWidth || Math.abs(col.width - (props.defaultColWidth || 9.140625)) > 0.01)) cd.w = colWidthToPx(col.width);
      if (col.hidden) cd.hd = 1;
      const cs = convertStyle(col.style, theme);
      if (cs) cd.s = styleId(cs);
      if (Object.keys(cd).length) { sheet.columnData[i] = cd; maxCol = Math.max(maxCol, i + 1); }
    });

    // satırlar ve hücreler
    let maxRow = 0;
    const cellData = sheet.cellData;
    const autoRows = new Set();
    ws.eachRow({ includeEmpty: true }, (row, rn) => {
      const r = rn - 1;
      const rd = {};
      if (row.height !== undefined && row.height !== null && (row.customHeight || Math.abs(row.height - (props.defaultRowHeight || 15)) > 0.01)) { rd.h = rowHeightToPx(row.height); rd.ia = 0; }
      if (row.hidden) rd.hd = 1;
      if (Object.keys(rd).length) sheet.rowData[r] = rd;
      row.eachCell({ includeEmpty: true }, (cell, cn) => {
        const c = cn - 1;
        const cellOut = convertCell(cell, theme, date1904, styleId, nameToId, hyperlinksInternal, sid, r, c);
        if (!cellOut) return;
        if (!rd.h && (cellOut.v !== undefined || cellOut.p) && styles[cellOut.s] && styles[cellOut.s].tb === 3) autoRows.add(r);
        if (!cellData[r]) cellData[r] = {};
        cellData[r][c] = cellOut;
        maxRow = Math.max(maxRow, r + 1);
        maxCol = Math.max(maxCol, c + 1);
        if (cell.note) {
          const text = typeof cell.note === 'string' ? cell.note : (cell.note.texts || []).map((t) => t.text || '').join('');
          if (text) {
            (notesRes[sid] ||= {});
            (notesRes[sid][r] ||= {});
            notesRes[sid][r][c] = { id: uid('n'), row: r, col: c, width: 200, height: 100, note: text, show: false };
          }
        }
      });
      if (Object.keys(rd).length) maxRow = Math.max(maxRow, r + 1);
    });

    // birleştirmeler
    const merges = Object.values(ws._merges || {});
    for (const m of merges) {
      const mm = m.model || m;
      if (!mm || !mm.top) continue;
      sheet.mergeData.push({ startRow: mm.top - 1, endRow: mm.bottom - 1, startColumn: mm.left - 1, endColumn: mm.right - 1 });
      maxRow = Math.max(maxRow, mm.bottom); maxCol = Math.max(maxCol, mm.right);
    }

    // otomatik filtre
    if (ws.autoFilter) {
      let ref = null;
      if (typeof ws.autoFilter === 'string') ref = a1ToRange(ws.autoFilter);
      else if (ws.autoFilter.from && ws.autoFilter.to) {
        const f = typeof ws.autoFilter.from === 'string' ? decodeA1Cell(ws.autoFilter.from) : { r: ws.autoFilter.from.row - 1, c: ws.autoFilter.from.column - 1 };
        const t = typeof ws.autoFilter.to === 'string' ? decodeA1Cell(ws.autoFilter.to) : { r: ws.autoFilter.to.row - 1, c: ws.autoFilter.to.column - 1 };
        ref = { startRow: f.r, startColumn: f.c, endRow: t.r, endColumn: t.c };
      }
      if (ref) filterRes[sid] = { ref };
    }

    // veri doğrulama (liste, tam sayı, ondalık, tarih, metin uzunluğu, özel)
    try {
      const dvs = ws.dataValidations && ws.dataValidations.model;
      if (dvs && Object.keys(dvs).length) {
        const rules = convertDataValidations(dvs);
        if (rules.length) dvRes[sid] = rules;
      }
    } catch (e) { console.warn('[matrix] veri doğrulama okunamadı', e); }

    // kaydırılmış metin içeren ve özel yüksekliği olmayan satırlar: Excel gibi açılışta otomatik yükseklik
    if (autoRows.size) (out.__autoRows ||= {})[sid] = [...autoRows].filter((r) => !(merges.some((m) => { const mm = m.model || m; return mm && r + 1 >= mm.top && r + 1 <= mm.bottom && mm.bottom > mm.top; }))).sort((a, b) => a - b);
    // koşullu biçimlendirme
    try {
      const cfr = importConditionalFormats(ws.conditionalFormattings, theme);
      if (cfr.length) cfRes[sid] = cfr;
    } catch (e) { console.warn('[matrix] koşullu biçimlendirme okunamadı', e); }

    sheet.rowCount = Math.max(DEFAULT_ROWS, maxRow + 100);
    sheet.columnCount = Math.max(DEFAULT_COLS, maxCol + 5);
    out.sheets[sid] = sheet;
    out.sheetOrder.push(sid);
  }
  out.styles = styles;

  // tanımlı adlar
  try {
    const dn = wb.definedNames && wb.definedNames.model;
    if (dn && dn.length) {
      const map = {};
      for (const d of dn) {
        if (!d.name || d.name.startsWith('_xlnm.')) continue;
        const ref = (d.ranges || []).join(',');
        if (!ref) continue;
        const id = uid('dn');
        const item = { id, name: d.name, formulaOrRefString: ref };
        if (d.localSheetId !== undefined && sheets[d.localSheetId]) item.localSheetId = sheets[d.localSheetId].__uid;
        map[id] = item;
      }
      if (Object.keys(map).length) out.resources.push({ name: 'SHEET_DEFINED_NAME_PLUGIN', data: JSON.stringify(map) });
    }
  } catch (e) { console.warn('[matrix] tanımlı adlar okunamadı', e); }

  if (Object.keys(notesRes).length) out.resources.push({ name: 'SHEET_NOTE_PLUGIN', data: JSON.stringify(notesRes) });
  if (Object.keys(filterRes).length) out.resources.push({ name: 'SHEET_FILTER_PLUGIN', data: JSON.stringify(filterRes) });
  if (Object.keys(cfRes).length) out.resources.push({ name: 'SHEET_CONDITIONAL_FORMATTING_PLUGIN', data: JSON.stringify(cfRes) });
  if (Object.keys(dvRes).length) out.resources.push({ name: 'SHEET_DATA_VALIDATION_PLUGIN', data: JSON.stringify(dvRes) });

  // etkin sayfa: Univer sheetOrder'daki ilk görünür sayfayı etkin yapar; dosyadaki etkin sayfayı ayrıca döndür
  const activeTab = wb.views && wb.views[0] && wb.views[0].activeTab;
  if (typeof activeTab === 'number' && sheets[activeTab]) out.__activeSheetId = sheets[activeTab].__uid;
  return out;
}

// ------------------------------------------------------------------ hücre
function convertCell(cell, theme, date1904, styleId, nameToId, links, sid, r, c) {
  const V = ExcelJS.ValueType;
  const style = convertStyle(cell.style, theme);
  const out = {};
  let value = cell.value;
  const type = cell.type;

  if (type === V.Merge) {
    // birleştirilmiş alanın ikincil hücresi: yalnızca biçim (kenarlıklar için)
    if (style) out.s = styleId(style);
    return Object.keys(out).length ? out : null;
  }

  if (type === V.Formula || (value && typeof value === 'object' && ('formula' in value || 'sharedFormula' in value))) {
    let f = null;
    try { f = cell.formula; } catch (_) { f = value && value.formula; }
    if (f) out.f = '=' + stripFormulaPrefixes(String(f).replace(/^=/, ''));
    let res = value ? value.result : undefined;
    if (res && typeof res === 'object' && res.error) res = res.error;
    if (res instanceof Date) { res = dateToSerial(res, date1904); if (style && !(style.n && style.n.pattern)) style.n = { pattern: 'dd.mm.yyyy' }; }
    if (typeof res === 'number') { out.v = res; out.t = CT.NUMBER; }
    else if (typeof res === 'boolean') { out.v = res ? 1 : 0; out.t = CT.BOOLEAN; }
    else if (typeof res === 'string') { out.v = res; out.t = CT.STRING; }
    if (value && value.shareType === 'array' && value.ref) out.ref = value.ref;
  } else if (value === null || value === undefined) {
    // boş, yalnızca biçim
  } else if (typeof value === 'number') {
    out.v = value; out.t = CT.NUMBER;
  } else if (typeof value === 'string') {
    out.v = value; out.t = CT.STRING;
  } else if (typeof value === 'boolean') {
    out.v = value ? 1 : 0; out.t = CT.BOOLEAN;
  } else if (value instanceof Date) {
    out.v = dateToSerial(value, date1904); out.t = CT.NUMBER;
    const st = style || {};
    if (!st.n || !st.n.pattern || !isDateFormat(st.n.pattern)) st.n = { pattern: hasTime(value) ? 'dd.mm.yyyy hh:mm' : 'dd.mm.yyyy' };
    out.s = styleId(st);
    return out;
  } else if (value.richText) {
    const p = richTextToDoc(value.richText, theme);
    out.p = p; out.v = p.body.dataStream.replace(/\r\n$/, ''); out.t = CT.STRING;
  } else if (value.hyperlink !== undefined) {
    const text = value.text && typeof value.text === 'object' && value.text.richText ? value.text.richText.map((x) => x.text).join('') : String(value.text ?? value.hyperlink ?? '');
    let url = String(value.hyperlink || '');
    if (url.startsWith('#')) url = internalLink(url, nameToId);
    out.v = text; out.t = CT.STRING;
    if (url) out.p = linkDoc(text, url, value.tooltip);
  } else if (value.error) {
    out.v = value.error; out.t = CT.STRING;
  } else if (value.text !== undefined) {
    out.v = String(value.text); out.t = CT.STRING;
  }
  if (style) out.s = styleId(style);
  return Object.keys(out).length ? out : null;
}

function hasTime(d) { return d.getUTCHours() || d.getUTCMinutes() || d.getUTCSeconds(); }

function internalLink(url, nameToId) {
  // "#'Sayfa 2'!A1" -> Univer "#gid=<id>&range=A1"
  const m = /^#(?:'((?:[^']|'')+)'|([^!]+))!(.+)$/.exec(url);
  if (!m) return url;
  const name = (m[1] || m[2] || '').replace(/''/g, "'");
  const id = nameToId[name];
  if (!id) return url;
  return `#gid=${id}&range=${m[3].replace(/\$/g, '')}`;
}

function linkDoc(text, url, tooltip) {
  const t = text || url;
  const rid = uid('lk');
  return {
    id: uid('d'),
    documentStyle: {},
    body: {
      dataStream: t + '\r\n',
      textRuns: [],
      paragraphs: [{ startIndex: t.length }],
      customRanges: [{ startIndex: 0, endIndex: t.length - 1, rangeType: 0, rangeId: rid, properties: { url, ...(tooltip ? { tooltip } : {}) } }],
    },
  };
}

function richTextToDoc(runs, theme) {
  let ds = '';
  const textRuns = [];
  for (const run of runs) {
    const text = String(run.text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r');
    if (!text) continue;
    const st = ds.length;
    ds += text;
    const ts = run.font ? fontToStyle(run.font, theme) : null;
    if (ts && Object.keys(ts).length) textRuns.push({ st, ed: ds.length, ts });
  }
  // Univer belge modelinde "\r" paragraf ayırıcıdır; hücre içi satır sonları "\r" olarak tutulur
  const paragraphs = [];
  for (let i = 0; i < ds.length; i++) if (ds[i] === '\r') paragraphs.push({ startIndex: i });
  paragraphs.push({ startIndex: ds.length });
  return { id: uid('d'), documentStyle: {}, body: { dataStream: ds + '\r\n', textRuns, paragraphs } };
}

// ------------------------------------------------------------------ stil
function fontToStyle(font, theme) {
  const s = {};
  if (!font) return s;
  if (font.name) s.ff = font.name;
  if (font.size) s.fs = font.size;
  if (font.bold) s.bl = 1;
  if (font.italic) s.it = 1;
  if (font.underline && font.underline !== 'none') {
    const t = UNDERLINE_FROM_EXCEL[font.underline === true ? 'single' : font.underline];
    s.ul = t === undefined ? { s: 1 } : { s: 1, t };
  }
  if (font.strike) s.st = { s: 1 };
  if (font.vertAlign === 'superscript') s.va = 3;
  else if (font.vertAlign === 'subscript') s.va = 2;
  const cl = excelColorToHex(font.color, theme);
  if (cl && cl !== '#000000') s.cl = { rgb: cl };
  return s;
}

export function convertStyle(st, theme) {
  if (!st) return null;
  const s = fontToStyle(st.font, theme);
  // dolgu
  const fill = st.fill;
  if (fill) {
    if (fill.type === 'pattern' && fill.pattern && fill.pattern !== 'none') {
      const col = excelColorToHex(fill.fgColor, theme) || (fill.pattern !== 'solid' ? excelColorToHex(fill.bgColor, theme) : null);
      if (col) s.bg = { rgb: col };
    } else if (fill.type === 'gradient' && fill.stops && fill.stops.length) {
      const col = excelColorToHex(fill.stops[0].color, theme);
      if (col) s.bg = { rgb: col };
    }
  }
  // kenarlıklar
  const b = st.border;
  if (b) {
    const bd = {};
    const side = (x) => {
      if (!x || !x.style) return null;
      const t = BORDER_FROM_EXCEL[x.style];
      if (!t) return null;
      return { s: t, cl: { rgb: excelColorToHex(x.color, theme) || '#000000' } };
    };
    const t = side(b.top), r = side(b.right), btm = side(b.bottom), l = side(b.left);
    if (t) bd.t = t; if (r) bd.r = r; if (btm) bd.b = btm; if (l) bd.l = l;
    if (b.diagonal && b.diagonal.style) {
      const d = side(b.diagonal);
      if (d && b.diagonal.down) bd.tl_br = d;
      if (d && b.diagonal.up) bd.bl_tr = d;
    }
    if (Object.keys(bd).length) s.bd = bd;
  }
  // hizalama
  const a = st.alignment;
  if (a) {
    if (a.horizontal && H_ALIGN_FROM_EXCEL[a.horizontal] !== undefined) s.ht = H_ALIGN_FROM_EXCEL[a.horizontal];
    if (a.vertical && V_ALIGN_FROM_EXCEL[a.vertical] !== undefined) s.vt = V_ALIGN_FROM_EXCEL[a.vertical];
    if (a.wrapText) s.tb = 3; // WRAP
    if (a.shrinkToFit) s.stf = 1;
    if (a.textRotation === 'vertical') s.tr = { a: 0, v: 1 };
    else if (typeof a.textRotation === 'number' && a.textRotation) {
      // ExcelJS: pozitif = yukarı (saat yönü tersine). Univer: negatif = yukarı.
      let deg = a.textRotation;
      if (deg > 90) deg = 90 - deg; // 91..180 -> aşağı
      s.tr = { a: -deg };
    }
    if (a.indent) s.pd = { l: 2 + a.indent * 9 };
  }
  // sayı biçimi
  if (st.numFmt && st.numFmt !== 'General') s.n = { pattern: normalizeNumFmt(st.numFmt) };
  return Object.keys(s).length ? s : null;
}

// ------------------------------------------------------------------ veri doğrulama
function convertDataValidations(model) {
  const OPS = { between: 'between', notBetween: 'notBetween', equal: 'equal', notEqual: 'notEqual', greaterThan: 'greaterThan', lessThan: 'lessThan', greaterThanOrEqual: 'greaterThanOrEqual', lessThanOrEqual: 'lessThanOrEqual' };
  const TYPES = { list: 'list', whole: 'whole', decimal: 'decimal', date: 'date', textLength: 'textLength', custom: 'custom' };
  const groups = new Map();
  for (const [addr, dv] of Object.entries(model)) {
    if (!dv || !TYPES[dv.type]) continue;
    const key = JSON.stringify(dv);
    if (!groups.has(key)) groups.set(key, { dv, cells: [], ranges: [] });
    for (const part of addr.replace(/^range:/, '').split(/\s+/)) {
      const rg = a1ToRange(part);
      if (!rg) continue;
      if (rg.startRow === rg.endRow && rg.startColumn === rg.endColumn) groups.get(key).cells.push([rg.startRow, rg.startColumn]);
      else groups.get(key).ranges.push(rg);
    }
  }
  for (const g of groups.values()) g.ranges.push(...cellsToRanges(g.cells));
  const rules = [];
  for (const { dv, ranges } of groups.values()) {
    if (!ranges.length) continue;
    const f = (dv.formulae || []).map((x) => (x instanceof Date ? String(dateToSerial(x, false)) : String(x)));
    const rule = { uid: uid('dv'), type: TYPES[dv.type], ranges, allowBlank: dv.allowBlank !== false, showErrorMessage: !!dv.showErrorMessage, showInputMessage: !!dv.showInputMessage };
    if (dv.error) rule.error = dv.error;
    if (dv.errorTitle) rule.errorTitle = dv.errorTitle;
    if (dv.prompt) rule.prompt = dv.prompt;
    if (dv.promptTitle) rule.promptTitle = dv.promptTitle;
    if (dv.errorStyle === 'warning') rule.errorStyle = 2; else if (dv.errorStyle === 'information') rule.errorStyle = 0; else rule.errorStyle = 1;
    if (dv.type === 'list') {
      const src = f[0] || '';
      if (/^".*"$/.test(src)) rule.formula1 = src.slice(1, -1); // sabit liste "a,b,c"
      else rule.formula1 = '=' + src.replace(/^=/, '');
      rule.renderMode = 1; // ok simgesi (Excel benzeri)
    } else if (dv.type === 'custom') {
      rule.formula1 = '=' + (f[0] || '').replace(/^=/, '');
    } else {
      rule.operator = OPS[dv.operator || 'between'] || 'between';
      if (f[0] !== undefined) rule.formula1 = f[0];
      if (f[1] !== undefined) rule.formula2 = f[1];
    }
    rules.push(rule);
  }
  return rules;
}

// tek hücre listesini dikdörtgen aralıklara sıkıştır
function cellsToRanges(cells) {
  if (!cells.length) return [];
  const byCol = new Map();
  for (const [r, c] of cells) { if (!byCol.has(c)) byCol.set(c, []); byCol.get(c).push(r); }
  const runs = []; // {c, r0, r1}
  for (const [c, rows] of byCol) {
    rows.sort((a, b) => a - b);
    let r0 = rows[0], prev = rows[0];
    for (let i = 1; i <= rows.length; i++) {
      if (i < rows.length && rows[i] === prev + 1) { prev = rows[i]; continue; }
      runs.push({ c, r0, r1: prev });
      if (i < rows.length) { r0 = prev = rows[i]; }
    }
  }
  runs.sort((a, b) => a.r0 - b.r0 || a.r1 - b.r1 || a.c - b.c);
  const out = [];
  for (const run of runs) {
    const last = out[out.length - 1];
    if (last && last.startRow === run.r0 && last.endRow === run.r1 && last.endColumn === run.c - 1) last.endColumn = run.c;
    else out.push({ startRow: run.r0, endRow: run.r1, startColumn: run.c, endColumn: run.c });
  }
  return out;
}
