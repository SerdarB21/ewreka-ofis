// Ek kabuk eylemleri
export function autoFitColumns(univerAPI) {
  const wb = univerAPI.getActiveWorkbook();
  if (!wb) return;
  const ws = wb.getActiveSheet();
  const sel = wb.getActiveRange();
  let start = 0, num = Math.max(1, ws.getLastColumn() + 1);
  if (sel) {
    const r = sel.getRange();
    if (r.endColumn > r.startColumn || r.endRow > r.startRow) { start = r.startColumn; num = r.endColumn - r.startColumn + 1; }
  }
  ws.autoResizeColumns(start, num);
}
