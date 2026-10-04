// Univer IWorkbookData -> .xlsx (ExcelJS ile)
import ExcelJS from 'exceljs';
import { LexerTreeBuilder } from '@univerjs/preset-sheets-core';
import { cssToArgb } from './colors.js';
import { exportConditionalFormats } from './cf.js';
import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from './defaults.js';
import { BORDER_TO_EXCEL, H_ALIGN_TO_EXCEL, V_ALIGN_TO_EXCEL, UNDERLINE_TO_EXCEL, pxToColWidth, pxToRowHeight, addFormulaPrefixes, rangeToA1, indexToCol, isDateFormat } from './xlsx-common.js';

export async function workbookToXlsx(snap, injector, opts = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ewreka Matrix';
  wb.lastModifiedBy = 'Ewreka Matrix';
  wb.created = new Date();
  wb.modified = new Date();
  if (snap.dateSystem === 'date1904') wb.properties.date1904 = true;

  const resources = {};
  for (const r of snap.resources || []) {
    try { resources[r.name] = typeof r.data === 'string' ? (r.data ? JSON.parse(r.data) : {}) : r.data; } catch (_) { resources[r.name] = {}; }
  }
  const styles = snap.styles || {};
  const resolveStyle = (s) => (s == null ? null : typeof s === 'string' ? styles[s] || null : s);
  const wbDefault = resolveStyle(snap.defaultStyle) || {};
  const defFont = wbDefault.ff || DEFAULT_FONT;
  const defSize = wbDefault.fs || DEFAULT_FONT_SIZE;

  let lexer = null;
  try { lexer = injector ? injector.get(LexerTreeBuilder) : null; } catch (_) { lexer = null; }

  const idToName = {};
  for (const sid of snap.sheetOrder) idToName[sid] = (snap.sheets[sid] && snap.sheets[sid].name) || sid;

  const styleCache = new Map();
  const toExcelStyle = (us) => {
    const key = JSON.stringify(us);
    if (styleCache.has(key)) return styleCache.get(key);
    const st = convertStyleToExcel(us, defFont, defSize);
    styleCache.set(key, st);
    return st;
  };

  let activeTab = 0;
  snap.sheetOrder.forEach((sid, index) => {
    const sh = snap.sheets[sid];
    if (!sh) return;
    if (opts.activeSheetId === sid) activeTab = index;
    const name = sanitizeSheetName(sh.name || `Sayfa${index + 1}`, wb);
    const fz = sh.freeze || {};
    const xs = fz.xSplit > 0 ? fz.xSplit : 0;
    const ys = fz.ySplit > 0 ? fz.ySplit : 0;
    const view = {
      showGridLines: sh.showGridlines !== 0,
      zoomScale: sh.zoomRatio && sh.zoomRatio !== 1 ? Math.round(sh.zoomRatio * 100) : 100,
      rightToLeft: !!sh.rightToLeft,
    };
    if (xs || ys) {
      const sc = fz.startColumn > 0 ? fz.startColumn : xs;
      const sr = fz.startRow > 0 ? fz.startRow : ys;
      Object.assign(view, { state: 'frozen', xSplit: xs, ySplit: ys, topLeftCell: indexToCol(sc) + (sr + 1) });
    }
    const ws = wb.addWorksheet(name, {
      state: sh.hidden ? 'hidden' : 'visible',
      views: [view],
      properties: {
        defaultRowHeight: sh.defaultRowHeight ? pxToRowHeight(sh.defaultRowHeight) : 15,
        ...(sh.tabColor ? { tabColor: { argb: cssToArgb(sh.tabColor) || 'FF2ECC8A' } } : {}),
      },
    });
    if (sh.defaultColumnWidth && sh.defaultColumnWidth !== 64) ws.properties.defaultColWidth = pxToColWidth(sh.defaultColumnWidth);
    ws.properties.dyDescent = 0.25;
    const sheetDefault = resolveStyle(sh.defaultStyle);

    // sütunlar
    const colData = sh.columnData || {};
    for (const [ci, cd] of Object.entries(colData)) {
      if (!cd) continue;
      const col = ws.getColumn(+ci + 1);
      if (cd.w !== undefined && cd.w !== null) col.width = pxToColWidth(cd.w);
      if (cd.hd) col.hidden = true;
      const cs = resolveStyle(cd.s);
      if (cs) col.style = toExcelStyle(cs);
    }

    // satırlar
    const rowData = sh.rowData || {};
    for (const [ri, rd] of Object.entries(rowData)) {
      if (!rd) continue;
      const row = ws.getRow(+ri + 1);
      if (rd.h !== undefined && rd.h !== null && rd.ia !== 1 && Math.round(rd.h) !== Math.round(sh.defaultRowHeight || 20)) row.height = pxToRowHeight(rd.h);
      if (rd.hd) row.hidden = true;
      const rs = resolveStyle(rd.s);
      if (rs) row.style = toExcelStyle(rs);
    }

    // paylaşılan formüller (si): ana formülü bul
    const cellData = sh.cellData || {};
    const siMaster = {};
    for (const [ri, row] of Object.entries(cellData)) {
      for (const [ci, cell] of Object.entries(row || {})) {
        if (cell && cell.si && cell.f && !siMaster[cell.si]) siMaster[cell.si] = { f: cell.f, r: +ri, c: +ci };
      }
    }

    // hücreler
    for (const [ri, row] of Object.entries(cellData)) {
      if (!row) continue;
      const r = +ri;
      for (const [ci, cell] of Object.entries(row)) {
        if (!cell) continue;
        const c = +ci;
        const xc = ws.getCell(r + 1, c + 1);
        let us = resolveStyle(cell.s);
        if (sheetDefault && !us) us = sheetDefault;
        let formula = cell.f && typeof cell.f === 'string' ? cell.f : null;
        if (!formula && cell.si && siMaster[cell.si]) {
          const m = siMaster[cell.si];
          formula = lexer ? safeMove(lexer, m.f, c - m.c, r - m.r) : null;
        }
        const value = cellValue(cell, us, idToName);
        if (formula) {
          const f = addFormulaPrefixes(formula.replace(/^=/, ''));
          const fv = { formula: f };
          if (value !== null && value !== undefined && typeof value !== 'object') fv.result = value;
          else if (value && value.text !== undefined) fv.result = value.text;
          if (typeof fv.result === 'string' && /^#(DIV\/0!|N\/A|NAME\?|NULL!|NUM!|REF!|VALUE!|SPILL!|CALC!)$/.test(fv.result)) fv.result = { error: fv.result };
          xc.value = fv;
        } else if (value !== null && value !== undefined && value !== '') {
          xc.value = value;
        }
        if (us) {
          const xs2 = toExcelStyle(us);
          if (xs2) xc.style = xs2;
        }
      }
    }

    // birleştirmeler (biçimi bozmadan)
    for (const m of sh.mergeData || []) {
      try { ws.mergeCellsWithoutStyle(m.startRow + 1, m.startColumn + 1, m.endRow + 1, m.endColumn + 1); }
      catch (e) { console.warn('[matrix] birleştirme atlandı', m, e.message); }
    }

    // notlar
    const notes = resources.SHEET_NOTE_PLUGIN && resources.SHEET_NOTE_PLUGIN[sid];
    if (notes) {
      for (const [ri, cols] of Object.entries(notes)) {
        for (const [ci, note] of Object.entries(cols || {})) {
          if (note && note.note) ws.getCell(+ri + 1, +ci + 1).note = String(note.note);
        }
      }
    }

    // otomatik filtre
    const flt = resources.SHEET_FILTER_PLUGIN && resources.SHEET_FILTER_PLUGIN[sid];
    if (flt && flt.ref) ws.autoFilter = rangeToA1(flt.ref);

    // koşullu biçimlendirme
    const cfs = resources.SHEET_CONDITIONAL_FORMATTING_PLUGIN && resources.SHEET_CONDITIONAL_FORMATTING_PLUGIN[sid];
    if (Array.isArray(cfs) && cfs.length) {
      try { for (const cf of exportConditionalFormats(cfs)) ws.addConditionalFormatting(cf); }
      catch (e) { console.warn('[matrix] koşullu biçimlendirme yazılamadı', e); }
    }

    // veri doğrulama
    const dvs = resources.SHEET_DATA_VALIDATION_PLUGIN && resources.SHEET_DATA_VALIDATION_PLUGIN[sid];
    if (Array.isArray(dvs)) {
      for (const rule of dvs) {
        const dv = dataValidationToExcel(rule);
        if (!dv) continue;
        for (const rg of rule.ranges || []) ws.dataValidations.add(rangeToA1(rg), dv);
      }
    }
  });

  if (!wb.worksheets.length) wb.addWorksheet('Sayfa1');
  wb.views = [{ x: 0, y: 0, width: 28800, height: 17600, firstSheet: 0, activeTab, visibility: 'visible' }];

  // tanımlı adlar
  const dn = resources.SHEET_DEFINED_NAME_PLUGIN;
  if (dn && typeof dn === 'object') {
    const list = [];
    for (const item of Object.values(dn)) {
      if (!item || !item.name || !item.formulaOrRefString) continue;
      const ranges = String(item.formulaOrRefString).replace(/^=/, '').split(',').map((s) => s.trim()).filter((s) => /!\$?[A-Za-z]{1,3}\$?\d+(:\$?[A-Za-z]{1,3}\$?\d+)?$/.test(s));
      if (ranges.length) list.push({ name: item.name, ranges });
    }
    if (list.length) { try { wb.definedNames.model = list; } catch (e) { console.warn('[matrix] tanımlı adlar yazılamadı', e); } }
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf);
}

function safeMove(lexer, f, dx, dy) {
  try { return lexer.moveFormulaRefOffset(f, dx, dy); } catch (_) { return null; }
}

function sanitizeSheetName(name, wb) {
  let n = String(name).replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || 'Sayfa';
  const exists = (x) => wb.worksheets.some((w) => w.name.toLowerCase() === x.toLowerCase());
  let i = 2; const base = n;
  while (exists(n)) { n = (base.slice(0, 28) + ' ' + i++); }
  return n;
}

// Univer hücre değerini ExcelJS değerine çevir
function cellValue(cell, us, idToName) {
  const p = cell.p;
  if (p && p.body && typeof p.body.dataStream === 'string') {
    const body = p.body;
    const text = body.dataStream.replace(/\r\n$/, '').replace(/\r/g, '\n');
    const link = (body.customRanges || []).find((r) => r.rangeType === 0 && r.properties && r.properties.url);
    if (link) {
      let url = String(link.properties.url);
      const m = /^#gid=([^&]+)(?:&range=([^&]+))?/.exec(url);
      if (m) {
        const sheetName = idToName[m[1]] || m[1];
        url = `#'${sheetName.replace(/'/g, "''")}'!${m[2] || 'A1'}`;
      }
      return { text, hyperlink: url, ...(link.properties.tooltip ? { tooltip: link.properties.tooltip } : {}) };
    }
    const runs = (body.textRuns || []).filter((r) => r && r.ts && Object.keys(r.ts).length);
    if (runs.length && text) {
      const rich = [];
      let pos = 0;
      const ds = body.dataStream.replace(/\r\n$/, '');
      const sorted = runs.slice().sort((a, b) => a.st - b.st);
      for (const run of sorted) {
        if (run.st > pos) rich.push({ text: ds.slice(pos, run.st).replace(/\r/g, '\n') });
        const t = ds.slice(Math.max(run.st, pos), run.ed).replace(/\r/g, '\n');
        if (t) rich.push({ text: t, font: fontToExcel({ ...(us || {}), ...run.ts }) });
        pos = Math.max(pos, run.ed);
      }
      if (pos < ds.length) rich.push({ text: ds.slice(pos).replace(/\r/g, '\n') });
      return { richText: rich };
    }
    if (cell.v === undefined || cell.v === null) return text;
  }
  const v = cell.v;
  if (v === undefined || v === null) return null;
  const t = cell.t;
  if (t === 3) return v === true || v === 1 || v === '1' || String(v).toUpperCase() === 'TRUE';
  if (t === 1 || t === 4) return String(v);
  if (t === 2) { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) ? n : String(v); }
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  return String(v);
}

function color(c) {
  if (!c) return null;
  const argb = cssToArgb(c.rgb || '');
  return argb ? { argb } : null;
}

function fontToExcel(s) {
  const f = {};
  f.name = s.ff || DEFAULT_FONT;
  f.size = s.fs || DEFAULT_FONT_SIZE;
  if (s.bl) f.bold = true;
  if (s.it) f.italic = true;
  if (s.ul && s.ul.s) f.underline = UNDERLINE_TO_EXCEL[s.ul.t] || true;
  if (s.st && s.st.s) f.strike = true;
  if (s.va === 3) f.vertAlign = 'superscript';
  else if (s.va === 2) f.vertAlign = 'subscript';
  // Univer düzenleyicisi yazılan her hücreye tema metin rengini (#1B1C1F) ekler; bunu "otomatik" renk say
  const cl = s.cl && s.cl.rgb && String(s.cl.rgb).toUpperCase() !== '#1B1C1F' ? color(s.cl) : null;
  if (cl) f.color = cl;
  return f;
}

function convertStyleToExcel(s, defFont, defSize) {
  if (!s) return null;
  const st = {};
  st.font = fontToExcel({ ff: defFont, fs: defSize, ...s });
  const bg = color(s.bg);
  if (bg) st.fill = { type: 'pattern', pattern: 'solid', fgColor: bg, bgColor: { indexed: 64 } };
  if (s.bd) {
    const b = {};
    const side = (x) => {
      if (!x || !x.s) return null;
      const name = BORDER_TO_EXCEL[x.s];
      if (!name) return null;
      return { style: name, color: color(x.cl) || { argb: 'FF000000' } };
    };
    const t = side(s.bd.t), r = side(s.bd.r), bt = side(s.bd.b), l = side(s.bd.l);
    if (t) b.top = t; if (r) b.right = r; if (bt) b.bottom = bt; if (l) b.left = l;
    const down = side(s.bd.tl_br), up = side(s.bd.bl_tr);
    if (down || up) b.diagonal = { ...(down || up), up: !!up, down: !!down };
    if (Object.keys(b).length) st.border = b;
  }
  const a = {};
  if (s.ht && H_ALIGN_TO_EXCEL[s.ht]) a.horizontal = H_ALIGN_TO_EXCEL[s.ht];
  if (s.vt && V_ALIGN_TO_EXCEL[s.vt]) a.vertical = V_ALIGN_TO_EXCEL[s.vt];
  if (s.tb === 3) a.wrapText = true;
  if (s.stf) a.shrinkToFit = true;
  if (s.tr) {
    if (s.tr.v) a.textRotation = 'vertical';
    else if (s.tr.a) a.textRotation = Math.max(-90, Math.min(90, -s.tr.a));
  }
  if (s.pd && s.pd.l > 2) { const ind = Math.round((s.pd.l - 2) / 9); if (ind > 0) a.indent = ind; }
  if (Object.keys(a).length) st.alignment = a;
  if (s.n && s.n.pattern) st.numFmt = s.n.pattern === '@@@' ? '@' : s.n.pattern;
  return st;
}

function dataValidationToExcel(rule) {
  const TYPES = { list: 'list', listMultiple: 'list', whole: 'whole', decimal: 'decimal', date: 'date', textLength: 'textLength', custom: 'custom' };
  const type = TYPES[rule.type];
  if (!type) return null;
  const dv = { type, allowBlank: rule.allowBlank !== false };
  if (rule.showErrorMessage) dv.showErrorMessage = true;
  if (rule.showInputMessage) dv.showInputMessage = true;
  if (rule.error) dv.error = rule.error;
  if (rule.errorTitle) dv.errorTitle = rule.errorTitle;
  if (rule.prompt) dv.prompt = rule.prompt;
  if (rule.promptTitle) dv.promptTitle = rule.promptTitle;
  if (rule.errorStyle === 2) dv.errorStyle = 'warning'; else if (rule.errorStyle === 0) dv.errorStyle = 'information';
  const f1 = rule.formula1 == null ? '' : String(rule.formula1);
  if (type === 'list') {
    if (f1.startsWith('=')) dv.formulae = [f1.slice(1)];
    else dv.formulae = ['"' + f1.replace(/"/g, '""') + '"'];
  } else if (type === 'custom') {
    dv.formulae = [f1.replace(/^=/, '')];
  } else {
    dv.operator = rule.operator || 'between';
    const fx = [f1.replace(/^=/, '')];
    if (rule.formula2 != null && rule.formula2 !== '' && (dv.operator === 'between' || dv.operator === 'notBetween')) fx.push(String(rule.formula2).replace(/^=/, ''));
    if (type === 'date') dv.formulae = fx.map((x) => (/^\d{4}-\d{2}-\d{2}/.test(x) ? new Date(x) : x));
    else dv.formulae = fx;
  }
  return dv;
}

export { isDateFormat };
