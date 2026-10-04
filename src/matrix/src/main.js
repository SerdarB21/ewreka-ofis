/* Ewreka Matrix — tablo modülü (Univer açık kaynak motoru + kendi xlsx/csv köprüsü)
 * Copyright (C) 2026 Ewreka Digital — AGPL-3.0-or-later
 */
import { createUniver, LocaleType, CommandType, ICommandService, IUniverInstanceService, IUndoRedoService, UniverInstanceType } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import { UniverSheetsFilterPreset } from '@univerjs/preset-sheets-filter';
import { UniverSheetsSortPreset } from '@univerjs/preset-sheets-sort';
import { UniverSheetsConditionalFormattingPreset } from '@univerjs/preset-sheets-conditional-formatting';
import { UniverSheetsDataValidationPreset } from '@univerjs/preset-sheets-data-validation';
import { UniverSheetsFindReplacePreset } from '@univerjs/preset-sheets-find-replace';
import { UniverSheetsHyperLinkPreset } from '@univerjs/preset-sheets-hyper-link';
import { UniverSheetsNotePreset } from '@univerjs/preset-sheets-note';

import '@univerjs/preset-sheets-core/lib/index.css';
import '@univerjs/preset-sheets-filter/lib/index.css';
import '@univerjs/preset-sheets-sort/lib/index.css';
import '@univerjs/preset-sheets-conditional-formatting/lib/index.css';
import '@univerjs/preset-sheets-data-validation/lib/index.css';
import '@univerjs/preset-sheets-find-replace/lib/index.css';
import '@univerjs/preset-sheets-hyper-link/lib/index.css';
import '@univerjs/preset-sheets-note/lib/index.css';
import './style.css';

import { trTR } from './locale/index.js';
import { ewrekaTheme } from './theme.js';
import { FONT_LIST, DEFAULT_FONT, DEFAULT_FONT_SIZE, blankWorkbook } from './defaults.js';
import { printActiveSheet } from './print.js';
import { autoFitColumns } from './actions.js';
import { registerIcons } from './icons.js';
import { registerTurkishInput } from './input-tr.js';

const Shell = window.EwrekaShell;

// ---------------------------------------------------------------- Univer
const { univer, univerAPI } = createUniver({
  locale: LocaleType.EN_US, // dil paketi içerik olarak Türkçe (Univer'de tr-TR anahtarı yok)
  locales: { [LocaleType.EN_US]: trTR },
  theme: ewrekaTheme,
  presets: [
    UniverSheetsCorePreset({
      container: 'matrix-app',
      header: true,
      toolbar: true,
      ribbonType: 'classic',
      customFontFamily: { override: true, list: FONT_LIST },
      footer: { sheetBar: true, statisticBar: true, menus: true, zoomSlider: true, addSheetButtonConfig: { show: true, defaultRowCount: 1000, defaultColumnCount: 26 } },
    }),
    UniverSheetsFilterPreset(),
    UniverSheetsSortPreset(),
    UniverSheetsConditionalFormattingPreset(),
    UniverSheetsDataValidationPreset(),
    UniverSheetsFindReplacePreset(),
    UniverSheetsHyperLinkPreset(),
    UniverSheetsNotePreset(),
  ],
});
window.__matrix = { univer, univerAPI };

const injector = univer.__getInjector();
const commandService = injector.get(ICommandService);
const instanceService = injector.get(IUniverInstanceService);
registerIcons(injector);
let inputHooked = false;

// ---------------------------------------------------------------- belge değişti izleme
// Salt görüntü/seçim değişiklikleri (operation) yok sayılır; yalnızca kalıcı veri değişiklikleri (mutation).
const IGNORE_MUTATIONS = new Set([
  'sheet.mutation.set-worksheet-activate',
  'sheet.mutation.set-worksheet-active', // eski ad
  'sheet.mutation.set-worksheet-row-auto-height', // otomatik yükseklik hesabı
]);
const IGNORE_PREFIX = ['formula.mutation.', 'doc.mutation.', 'sheet.mutation.set-formula-calculation', 'sheet.mutation.set-row-auto-height'];
let loading = 0;

commandService.onCommandExecuted((info, options) => {
  if (loading) return;
  if (options && (options.fromCollab || options.onlyLocal)) return;
  if (info.type !== CommandType.MUTATION) return;
  const id = info.id || '';
  if (IGNORE_MUTATIONS.has(id) || IGNORE_PREFIX.some((p) => id.startsWith(p))) return;
  if (window.__matrixDebug) console.log('[matrix] mutation', id);
  if (!Shell.dirty) Shell.setDirty(true);
});

// ---------------------------------------------------------------- belge yükleme
let currentUnitId = null;
function disposeCurrent() {
  const wbs = instanceService.getAllUnitsForType(UniverInstanceType.UNIVER_SHEET) || [];
  for (const wb of wbs) univerAPI.disposeUnit(wb.getUnitId());
  currentUnitId = null;
}

async function loadWorkbook(data) {
  loading++;
  try {
    const activeSheetId = data.__activeSheetId; delete data.__activeSheetId;
    const autoRows = data.__autoRows; delete data.__autoRows;
    delete data.__csvDelimiter;
    disposeCurrent();
    const fwb = univerAPI.createWorkbook(data);
    currentUnitId = fwb.getId();
    if (!inputHooked) { try { registerTurkishInput(injector); inputHooked = true; } catch (e) { console.warn('[matrix] Türkçe giriş kancası kurulamadı', e); } }
    if (activeSheetId) { try { fwb.setActiveSheet(activeSheetId); } catch (_) {} }
    // başlangıç komutlarının (formül hesaplama, otomatik yükseklik vb.) yerleşmesini bekle
    await new Promise((r) => setTimeout(r, 80));
    await waitFormulaIdle(3000);
    if (autoRows) {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 150)));
      for (const [sid, rows] of Object.entries(autoRows)) {
        const fws = fwb.getSheetBySheetId(sid);
        if (!fws) continue;
        for (let i = 0; i < rows.length;) {
          let j = i; while (j + 1 < rows.length && rows[j + 1] === rows[j] + 1) j++;
          try { fws.autoResizeRows(rows[i], j - i + 1); } catch (e) { console.warn('[matrix] otomatik satır yüksekliği', e); }
          i = j + 1;
        }
      }
    }
  } finally {
    loading--;
  }
  // yeni belgenin "geri al" yığını boş başlamalı
  try { injector.get(IUndoRedoService).clearUndoRedo(currentUnitId); } catch (_) {}
}

function activeWorkbook() { return univerAPI.getActiveWorkbook(); }

// ---------------------------------------------------------------- kaydetme
async function getSnapshot() {
  const wb = activeWorkbook();
  if (!wb) throw new Error('Açık bir çalışma kitabı yok.');
  // düzenleme modundaki hücreyi kaydetmeden önce onayla
  try { await univerAPI.getActiveWorkbook().endEditingAsync?.(true); } catch (_) {}
  // formül hesaplamasının bitmesini bekle
  await waitFormulaIdle();
  return wb.save();
}

function waitFormulaIdle(timeout = 4000) {
  return new Promise((resolve) => {
    const start = Date.now();
    let quietSince = Date.now();
    const d = commandService.onCommandExecuted((info) => { if ((info.id || '').startsWith('formula.')) quietSince = Date.now(); });
    const tick = () => {
      if (Date.now() - quietSince > 150 || Date.now() - start > timeout) { d.dispose(); resolve(); }
      else setTimeout(tick, 50);
    };
    setTimeout(tick, 50);
  });
}

// ---------------------------------------------------------------- shell
const saveFormats = [
  { id: 'xlsx', label: 'Excel Çalışma Kitabı', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { id: 'csv', label: 'CSV (virgülle ayrılmış, UTF-8)', ext: 'csv', export: true, mime: 'text/csv' },
  { id: 'csv-semicolon', label: 'CSV (noktalı virgülle ayrılmış, Türkçe Excel)', ext: 'csv', export: true, mime: 'text/csv' },
];

const ICON_FIT = '<path d="M4 4v16M20 4v16"/><path d="M8 12h8"/><path d="m10 9-3 3 3 3"/><path d="m14 9 3 3-3 3"/>';
const ICON_FREEZE = '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>';

Shell.init({
  module: 'matrix',
  saveFormats,
  onNew: async () => { await loadWorkbook(blankWorkbook()); },
  onOpen: async ({ name, data }) => {
    const ext = (/\.([^.]+)$/.exec(name || '') || [])[1]?.toLowerCase();
    let wbData;
    if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
      const { csvToWorkbook } = await import('./csv.js');
      wbData = csvToWorkbook(data, name);
    } else {
      const { xlsxToWorkbook } = await import('./xlsx-import.js');
      wbData = await xlsxToWorkbook(data, name);
    }
    await loadWorkbook(wbData);
    if (ext === 'xlsm') Shell.toast('Makrolar (VBA) desteklenmiyor; dosya kaydedilirken .xlsx olarak kaydedilir.', 'error', 7000);
  },
  onSave: async (formatId) => {
    const snap = await getSnapshot();
    if (formatId === 'xlsx') {
      const { workbookToXlsx } = await import('./xlsx-export.js');
      return workbookToXlsx(snap, injector, { activeSheetId: activeWorkbook().getActiveSheet().getSheetId() });
    }
    const { workbookToCsv } = await import('./csv.js');
    const fws = activeWorkbook().getActiveSheet();
    let display = null;
    try { const lr = fws.getLastRow(), lc = fws.getLastColumn(); if (lr >= 0 && lc >= 0) display = fws.getRange(0, 0, lr + 1, lc + 1).getDisplayValues(); } catch (_) {}
    return workbookToCsv(snap, fws.getSheetId(), formatId === 'csv-semicolon' ? ';' : ',', display);
  },
  onPrint: async () => {
    try {
      const snap = await getSnapshot();
      const fws = activeWorkbook().getActiveSheet();
      printActiveSheet(snap, fws.getSheetId(), fws, Shell.name);
    } catch (err) { console.error(err); Shell.toast('Yazdırılamadı: ' + (err.message || err), 'error'); }
  },
  onUndo: () => univerAPI.undo(),
  onRedo: () => univerAPI.redo(),
  actions: [
    { id: 'autofit', label: 'Sütunları sığdır', title: 'Seçili sütunların genişliğini içeriğe göre ayarla', icon: ICON_FIT, optional: true,
      onClick: () => { try { autoFitColumns(univerAPI); } catch (e) { console.error(e); Shell.toast('Sütun genişliği ayarlanamadı', 'error'); } } },
  ],
});

export { univerAPI, injector, DEFAULT_FONT, DEFAULT_FONT_SIZE };
