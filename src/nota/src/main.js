/* Ewreka Nota — Word (.docx) düzenleyici
 * Motor: SuperDoc 1.x (AGPL-3.0). Copyright (C) 2026 Ewreka Digital — AGPL-3.0-or-later
 */
import { installNetGuard } from './net-guard.js';
installNetGuard();

import { SuperDoc } from 'superdoc';
import 'superdoc/style.css';
import './style.css';
import blankUrl from './assets/blank.docx?url';
import { TOOLBAR_TEXTS, FIND_REPLACE_TEXTS, PASSWORD_TEXTS, installTranslator, translateMenuSections } from './i18n-tr.js';
import { buildFontList } from './fonts.js';
import { preparePrint, cleanupPrint } from './print.js';
import { createStatusBar } from './statusbar.js';
import { freshBlankDocx, finalizeDocx } from './docx-meta.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const Shell = window.EwrekaShell;
const bridge = Shell && Shell.bridge;

const els = {
  app: document.getElementById('nota-app'),
  toolbar: document.getElementById('nota-toolbar'),
  canvas: document.getElementById('nota-canvas'),
  editor: document.getElementById('nota-editor'),
};

const state = {
  sd: null,
  ready: false,
  totalPages: 1,
  zoom: 100,
  fonts: null,
  generation: 0,
};
window.__nota = {
  get sd() { return state.sd; }, state,
  // test/tanılama kancaları
  preparePrint: () => preparePrint(els.canvas, state.totalPages),
  cleanupPrint: () => cleanupPrint(),
};

const status = createStatusBar(document.getElementById('nota-status'), {
  onZoom: (z) => setZoom(z),
  onFit: () => { try { state.sd && state.sd.setZoomMode('fit-width'); } catch (e) { console.warn(e); } },
  getEditor: () => state.sd && state.sd.activeEditor,
  canvas: els.canvas,
});

installTranslator(document.body);

// ---------- SuperDoc kurulum ----------
function destroyEditor() {
  if (!state.sd) return;
  try { state.sd.destroy(); } catch (e) { console.warn('[nota] destroy', e); }
  state.sd = null; state.ready = false;
  els.editor.innerHTML = '';
  els.toolbar.innerHTML = '';
}

function mountEditor(file) {
  destroyEditor();
  if (!state.fonts) state.fonts = buildFontList();
  const gen = ++state.generation;
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err) => {
      if (settled) return; settled = true;
      if (err) reject(err); else resolve();
    };
    const timer = setTimeout(() => done(new Error('Belge yüklenirken zaman aşımı oluştu')), 60000);
    let sd;
    try {
      sd = new SuperDoc({
        selector: '#nota-editor',
        toolbar: '#nota-toolbar',
        document: file,
        documentMode: 'editing',
        role: 'editor',
        title: 'Ewreka Nota',
        user: { name: 'Ewreka Kullanıcısı', email: 'kullanici@ewreka.local' },
        // --- gizlilik: telemetri ve uzak çağrılar KAPALI ---
        telemetry: { enabled: false },
        isDev: false,
        uiDisplayFallbackFont: '"Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Inter, Arial, sans-serif',
        rulers: false,
        zoom: { initial: state.zoom },
        layoutEngineOptions: { flowMode: 'paginated' },
        modules: {
          toolbar: {
            selector: '#nota-toolbar',
            texts: TOOLBAR_TEXTS,
            fonts: state.fonts,
            excludeItems: ['zoom', 'ai'],
            hideButtons: true,
            responsiveToContainer: true,
            showFormattingMarksButton: true,
          },
          surfaces: {
            findReplace: { ...FIND_REPLACE_TEXTS },
            passwordPrompt: { ...PASSWORD_TEXTS },
          },
          contextMenu: { menuProvider: translateMenuSections },
          whiteboard: false,
        },
        onReady: () => {
          if (gen !== state.generation) return;
          state.sd = sd;
          clearTimeout(timer);
          // yükleme sırasında oluşan güncellemeler "değişti" sayılmasın
          setTimeout(() => { if (gen === state.generation) state.ready = true; }, 400);
          status.refreshAll();
          done();
        },
        onEditorUpdate: () => {
          if (gen !== state.generation) return;
          if (state.ready) Shell.setDirty(true);
          status.scheduleCount();
        },
        onTransaction: () => { if (gen === state.generation) status.scheduleCount(); },
        onPaginationUpdate: ({ totalPages }) => {
          if (gen !== state.generation) return;
          state.totalPages = totalPages || 1;
          status.setTotalPages(state.totalPages);
        },
        onZoomChange: ({ zoom }) => {
          if (gen !== state.generation) return;
          state.zoom = zoom; status.setZoom(zoom);
        },
        onContentError: ({ error }) => {
          console.error('[nota] içerik hatası', error);
          done(new Error('Belge içeriği okunamadı. Dosya bozuk ya da desteklenmeyen bir biçimde olabilir.'));
        },
        onException: (payload) => {
          console.error('[nota] SuperDoc hatası', payload);
          if (!settled && payload && 'stage' in payload) done(new Error('Belge açılamadı.'));
        },
      });
      state.sd = sd;
    } catch (err) {
      clearTimeout(timer);
      done(err);
    }
  });
}

async function blankFile() {
  const r = await fetch(blankUrl);
  if (!r.ok) throw new Error('Boş belge şablonu yüklenemedi');
  let bytes = new Uint8Array(await r.arrayBuffer());
  try { bytes = await freshBlankDocx(bytes); } catch (e) { console.warn('[nota] şablon kimliği yenilenemedi', e); }
  return new File([bytes], 'Adsız belge.docx', { type: DOCX_MIME });
}

function setZoom(z) {
  z = Math.max(25, Math.min(400, Math.round(z)));
  state.zoom = z;
  try { state.sd && state.sd.setZoom(z); } catch (e) { console.warn(e); }
  status.setZoom(z);
}

// Ctrl + tekerlek ile yakınlaştırma
els.canvas.addEventListener('wheel', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  setZoom(state.zoom + (e.deltaY < 0 ? 10 : -10));
}, { passive: false });
window.addEventListener('keydown', (e) => {
  const mod = Shell.isMac ? e.metaKey : e.ctrlKey;
  if (!mod || e.altKey) return;
  if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(state.zoom + 10); }
  else if (e.key === '-') { e.preventDefault(); setZoom(state.zoom - 10); }
  else if (e.key === '0') { e.preventDefault(); setZoom(100); }
}, true);

// ---------- Dışa aktarım ----------
async function exportDocx() {
  const sd = state.sd;
  if (!sd) throw new Error('Açık belge yok');
  const blob = await sd.export({ exportType: ['docx'], triggerDownload: false, commentsType: 'external' });
  if (!blob) throw new Error('Belge dışa aktarılamadı');
  return finalizeDocx(new Uint8Array(await blob.arrayBuffer()));
}

function docText() {
  const ed = state.sd && state.sd.activeEditor;
  if (!ed) return '';
  const doc = ed.state.doc;
  return doc.textBetween(0, doc.content.size, '\n\n', '\n');
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function exportHtml() {
  const parts = (state.sd && state.sd.getHTML()) || [];
  const title = escapeHtml((Shell.name || 'Belge').replace(/\.[^.]+$/, ''));
  const html = `<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<meta name="generator" content="Ewreka Nota">\n<title>${title}</title>\n<style>body{font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;font-size:11pt;line-height:1.4;max-width:21cm;margin:2cm auto;padding:0 1cm;color:#111}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:4px 6px;vertical-align:top}img{max-width:100%;height:auto}</style>\n</head>\n<body>\n${parts.join('\n')}\n</body>\n</html>\n`;
  return new TextEncoder().encode(html);
}

async function printPages(mode) {
  const sd = state.sd;
  if (!sd) return null;
  Shell.busy(mode === 'pdf' ? 'PDF hazırlanıyor…' : 'Yazdırmaya hazırlanıyor…');
  let info;
  try {
    info = await preparePrint(els.canvas, state.totalPages);
  } finally { Shell.done(); }
  document.body.classList.add('nota-printing');
  try {
    if (mode === 'pdf' && bridge && bridge.printToPDF) {
      Shell.busy('PDF oluşturuluyor…');
      try {
        const data = await bridge.printToPDF({
          pageSize: { width: info.widthIn, height: info.heightIn },
          margins: { marginType: 'none', top: 0, bottom: 0, left: 0, right: 0 },
        });
        return data;
      } finally { Shell.done(); }
    }
    await new Promise((r) => setTimeout(r, 50));
    window.print();
    return null;
  } finally {
    document.body.classList.remove('nota-printing');
    cleanupPrint();
  }
}

// ---------- Kabuk ----------
const saveFormats = [
  { id: 'docx', label: 'Word Belgesi', ext: 'docx', mime: DOCX_MIME },
  { id: 'pdf', label: 'PDF olarak dışa aktar', ext: 'pdf', export: true, mime: 'application/pdf' },
  { id: 'html', label: 'Web sayfası (HTML)', ext: 'html', export: true, mime: 'text/html' },
  { id: 'txt', label: 'Düz metin', ext: 'txt', export: true, mime: 'text/plain' },
];

const ICON_FIND = '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>';

function openFind() {
  const ed = state.sd && state.sd.activeEditor;
  if (!ed) return;
  try { ed.view.focus(); } catch (_) {}
  const target = (ed.view && ed.view.dom) || document.activeElement || document.body;
  const ev = new KeyboardEvent('keydown', { key: 'f', code: 'KeyF', ctrlKey: !Shell.isMac, metaKey: Shell.isMac, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
}

Shell.init({
  module: 'nota',
  saveFormats,
  actions: [
    { id: 'find', label: 'Bul', title: `Bul ve değiştir (${Shell.isMac ? '⌘F' : 'Ctrl+F'})`, icon: ICON_FIND, onClick: () => openFind() },
  ],
  onNew: async () => { await mountEditor(await blankFile()); },
  onOpen: async ({ name, data }) => {
    try {
      if (!data || !data.byteLength) throw new Error('Dosya boş');
      // .docx bir ZIP arşividir: "PK" imzasını denetle (eski .doc biçimi desteklenmez)
      if (data[0] === 0xD0 && data[1] === 0xCF) throw new Error('Eski Word 97-2003 (.doc) biçimi desteklenmiyor; dosyayı .docx olarak kaydedip yeniden deneyin');
      if (!(data[0] === 0x50 && data[1] === 0x4b)) throw new Error('Bu dosya geçerli bir Word (.docx) belgesi değil');
      await mountEditor(new File([data], name || 'belge.docx', { type: DOCX_MIME }));
    } catch (err) {
      // Açılış başarısızsa ekranda düzenleyici kalmasın diye boş belgeye dön
      if (!state.sd || !state.ready) { try { await mountEditor(await blankFile()); } catch (e2) { console.error(e2); } }
      throw err;
    }
  },
  onSave: async (fmt) => {
    if (fmt === 'docx') return exportDocx();
    if (fmt === 'html') return exportHtml();
    if (fmt === 'txt') return new TextEncoder().encode(docText().replace(/\n/g, '\r\n'));
    if (fmt === 'pdf') {
      if (bridge && bridge.printToPDF) return printPages('pdf');
      Shell.toast('Yazdırma penceresinde hedef olarak “PDF olarak kaydet”i seçin.');
      await printPages('print');
      return null;
    }
    throw new Error('Bilinmeyen biçim: ' + fmt);
  },
  onPrint: () => { printPages('print').catch((e) => { console.error(e); Shell.toast('Yazdırılamadı: ' + e.message, 'error'); }); },
  onUndo: () => { try { state.sd.activeEditor.commands.undo(); } catch (e) { console.warn(e); } },
  onRedo: () => { try { state.sd.activeEditor.commands.redo(); } catch (e) { console.warn(e); } },
  onReady: () => { document.body.classList.add('nota-ready'); },
});
