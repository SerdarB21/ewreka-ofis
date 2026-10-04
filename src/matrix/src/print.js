// Etkin sayfanın kullanılan alanını HTML tablosu olarak gizli bir iframe'de yazdırır
// (Univer açık kaynak sürümünde yazdırma yok).
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const H = { 1: 'left', 2: 'center', 3: 'right', 4: 'justify', 5: 'justify', 6: 'center' };
const V = { 1: 'top', 2: 'middle', 3: 'bottom' };
const BORDER_CSS = { 1: '1px solid', 2: '1px dotted', 3: '1px dotted', 4: '1px dashed', 5: '1px dashed', 6: '1px dashed', 7: '3px double', 8: '2px solid', 9: '2px dashed', 10: '2px dashed', 11: '2px dashed', 12: '2px dashed', 13: '3px solid' };

export function printActiveSheet(snap, sheetId, fws, title) {
  const sh = snap.sheets[sheetId];
  if (!sh) throw new Error('Etkin sayfa bulunamadı.');
  const styles = snap.styles || {};
  const res = (s) => (s == null ? null : typeof s === 'string' ? styles[s] || null : s);
  const wbDef = res(snap.defaultStyle) || {};
  const cd = sh.cellData || {};
  const merges = sh.mergeData || [];

  // kullanılan alan (değer veya görünür biçim içeren hücreler + birleştirmeler)
  let maxR = -1, maxC = -1;
  for (const [r, row] of Object.entries(cd)) {
    for (const [c, cell] of Object.entries(row || {})) {
      if (!cell) continue;
      const st = res(cell.s);
      const has = (cell.v !== undefined && cell.v !== null && cell.v !== '') || cell.p || cell.f || (st && (st.bg || st.bd));
      if (has) { maxR = Math.max(maxR, +r); maxC = Math.max(maxC, +c); }
    }
  }
  for (const m of merges) { if (maxR >= 0) { maxR = Math.max(maxR, m.endRow); maxC = Math.max(maxC, m.endColumn); } }
  if (maxR < 0) throw new Error('Sayfa boş — yazdırılacak bir şey yok.');

  let display = null;
  try { display = fws.getRange(0, 0, maxR + 1, maxC + 1).getDisplayValues(); } catch (_) { display = null; }

  const hiddenRow = (r) => sh.rowData && sh.rowData[r] && sh.rowData[r].hd;
  const hiddenCol = (c) => sh.columnData && sh.columnData[c] && sh.columnData[c].hd;
  const colW = (c) => (sh.columnData && sh.columnData[c] && sh.columnData[c].w) || sh.defaultColumnWidth || 64;
  const rowH = (r) => (sh.rowData && sh.rowData[r] && sh.rowData[r].h) || sh.defaultRowHeight || 20;

  const covered = new Set();
  const spanAt = {};
  for (const m of merges) {
    if (m.startRow > maxR || m.startColumn > maxC) continue;
    let rs = 0, cs = 0;
    for (let r = m.startRow; r <= m.endRow; r++) if (!hiddenRow(r)) rs++;
    for (let c = m.startColumn; c <= m.endColumn; c++) if (!hiddenCol(c)) cs++;
    spanAt[m.startRow + ':' + m.startColumn] = { rs, cs };
    for (let r = m.startRow; r <= m.endRow; r++) for (let c = m.startColumn; c <= m.endColumn; c++) if (r !== m.startRow || c !== m.startColumn) covered.add(r + ':' + c);
  }

  const borderCss = (b) => (b && b.s && BORDER_CSS[b.s] ? `${BORDER_CSS[b.s]} ${(b.cl && b.cl.rgb) || '#000'}` : null);
  let colgroup = '<colgroup>';
  let totalW = 0;
  for (let c = 0; c <= maxC; c++) if (!hiddenCol(c)) { colgroup += `<col style="width:${colW(c)}px">`; totalW += colW(c); }
  colgroup += '</colgroup>';

  let body = '';
  for (let r = 0; r <= maxR; r++) {
    if (hiddenRow(r)) continue;
    body += `<tr style="height:${rowH(r)}px">`;
    for (let c = 0; c <= maxC; c++) {
      if (hiddenCol(c) || covered.has(r + ':' + c)) continue;
      const cell = cd[r] && cd[r][c];
      const st = { ...(wbDef || {}), ...(res(sh.columnData && sh.columnData[c] && sh.columnData[c].s) || {}), ...(res(sh.rowData && sh.rowData[r] && sh.rowData[r].s) || {}), ...(res(cell && cell.s) || {}) };
      let text = display && display[r] ? display[r][c] : '';
      if ((text === undefined || text === null || text === '') && cell) {
        if (cell.p && cell.p.body) text = cell.p.body.dataStream.replace(/\r\n$/, '');
        else if (cell.v !== undefined && cell.v !== null) text = String(cell.v);
      }
      const css = [];
      if (st.ff) css.push(`font-family:'${String(st.ff).replace(/['"<>]/g, '')}',Calibri,Arial,sans-serif`);
      if (st.fs) css.push(`font-size:${st.fs}pt`);
      if (st.bl) css.push('font-weight:bold');
      if (st.it) css.push('font-style:italic');
      const deco = [];
      if (st.ul && st.ul.s) deco.push('underline');
      if (st.st && st.st.s) deco.push('line-through');
      if (deco.length) css.push('text-decoration:' + deco.join(' '));
      if (st.cl && st.cl.rgb) css.push('color:' + st.cl.rgb);
      if (st.bg && st.bg.rgb) css.push('background:' + st.bg.rgb);
      let ha = H[st.ht];
      if (!ha) ha = cell && (cell.t === 2 || typeof cell.v === 'number') && !(cell.p) ? 'right' : (cell && cell.t === 3 ? 'center' : 'left');
      css.push('text-align:' + ha);
      css.push('vertical-align:' + (V[st.vt] || 'bottom'));
      css.push(st.tb === 3 ? 'white-space:pre-wrap;word-break:break-word' : 'white-space:pre');
      if (st.bd) {
        const t = borderCss(st.bd.t), rr = borderCss(st.bd.r), b = borderCss(st.bd.b), l = borderCss(st.bd.l);
        if (t) css.push('border-top:' + t); if (rr) css.push('border-right:' + rr); if (b) css.push('border-bottom:' + b); if (l) css.push('border-left:' + l);
      }
      const span = spanAt[r + ':' + c];
      const spanAttr = span ? `${span.rs > 1 ? ` rowspan="${span.rs}"` : ''}${span.cs > 1 ? ` colspan="${span.cs}"` : ''}` : '';
      body += `<td${spanAttr} style="${css.join(';')}">${esc(text ?? '')}</td>`;
    }
    body += '</tr>';
  }

  const grid = sh.showGridlines !== 0;
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(title || sh.name)}</title><style>
    @page { size: ${totalW > 760 ? 'A4 landscape' : 'A4'}; margin: 12mm; }
    html,body{margin:0;padding:0;background:#fff;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:Calibri,Arial,sans-serif;font-size:11pt}
    table{border-collapse:collapse;table-layout:fixed;width:${totalW}px;max-width:100%}
    td{padding:1px 3px;overflow:hidden;text-overflow:clip;line-height:1.2;${grid ? 'outline:0.5px solid #d4d4d8;outline-offset:-0.5px;' : ''}}
    tr{page-break-inside:avoid}
    h1{font:600 10pt Calibri,Arial,sans-serif;color:#555;margin:0 0 6px}
  </style></head><body><h1>${esc(sh.name)}</h1><table>${colgroup}<tbody>${body}</tbody></table></body></html>`;

  let frame = document.getElementById('matrix-print-frame');
  if (frame) frame.remove();
  frame = document.createElement('iframe');
  frame.id = 'matrix-print-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { console.error(e); }
  }, 150);
  return html;
}
