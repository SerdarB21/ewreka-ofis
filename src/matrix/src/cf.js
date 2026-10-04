// Koşullu biçimlendirme: ExcelJS modeli <-> Univer SHEET_CONDITIONAL_FORMATTING_PLUGIN kuralları
// Desteklenen: hücre değeri (cellIs), formül (expression), metin içerir/başlar/biter/boş/hata, ilk/son N,
// ortalamanın üstü/altı, yinelenen/benzersiz, tarih aralığı, renk ölçeği, veri çubuğu. Simge kümeleri aktarılmaz.
import { excelColorToHex, cssToArgb } from './colors.js';
import { a1ToRange, rangeToA1 } from './xlsx-common.js';
import { uid } from './defaults.js';

const NUM_OPS = ['greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual', 'notBetween', 'between', 'equal', 'notEqual'];
const TIME_OPS = ['today', 'yesterday', 'tomorrow', 'last7Days', 'thisMonth', 'lastMonth', 'nextMonth', 'thisWeek', 'lastWeek', 'nextWeek'];
const CFVO_TYPES = { min: 'min', max: 'max', num: 'num', percent: 'percent', percentile: 'percentile', formula: 'formula' };

function dxfToStyle(st, theme) {
  const s = {};
  if (!st) return s;
  const f = st.font || {};
  if (f.bold) s.bl = 1;
  if (f.italic) s.it = 1;
  if (f.underline && f.underline !== 'none') s.ul = { s: 1 };
  if (f.strike) s.st = { s: 1 };
  const cl = excelColorToHex(f.color, theme);
  if (cl) s.cl = { rgb: cl };
  const fill = st.fill;
  if (fill && fill.type === 'pattern') {
    const bg = excelColorToHex(fill.bgColor, theme) || excelColorToHex(fill.fgColor, theme);
    if (bg) s.bg = { rgb: bg };
  } else if (fill && fill.type === 'gradient' && fill.stops && fill.stops[0]) {
    const bg = excelColorToHex(fill.stops[0].color, theme);
    if (bg) s.bg = { rgb: bg };
  }
  return s;
}

function styleToDxf(s) {
  if (!s) return undefined;
  const st = {};
  const font = {};
  if (s.bl) font.bold = true;
  if (s.it) font.italic = true;
  if (s.ul && s.ul.s) font.underline = true;
  if (s.st && s.st.s) font.strike = true;
  const cl = s.cl && cssToArgb(s.cl.rgb);
  if (cl) font.color = { argb: cl };
  if (Object.keys(font).length) st.font = font;
  const bg = s.bg && cssToArgb(s.bg.rgb);
  if (bg) st.fill = { type: 'pattern', pattern: 'solid', bgColor: { argb: bg }, fgColor: { argb: bg } };
  return st;
}

const isNum = (x) => x !== undefined && x !== null && x !== '' && Number.isFinite(Number(x));
const unquote = (x) => { const m = /^"((?:[^"]|"")*)"$/.exec(String(x).trim()); return m ? m[1].replace(/""/g, '"') : null; };

function cfvoIn(v) {
  const type = CFVO_TYPES[v && v.type] || 'min';
  const out = { type };
  if (type !== 'min' && type !== 'max' && v.value !== undefined && !Number.isNaN(v.value)) out.value = v.value;
  if ((type === 'num' || type === 'percent' || type === 'percentile') && out.value === undefined) out.value = type === 'num' ? 0 : 50;
  return out;
}
function cfvoOut(v) {
  const t = (v && v.type) || 'min';
  const out = { type: t === 'formula' ? 'formula' : t };
  if (t !== 'min' && t !== 'max' && v.value !== undefined && v.value !== '') out.value = typeof v.value === 'string' ? v.value.replace(/^=/, '') : v.value;
  return out;
}

// ---------------------------------------------------------------- içe aktarma
export function importConditionalFormats(cfs, theme) {
  const rules = [];
  for (const cf of cfs || []) {
    const ranges = String(cf.ref || '').split(/\s+/).map((r) => a1ToRange(r)).filter(Boolean);
    if (!ranges.length) continue;
    const tl = String(cf.ref).split(/\s+/)[0].split(':')[0].replace(/\$/g, '');
    const sorted = (cf.rules || []).slice().sort((a, b) => (a.priority || 0) - (b.priority || 0));
    for (const r of sorted) {
      let rule = null;
      const style = dxfToStyle(r.style, theme);
      const fx = (r.formulae || []).map((x) => String(x));
      switch (r.type) {
        case 'cellIs': {
          const op = NUM_OPS.includes(r.operator) ? r.operator : 'equal';
          if (fx.every(isNum)) {
            const v = op === 'between' || op === 'notBetween' ? [Number(fx[0]), Number(fx[1] ?? fx[0])] : Number(fx[0]);
            rule = { type: 'highlightCell', subType: 'number', operator: op, value: v, style };
          } else if ((op === 'equal' || op === 'notEqual') && fx.length === 1 && unquote(fx[0]) !== null) {
            rule = { type: 'highlightCell', subType: 'text', operator: op, value: unquote(fx[0]), style };
          } else {
            const sym = { greaterThan: '>', greaterThanOrEqual: '>=', lessThan: '<', lessThanOrEqual: '<=', equal: '=', notEqual: '<>' }[op];
            let f = null;
            if (sym) f = `=${tl}${sym}${fx[0]}`;
            else if (op === 'between') f = `=AND(${tl}>=${fx[0]},${tl}<=${fx[1]})`;
            else if (op === 'notBetween') f = `=OR(${tl}<${fx[0]},${tl}>${fx[1]})`;
            if (f) rule = { type: 'highlightCell', subType: 'formula', value: f, style };
          }
          break;
        }
        case 'expression':
          if (fx[0]) rule = { type: 'highlightCell', subType: 'formula', value: '=' + fx[0].replace(/^=/, ''), style };
          break;
        case 'containsText': case 'notContainsText': case 'beginsWith': case 'endsWith':
        case 'containsBlanks': case 'notContainsBlanks': case 'containsErrors': case 'notContainsErrors': {
          const op = r.type === 'containsText' ? (r.operator || 'containsText') : r.type;
          let text = r.text;
          if (text === undefined && fx[0]) { const m = /"((?:[^"]|"")*)"/.exec(fx[0]); if (m) text = m[1].replace(/""/g, '"'); }
          rule = { type: 'highlightCell', subType: 'text', operator: op, style };
          if (!/Blanks|Errors/.test(op)) rule.value = text || '';
          break;
        }
        case 'top10':
          rule = { type: 'highlightCell', subType: 'rank', isBottom: !!r.bottom, isPercent: !!r.percent, value: r.rank || 10, style };
          break;
        case 'aboveAverage':
          rule = { type: 'highlightCell', subType: 'average', operator: r.aboveAverage === false ? 'lessThan' : 'greaterThan', style };
          break;
        case 'duplicateValues':
          rule = { type: 'highlightCell', subType: 'duplicateValues', style };
          break;
        case 'uniqueValues':
          rule = { type: 'highlightCell', subType: 'uniqueValues', style };
          break;
        case 'timePeriod':
          if (TIME_OPS.includes(r.timePeriod)) rule = { type: 'highlightCell', subType: 'timePeriod', operator: r.timePeriod, style };
          break;
        case 'colorScale': {
          const cfvo = r.cfvo || [], colors = r.color || [];
          if (cfvo.length >= 2 && colors.length >= 2) {
            rule = { type: 'colorScale', config: cfvo.map((v, i) => ({ index: i, color: excelColorToHex(colors[i] || colors[colors.length - 1], theme) || '#FFFFFF', value: cfvoIn(v) })) };
          }
          break;
        }
        case 'dataBar': {
          const cfvo = r.cfvo || [];
          rule = {
            type: 'dataBar', isShowValue: r.showValue !== false,
            config: {
              min: cfvoIn(cfvo[0] || { type: 'min' }), max: cfvoIn(cfvo[1] || { type: 'max' }),
              isGradient: r.gradient !== false,
              positiveColor: excelColorToHex(r.color, theme) || '#638EC6',
              nativeColor: '#FF0000',
            },
          };
          break;
        }
        default: break; // iconSet vb. desteklenmiyor
      }
      if (rule) rules.push({ cfId: uid('cf'), ranges: ranges.map((x) => ({ ...x })), stopIfTrue: !!r.stopIfTrue, rule });
    }
  }
  return rules;
}

// ---------------------------------------------------------------- dışa aktarma
export function exportConditionalFormats(rules) {
  const out = [];
  let priority = 1;
  for (const cf of rules || []) {
    const ranges = (cf.ranges || []).filter(Boolean);
    if (!ranges.length || !cf.rule) continue;
    const ref = ranges.map(rangeToA1).join(' ');
    const tl = rangeToA1({ ...ranges[0], endRow: ranges[0].startRow, endColumn: ranges[0].startColumn });
    const absRef = ranges.map((r) => rangeToA1(r).replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')).join(',');
    const r = cf.rule;
    const base = { priority: priority++ };
    if (cf.stopIfTrue) base.stopIfTrue = true;
    let x = null;
    if (r.type === 'highlightCell') {
      const style = styleToDxf(r.style);
      switch (r.subType) {
        case 'number': {
          const vals = Array.isArray(r.value) ? r.value : [r.value];
          x = { type: 'cellIs', operator: r.operator, formulae: vals.filter((v) => v !== undefined && v !== null).map(String), style };
          if (!x.formulae.length) x.formulae = ['0'];
          break;
        }
        case 'text': {
          const v = String(r.value ?? '').replace(/"/g, '""');
          const op = r.operator;
          if (op === 'equal' || op === 'notEqual') x = { type: 'cellIs', operator: op, formulae: [`"${v}"`], style };
          else if (op === 'containsText') x = { type: 'containsText', operator: 'containsText', text: v, formulae: [`NOT(ISERROR(SEARCH("${v}",${tl})))`], style };
          else if (op === 'notContainsText') x = { type: 'expression', formulae: [`ISERROR(SEARCH("${v}",${tl}))`], style };
          else if (op === 'beginsWith') x = { type: 'expression', formulae: [`LEFT(${tl},LEN("${v}"))="${v}"`], style };
          else if (op === 'endsWith') x = { type: 'expression', formulae: [`RIGHT(${tl},LEN("${v}"))="${v}"`], style };
          else x = { type: 'containsText', operator: op, style };
          break;
        }
        case 'formula':
          x = { type: 'expression', formulae: [String(r.value || '').replace(/^=/, '')], style };
          break;
        case 'rank':
          x = { type: 'top10', rank: r.value || 10, percent: !!r.isPercent, bottom: !!r.isBottom, style };
          break;
        case 'average':
          x = { type: 'aboveAverage', aboveAverage: !/less/.test(r.operator || ''), style };
          break;
        case 'duplicateValues':
          x = { type: 'expression', formulae: [`COUNTIF(${absRef.split(',')[0]},${tl})>1`], style };
          break;
        case 'uniqueValues':
          x = { type: 'expression', formulae: [`COUNTIF(${absRef.split(',')[0]},${tl})=1`], style };
          break;
        case 'timePeriod':
          x = { type: 'timePeriod', timePeriod: r.operator, style };
          break;
        default: break;
      }
    } else if (r.type === 'colorScale' && Array.isArray(r.config) && r.config.length >= 2) {
      const cfg = r.config.slice().sort((a, b) => a.index - b.index);
      x = { type: 'colorScale', cfvo: cfg.map((c) => cfvoOut(c.value)), color: cfg.map((c) => ({ argb: cssToArgb(c.color) || 'FFFFFFFF' })) };
    } else if (r.type === 'dataBar' && r.config) {
      x = { type: 'dataBar', cfvo: [cfvoOut(r.config.min), cfvoOut(r.config.max)], color: { argb: cssToArgb(r.config.positiveColor) || 'FF638EC6' }, gradient: r.config.isGradient !== false, showValue: r.isShowValue !== false };
    }
    if (x) out.push({ ref, rules: [{ ...base, ...x }] });
  }
  return out;
}
