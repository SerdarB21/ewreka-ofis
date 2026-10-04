import { LocaleType } from '@univerjs/presets';

export const DEFAULT_FONT = 'Calibri';
export const DEFAULT_FONT_SIZE = 11;
export const DEFAULT_ROWS = 1000;
export const DEFAULT_COLS = 26;
export const DEFAULT_COL_WIDTH = 88;   // px (Excel 8.43 karakter ≈ 64px; Univer'de biraz daha geniş okunaklı)
export const DEFAULT_ROW_HEIGHT = 20;  // px (Excel 15pt = 20px)

// Yazı tipi listesi — yalnızca sistem yazı tipleri (internet yok)
export const FONT_LIST = [
  'Calibri', 'Arial', 'Segoe UI', 'Times New Roman', 'Cambria', 'Georgia', 'Verdana', 'Tahoma',
  'Trebuchet MS', 'Courier New', 'Consolas', 'Helvetica Neue', 'Helvetica', 'Menlo', 'Aptos',
].map((v) => ({ value: v, label: v, category: 'sans-serif' }));

let seq = 0;
export function uid(prefix) { seq++; return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

export function defaultWorkbookStyle() {
  return { ff: DEFAULT_FONT, fs: DEFAULT_FONT_SIZE };
}

export function emptySheet(id, name, extra = {}) {
  return {
    id, name,
    tabColor: '',
    hidden: 0,
    rowCount: DEFAULT_ROWS,
    columnCount: DEFAULT_COLS,
    zoomRatio: 1,
    freeze: { xSplit: 0, ySplit: 0, startRow: -1, startColumn: -1 },
    scrollTop: 0, scrollLeft: 0,
    defaultColumnWidth: DEFAULT_COL_WIDTH,
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    mergeData: [],
    cellData: {},
    rowData: {},
    columnData: {},
    showGridlines: 1,
    rowHeader: { width: 46, hidden: 0 },
    columnHeader: { height: 20, hidden: 0 },
    rightToLeft: 0,
    ...extra,
  };
}

export function blankWorkbook() {
  const sid = uid('s');
  return {
    id: uid('wb'),
    name: 'Adsız tablo',
    appVersion: '1.0.0',
    locale: LocaleType.EN_US,
    styles: {},
    defaultStyle: defaultWorkbookStyle(),
    sheetOrder: [sid],
    sheets: { [sid]: emptySheet(sid, 'Sayfa1') },
  };
}
