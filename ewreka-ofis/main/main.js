'use strict';
// Ewreka Ofis — ana süreç (Electron main process)
// Copyright (C) 2026 Ewreka Digital — AGPL-3.0-or-later

const { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const APP_ROOT = path.join(__dirname, '..');
const IS_MAC = process.platform === 'darwin';

const MODULES = {
  nota:   { title: 'Ewreka Nota',   exts: ['docx'],                 filterName: 'Word Belgesi',     color: '#4C8DFF' },
  matrix: { title: 'Ewreka Matrix', exts: ['xlsx', 'xlsm', 'csv'],  filterName: 'Elektronik Tablo', color: '#2ECC8A' },
  vista:  { title: 'Ewreka Vista',  exts: ['pptx'],                 filterName: 'Sunum',            color: '#FF8A2A' },
  carta:  { title: 'Ewreka Carta',  exts: ['pdf'],                  filterName: 'PDF Belgesi',      color: '#FF5468' },
};
const EXT_TO_MODULE = {};
for (const [m, def] of Object.entries(MODULES)) for (const e of def.exts) EXT_TO_MODULE[e] = m;

app.setName('Ewreka Ofis');
if (process.platform === 'win32') app.setAppUserModelId('net.ewreka.ofis');

protocol.registerSchemesAsPrivileged([
  { scheme: 'ewreka', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } },
]);

// ---------- Tek örnek kilidi ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

// ---------- Yardımcılar ----------
function moduleForPath(p) {
  const ext = path.extname(p || '').slice(1).toLowerCase();
  return EXT_TO_MODULE[ext] || null;
}
function iconPath(name) {
  const dir = app.isPackaged ? path.join(process.resourcesPath, 'icons') : path.join(APP_ROOT, 'build', 'icons');
  const ico = app.isPackaged ? path.join(dir, `${name}.ico`) : path.join(dir, 'win', `${name}.ico`);
  const png = path.join(dir, `${name}.png`);
  if (process.platform === 'win32' && fs.existsSync(ico)) return ico;
  return fs.existsSync(png) ? png : undefined;
}
function parseArgs(argv) {
  // argv: [exe, (app path in dev), ...args]
  const out = { module: null, files: [] };
  const args = argv.slice(app.isPackaged ? 1 : 2);
  for (const a of args) {
    if (!a) continue;
    if (a.startsWith('--module=')) { const m = a.slice(9); if (MODULES[m] || m === 'launcher') out.module = m; continue; }
    if (a.startsWith('-')) continue;
    try { if (fs.existsSync(a) && fs.statSync(a).isFile()) out.files.push(path.resolve(a)); } catch (_) {}
  }
  return out;
}

// ---------- Son kullanılan dosyalar ----------
const recentFile = () => path.join(app.getPath('userData'), 'recent.json');
function readRecent() {
  try { return JSON.parse(fs.readFileSync(recentFile(), 'utf8')).filter(r => r && r.path); } catch (_) { return []; }
}
function addRecent(p) {
  if (!p) return;
  const m = moduleForPath(p);
  if (!m) return;
  let list = readRecent().filter(r => r.path !== p);
  list.unshift({ path: p, name: path.basename(p), module: m, time: Date.now() });
  list = list.slice(0, 30);
  try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(recentFile(), JSON.stringify(list)); } catch (_) {}
  try { app.addRecentDocument(p); } catch (_) {}
}

// ---------- Pencereler ----------
const windowState = new Map(); // webContents.id -> { module, launchPath, path, dirty, forceClose }

function createWindow(moduleName, filePath) {
  const isLauncher = moduleName === 'launcher';
  const def = MODULES[moduleName];
  const win = new BrowserWindow({
    width: isLauncher ? 1040 : 1360,
    height: isLauncher ? 700 : 880,
    minWidth: isLauncher ? 760 : 900,
    minHeight: 560,
    show: false,
    title: isLauncher ? 'Ewreka Ofis' : def.title,
    icon: iconPath(isLauncher ? 'app' : moduleName),
    backgroundColor: '#141416',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      additionalArguments: [`--ewreka-module=${moduleName}`, `--ewreka-platform=${process.platform}`],
    },
  });

  windowState.set(win.webContents.id, { module: moduleName, launchPath: filePath || null, path: filePath || null, dirty: false, forceClose: false });

  if (process.platform === 'win32' && !isLauncher) {
    try {
      win.setAppDetails({
        appId: `net.ewreka.${moduleName}`,
        appIconPath: iconPath(moduleName),
        relaunchCommand: `"${process.execPath}" --module=${moduleName}`,
        relaunchDisplayName: def.title,
      });
    } catch (_) {}
  }
  try { win.webContents.session.setSpellCheckerLanguages(['tr', 'en-US']); } catch (_) {}

  const page = isLauncher ? 'launcher/index.html' : `modules/${moduleName}/index.html`;
  win.loadURL(`ewreka://app/${page}`);
  win.once('ready-to-show', () => win.show());
  if (process.env.EWREKA_DEBUG) {
    win.webContents.on('console-message', (ev) => { const lv = ev.level; if (lv === 'error' || lv === 'warning' || lv === 2 || lv === 3) console.log(`[${moduleName}:${lv}]`, String(ev.message).slice(0, 400)); });
    win.webContents.on('render-process-gone', (_e, d) => console.log(`[${moduleName}] render gone`, d));
    win.webContents.on('did-fail-load', (_e, c, d, u) => console.log(`[${moduleName}] fail-load`, c, d, u));
  }
  win.on('page-title-updated', (e) => { if (!isLauncher) e.preventDefault(); });

  const wcId = win.webContents.id;
  win.on('close', (e) => {
    const st = windowState.get(wcId);
    if (!st || st.forceClose || !st.dirty) return;
    e.preventDefault();
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ['Kaydet', 'Kaydetme', 'İptal'],
      defaultId: 0, cancelId: 2,
      title: 'Kaydedilmemiş değişiklikler',
      message: `"${st.path ? path.basename(st.path) : 'Adsız belge'}" belgesindeki değişiklikler kaydedilsin mi?`,
      detail: 'Kaydetmezseniz değişiklikleriniz kaybolur.',
    });
    if (choice === 0) win.webContents.send('ewreka:command', 'save-and-close');
    else if (choice === 1) { st.forceClose = true; win.close(); }
  });
  win.on('closed', () => windowState.delete(wcId));

  // Harici bağlantılar tarayıcıda açılsın
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:|^mailto:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('ewreka://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });
  return win;
}

function openPath(p, preferWin) {
  const m = moduleForPath(p);
  if (!m) {
    dialog.showErrorBox('Desteklenmeyen dosya', `${path.basename(p)} dosya türü Ewreka Ofis tarafından açılamıyor.`);
    return;
  }
  // Zaten açıksa öne getir
  for (const w of BrowserWindow.getAllWindows()) {
    const st = windowState.get(w.webContents.id);
    if (st && st.path === p) { if (w.isMinimized()) w.restore(); w.focus(); return; }
  }
  addRecent(p);
  createWindow(m, p);
  // Boş başlatıcı penceresi açıksa ve istek oradan geldiyse kapat
  if (preferWin) {
    const st = windowState.get(preferWin.webContents.id);
    if (st && st.module === 'launcher') preferWin.close();
  }
}

function handleArgs(argv) {
  const { module, files } = parseArgs(argv);
  if (files.length) { files.forEach(f => openPath(f)); return; }
  createWindow(module || 'launcher');
}

// macOS: Finder'dan dosya açma
const pendingOpen = [];
app.on('open-file', (e, p) => {
  e.preventDefault();
  if (app.isReady()) openPath(p); else pendingOpen.push(p);
});

app.on('second-instance', (_e, argv) => handleArgs(argv));

// ---------- IPC ----------
function stateOf(e) { return windowState.get(e.sender.id) || {}; }
function readFileObj(p) {
  const data = fs.readFileSync(p);
  return { path: p, name: path.basename(p), data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength) };
}
function moduleFilters(m, extra) {
  if (extra && extra.length) return extra;
  const def = MODULES[m];
  if (!def) return [{ name: 'Tüm Ewreka belgeleri', extensions: Object.keys(EXT_TO_MODULE) }];
  return [{ name: def.filterName, extensions: def.exts }, { name: 'Tüm dosyalar', extensions: ['*'] }];
}

ipcMain.handle('ewreka:info', (e) => ({
  module: stateOf(e).module, platform: process.platform, version: app.getVersion(),
  electron: process.versions.electron, chrome: process.versions.chrome,
  dark: nativeTheme.shouldUseDarkColors,
}));

ipcMain.handle('ewreka:launch-file', (e) => {
  const st = stateOf(e);
  if (!st.launchPath) return null;
  const p = st.launchPath; st.launchPath = null;
  try { return readFileObj(p); } catch (err) { return { error: String(err.message || err), path: p }; }
});

ipcMain.handle('ewreka:open-dialog', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const st = stateOf(e);
  const r = await dialog.showOpenDialog(win, {
    title: opts.title || 'Dosya aç',
    properties: ['openFile'].concat(opts.multi ? ['multiSelections'] : []),
    filters: moduleFilters(opts.module || st.module, opts.filters),
  });
  if (r.canceled || !r.filePaths.length) return null;
  const files = r.filePaths.map(readFileObj);
  return opts.multi ? files : files[0];
});

// Başlatıcı ya da modül: yolu seç, doğru modülde aç
ipcMain.handle('ewreka:open-in-app', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  let paths = opts.paths;
  if (!paths) {
    const st = stateOf(e);
    const r = await dialog.showOpenDialog(win, {
      title: 'Dosya aç', properties: ['openFile', 'multiSelections'],
      filters: opts.anyModule ? moduleFilters(null) : moduleFilters(st.module === 'launcher' ? null : st.module).concat(st.module === 'launcher' ? [] : [{ name: 'Tüm Ewreka belgeleri', extensions: Object.keys(EXT_TO_MODULE) }]),
    });
    if (r.canceled) return false;
    paths = r.filePaths;
  }
  paths.forEach(p => openPath(p, win));
  return true;
});

ipcMain.handle('ewreka:read-file', (_e, p) => readFileObj(p));

ipcMain.handle('ewreka:save', async (e, opts) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const st = stateOf(e);
  let target = opts.saveAs ? null : (opts.path || null);
  if (!target) {
    const def = MODULES[st.module];
    const defaultDir = st.path ? path.dirname(st.path) : app.getPath('documents');
    const r = await dialog.showSaveDialog(win, {
      title: opts.title || 'Farklı kaydet',
      defaultPath: path.join(defaultDir, opts.defaultName || 'Adsız'),
      filters: opts.filters && opts.filters.length ? opts.filters : (def ? [{ name: def.filterName, extensions: [def.exts[0]] }] : undefined),
    });
    if (r.canceled || !r.filePath) return null;
    target = r.filePath;
  }
  const buf = Buffer.from(opts.data instanceof Uint8Array ? opts.data : new Uint8Array(opts.data));
  const tmp = target + '.ewreka-tmp';
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, target);
  if (!opts.export) { st.path = target; addRecent(target); }
  return { path: target, name: path.basename(target) };
});

ipcMain.on('ewreka:set-state', (e, s = {}) => {
  const st = stateOf(e);
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  if ('dirty' in s) st.dirty = !!s.dirty;
  if ('path' in s) st.path = s.path || null;
  const def = MODULES[st.module];
  const docName = s.name || (st.path ? path.basename(st.path) : 'Adsız');
  if (def) win.setTitle(`${st.dirty ? '• ' : ''}${docName} — ${def.title}`);
  if (IS_MAC) { win.setDocumentEdited(st.dirty); if (st.path) win.setRepresentedFilename(st.path); }
});

ipcMain.on('ewreka:close-window', (e) => {
  const st = stateOf(e); st.forceClose = true;
  const win = BrowserWindow.fromWebContents(e.sender); if (win) win.close();
});

ipcMain.handle('ewreka:open-window', (e, { module, path: p } = {}) => {
  const from = BrowserWindow.fromWebContents(e.sender);
  if (p) openPath(p, from);
  else if (MODULES[module]) {
    createWindow(module);
    const st = from && windowState.get(from.webContents.id);
    if (st && st.module === 'launcher') from.close();
  } else if (module === 'launcher') {
    const existing = BrowserWindow.getAllWindows().find(w => (windowState.get(w.webContents.id) || {}).module === 'launcher');
    if (existing) existing.focus(); else createWindow('launcher');
  }
  return true;
});

ipcMain.handle('ewreka:recent', () => readRecent().filter(r => { try { return fs.existsSync(r.path); } catch (_) { return false; } }));
ipcMain.handle('ewreka:recent-remove', (_e, p) => {
  const list = readRecent().filter(r => r.path !== p);
  try { fs.writeFileSync(recentFile(), JSON.stringify(list)); } catch (_) {}
  return true;
});
ipcMain.handle('ewreka:open-external', (_e, url) => { if (/^https?:|^mailto:/.test(url)) shell.openExternal(url); });
ipcMain.handle('ewreka:show-in-folder', (_e, p) => { if (p) shell.showItemInFolder(p); });
ipcMain.handle('ewreka:confirm', async (e, { message, detail, buttons }) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showMessageBox(win, { type: 'question', message, detail, buttons: buttons || ['Tamam', 'İptal'], defaultId: 0, cancelId: (buttons || [1, 1]).length - 1 });
  return r.response;
});
ipcMain.handle('ewreka:print-to-pdf', async (e, opts = {}) => {
  const o = { printBackground: true, pageSize: opts.pageSize || 'A4', landscape: !!opts.landscape };
  if (opts.margins) {
    const m = opts.margins; const n = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
    o.margins = { top: n(m.top), bottom: n(m.bottom), left: n(m.left), right: n(m.right) };
  }
  if (opts.preferCSSPageSize) o.preferCSSPageSize = true;
  const data = await e.sender.printToPDF(o);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
});

// ---------- Menü ----------
function sendCmd(cmd) {
  const w = BrowserWindow.getFocusedWindow();
  if (w) w.webContents.send('ewreka:command', cmd);
}
function buildMenu() {
  if (!IS_MAC) { Menu.setApplicationMenu(null); return; }
  const newSub = Object.entries(MODULES).map(([m, d]) => ({ label: d.title, click: () => createWindow(m) }));
  const template = [
    { label: 'Ewreka Ofis', submenu: [
      { label: 'Ewreka Ofis Hakkında', click: () => sendCmd('about') },
      { type: 'separator' },
      { label: 'Başlangıç ekranı', accelerator: 'Cmd+Shift+H', click: () => createWindow('launcher') },
      { type: 'separator' },
      { role: 'hide', label: 'Ewreka Ofis\'i gizle' }, { role: 'hideOthers', label: 'Diğerlerini gizle' }, { role: 'unhide', label: 'Tümünü göster' },
      { type: 'separator' }, { role: 'quit', label: 'Ewreka Ofis\'ten çık' },
    ] },
    { label: 'Dosya', submenu: [
      { label: 'Yeni', accelerator: 'Cmd+N', click: () => sendCmd('new') },
      { label: 'Yeni uygulama penceresi', submenu: newSub },
      { label: 'Aç…', accelerator: 'Cmd+O', click: () => sendCmd('open') },
      { type: 'separator' },
      { label: 'Kaydet', accelerator: 'Cmd+S', click: () => sendCmd('save') },
      { label: 'Farklı kaydet…', accelerator: 'Cmd+Shift+S', click: () => sendCmd('saveAs') },
      { type: 'separator' },
      { label: 'Yazdır…', accelerator: 'Cmd+P', click: () => sendCmd('print') },
      { type: 'separator' },
      { role: 'close', label: 'Pencereyi kapat' },
    ] },
    { label: 'Düzen', submenu: [
      { label: 'Geri al', accelerator: 'Cmd+Z', click: () => sendCmd('undo') },
      { label: 'Yinele', accelerator: 'Cmd+Shift+Z', click: () => sendCmd('redo') },
      { type: 'separator' },
      { role: 'cut', label: 'Kes' }, { role: 'copy', label: 'Kopyala' }, { role: 'paste', label: 'Yapıştır' },
      { role: 'selectAll', label: 'Tümünü seç' },
    ] },
    { label: 'Görünüm', submenu: [
      { role: 'togglefullscreen', label: 'Tam ekran' },
      { role: 'resetZoom', label: 'Gerçek boyut' }, { role: 'zoomIn', label: 'Yakınlaştır' }, { role: 'zoomOut', label: 'Uzaklaştır' },
    ] },
    { role: 'windowMenu', label: 'Pencere' },
    { label: 'Yardım', submenu: [
      { label: 'ewreka.net', click: () => shell.openExternal('https://www.ewreka.net') },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- Başlangıç ----------
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wasm': 'application/wasm',
  '.ftl': 'text/plain', '.properties': 'text/plain', '.bcmap': 'application/octet-stream', '.pfb': 'application/octet-stream', '.map': 'application/json',
  '.txt': 'text/plain', '.xml': 'application/xml', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
};

app.whenReady().then(() => {
  protocol.handle('ewreka', async (req) => {
    const u = new URL(req.url);
    let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    const full = path.normalize(path.join(APP_ROOT, rel));
    if (!full.startsWith(APP_ROOT)) return new Response('Yasak', { status: 403 });
    try {
      const data = await fs.promises.readFile(full);
      return new Response(data, { headers: { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' } });
    } catch (_) {
      return new Response('Bulunamadı', { status: 404 });
    }
  });

  // Modüllerden tetiklenen indirmeleri kaydetme penceresine yönlendir
  const { session } = require('electron');
  session.defaultSession.on('will-download', (_e, item, wc) => {
    const win = BrowserWindow.fromWebContents(wc);
    const st = windowState.get(wc.id) || {};
    const dir = st.path ? path.dirname(st.path) : app.getPath('documents');
    const p = dialog.showSaveDialogSync(win, { title: 'Kaydet', defaultPath: path.join(dir, item.getFilename()) });
    if (p) item.setSavePath(p); else item.cancel();
  });

  buildMenu();
  if (pendingOpen.length) { pendingOpen.splice(0).forEach(p => openPath(p)); }
  else handleArgs(process.argv);

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow('launcher'); });
});

// Yalnızca geliştirme/test: EWREKA_TEST_SHOT=klasör => pencerelerin görüntüsünü al ve çık
if (process.env.EWREKA_TEST_SHOT) {
  app.whenReady().then(() => setTimeout(async () => {
    const dir = process.env.EWREKA_TEST_SHOT; fs.mkdirSync(dir, { recursive: true });
    let i = 0;
    for (const w of BrowserWindow.getAllWindows()) {
      const st = windowState.get(w.webContents.id) || {};
      try {
        const extra = process.env.EWREKA_TEST_JS ? await w.webContents.executeJavaScript(process.env.EWREKA_TEST_JS, true) : '';
        if (extra) console.log('[test-js]', st.module, JSON.stringify(extra).slice(0, 2000));
        await new Promise(r => setTimeout(r, 800));
        const img = await w.webContents.capturePage();
        fs.writeFileSync(path.join(dir, `${++i}-${st.module}.png`), img.toPNG());
        console.log('[shot]', st.module, w.getTitle());
      } catch (err) { console.log('[shot-error]', String(err)); }
    }
    for (const w of BrowserWindow.getAllWindows()) { const st = windowState.get(w.webContents.id); if (st) st.forceClose = true; }
    app.exit(0);
  }, +(process.env.EWREKA_TEST_WAIT || 6000)));
}

app.on('window-all-closed', () => { if (!IS_MAC) app.quit(); });
