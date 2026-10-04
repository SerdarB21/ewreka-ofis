// Türkçe veri girişi: "15.01.2026", "15/01/2026 14:30" (gün.ay.yıl) tarih olarak; "3,5" ve "1.234,56" ondalık sayı olarak okunur.
// Gösterim biçimi Univer'in en-US sayı biçimlendirmesidir (ondalık "."), formüller İngilizce sözdizimi kullanır.
import { SheetInterceptorService, AFTER_CELL_EDIT } from '@univerjs/preset-sheets-core';

function serial(y, m, d, hh = 0, mi = 0, ss = 0) {
  const t = Date.UTC(y, m - 1, d, hh, mi, ss);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  if (hh > 23 || mi > 59 || ss > 59) return null;
  return t / 86400000 + 25569;
}

export function parseTurkishInput(text) {
  const s = String(text).trim();
  let m = /^(\d{1,2})([./-])(\d{1,2})\2(\d{4}|\d{2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) {
    let y = +m[4]; if (m[4].length === 2) y += y < 30 ? 2000 : 1900;
    const v = serial(y, +m[3], +m[1], +(m[5] || 0), +(m[6] || 0), +(m[7] || 0));
    if (v !== null) return { v, pattern: m[5] ? 'dd.mm.yyyy hh:mm' : 'dd.mm.yyyy' };
  }
  m = /^(-?)(\d{1,3}(?:\.\d{3})+),(\d+)$/.exec(s); // 1.234,56
  if (m) return { v: parseFloat(m[1] + m[2].replace(/\./g, '') + '.' + m[3]) };
  m = /^(-?)(\d+),(\d+)$/.exec(s); // 3,5  0,125  (1,234 İngilizce binlik olarak kalır)
  if (m && (m[3].length !== 3 || /^0/.test(m[2]))) return { v: parseFloat(m[1] + m[2] + '.' + m[3]) };
  return null;
}

export function registerTurkishInput(injector) {
  const svc = injector.get(SheetInterceptorService);
  return svc.writeCellInterceptor.intercept(AFTER_CELL_EDIT, {
    priority: 1000,
    handler: (value, context, next) => {
      try {
        if (window.__matrixDebug) console.log('[matrix] AFTER_CELL_EDIT', JSON.stringify(value));
        if (!value || value.f || value.t === 4) return next(value);
        const body = value.p && value.p.body;
        if (body && ((body.textRuns && body.textRuns.length) || (body.customRanges && body.customRanges.length))) return next(value);
        const content = body && body.dataStream ? body.dataStream.replace(/\r\n$/, '') : (value.v == null ? '' : String(value.v));
        if (!content || content.startsWith('=')) return next(value);
        const r = parseTurkishInput(content);
        if (!r) return next(value);
        const out = { ...value, p: undefined, v: r.v, t: 2 };
        if (r.pattern) {
          const raw = context.worksheet.getCellRaw(context.row, context.col);
          let style = raw && raw.s;
          if (typeof style === 'string') style = context.workbook.getStyles().get(style);
          const cur = style && style.n && style.n.pattern;
          if (!cur || !/[dmy]/i.test(cur)) out.s = { ...(style || {}), n: { pattern: r.pattern } };
        }
        return next(out);
      } catch (e) { console.warn('[matrix] giriş dönüştürülemedi', e); return next(value); }
    },
  });
}
