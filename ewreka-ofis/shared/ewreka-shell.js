/* Ewreka Ofis — ortak uygulama kabuğu
 * Her modül (Nota, Matrix, Vista, Carta) bu betiği yükler ve EwrekaShell.init({...}) çağırır.
 * Masaüstünde window.ewreka köprüsünü (Electron preload) kullanır; tarayıcıda dosya seçici/indirme ile çalışır.
 * Copyright (C) 2026 Ewreka Digital — AGPL-3.0-or-later
 */
(function () {
  'use strict';
  const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || location.href;
  const BASE = SCRIPT_SRC.replace(/[^/]*$/, ''); // .../shared/
  const asset = (p) => BASE + 'assets/' + p;
  const bridge = window.ewreka && window.ewreka.isDesktop ? window.ewreka : null;
  const isMac = bridge ? bridge.platform === 'darwin' : /Mac/.test(navigator.platform);
  const SOURCE_URL = 'https://www.ewreka.net/ofis';
  const VERSION = '1.0.0';

  const MODS = {
    nota:   { title: 'Ewreka Nota',   color: '#4C8DFF', blank: 'Adsız belge',  exts: ['docx'] },
    matrix: { title: 'Ewreka Matrix', color: '#2ECC8A', blank: 'Adsız tablo',  exts: ['xlsx', 'xlsm', 'csv'] },
    vista:  { title: 'Ewreka Vista',  color: '#FF8A2A', blank: 'Adsız sunum',  exts: ['pptx'] },
    carta:  { title: 'Ewreka Carta',  color: '#FF5468', blank: 'Adsız PDF',    exts: ['pdf'] },
  };
  const ALL_EXTS = { docx: 'nota', xlsx: 'matrix', xlsm: 'matrix', csv: 'matrix', pptx: 'vista', pdf: 'carta' };

  const I = {
    new: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9 14h6"/>',
    open: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"/><path d="M3 7v11a2 2 0 0 0 2 2h13.5a2 2 0 0 0 1.9-1.4L22 12H7.2a2 2 0 0 0-1.9 1.4L3 20"/>',
    save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v6h8V3"/><rect x="7" y="13" width="10" height="8" rx="1"/>',
    saveAs: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24">${I[k] || k}</svg>`;

  const S = {
    opts: null, module: null, def: null,
    path: null, name: null, dirty: false, pristine: true,
    el: {},
  };

  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function extOf(n) { const m = /\.([^.]+)$/.exec(n || ''); return m ? m[1].toLowerCase() : ''; }
  function stripExt(n) { return String(n || '').replace(/\.[^.]+$/, ''); }

  // ---------- Bildirim, meşgul ----------
  function toast(msg, type, ms) {
    let box = document.querySelector('.ew-toasts');
    if (!box) { box = h('<div class="ew-toasts"></div>'); document.body.appendChild(box); }
    const t = h(`<div class="ew-toast ${type ? 'ew-' + type : ''}">${esc(msg)}</div>`);
    box.appendChild(t);
    setTimeout(() => t.remove(), ms || (type === 'error' ? 6000 : 2600));
  }
  let busyEl = null, busyCount = 0;
  function busy(msg) {
    busyCount++;
    if (!busyEl) { busyEl = h('<div class="ew-busy"><div class="ew-busy-box"><div class="ew-spin"></div><span></span></div></div>'); document.body.appendChild(busyEl); }
    busyEl.querySelector('span').textContent = msg || 'Lütfen bekleyin…';
  }
  function done() { busyCount = Math.max(0, busyCount - 1); if (!busyCount && busyEl) { busyEl.remove(); busyEl = null; } }

  // ---------- Menü ----------
  function popMenu(anchor, items) {
    closeMenus();
    const m = h('<div class="ew-menu" role="menu"></div>');
    for (const it of items) {
      if (it === '-') { m.appendChild(h('<hr>')); continue; }
      const b = h(`<button role="menuitem">${it.icon ? svg(it.icon).replace('<svg', '<svg width="16" height="16" style="stroke:currentColor;fill:none;stroke-width:1.8"') : ''}<span>${esc(it.label)}</span>${it.hint ? `<span class="ew-ext">${esc(it.hint)}</span>` : ''}</button>`);
      b.onclick = () => { closeMenus(); it.onClick(); };
      m.appendChild(b);
    }
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    m.style.top = (r.bottom + 4) + 'px';
    m.style.left = Math.min(r.left, window.innerWidth - m.offsetWidth - 8) + 'px';
    setTimeout(() => document.addEventListener('mousedown', outside, true), 0);
    function outside(e) { if (!m.contains(e.target)) { closeMenus(); document.removeEventListener('mousedown', outside, true); } }
  }
  function closeMenus() { document.querySelectorAll('.ew-menu').forEach(x => x.remove()); }

  // ---------- Durum ----------
  function updateTitle() {
    const name = S.name || S.def.blank;
    if (S.el.doc) S.el.doc.innerHTML = esc(name) + (S.dirty ? '<span class="ew-dot" title="Kaydedilmemiş değişiklikler">●</span>' : '');
    document.title = `${S.dirty ? '• ' : ''}${name} — ${S.def.title}`;
    if (bridge) bridge.setState({ dirty: S.dirty, path: S.path, name });
  }
  function setDirty(v) {
    v = !!v;
    if (v) S.pristine = false;
    if (S.dirty === v) return;
    S.dirty = v; updateTitle();
  }
  function setDocument(name, path) { S.name = name || null; S.path = path || null; S.pristine = !name && !path; updateTitle(); }

  // ---------- Dosya işlemleri ----------
  async function loadFile(file) {
    const ext = extOf(file.name);
    const target = ALL_EXTS[ext];
    if (target && target !== S.module) {
      if (bridge && file.path) { bridge.openWindow(null, file.path); return; }
      toast(`Bu dosya ${MODS[target].title} ile açılır.`, 'error'); return;
    }
    busy(`${file.name} açılıyor…`);
    try {
      await S.opts.onOpen(file);
      setDocument(file.name, file.path || null);
      S.dirty = false; S.pristine = false; updateTitle();
    } catch (err) {
      console.error(err);
      toast(`Dosya açılamadı: ${err && err.message ? err.message : err}`, 'error');
    } finally { done(); }
  }

  async function cmdNew() {
    if (bridge) {
      if (S.pristine && !S.dirty) { return; }
      bridge.openWindow(S.module); return;
    }
    if (S.dirty && !confirm('Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?')) return;
    await S.opts.onNew();
    setDocument(null, null); S.dirty = false; updateTitle();
  }

  function pickFileBrowser(accept) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept; inp.style.display = 'none';
      inp.onchange = async () => {
        const f = inp.files && inp.files[0]; inp.remove();
        if (!f) return resolve(null);
        resolve({ name: f.name, data: new Uint8Array(await f.arrayBuffer()), path: null });
      };
      document.body.appendChild(inp); inp.click();
    });
  }

  async function cmdOpen() {
    if (bridge) {
      const f = await bridge.openDialog({ module: S.module, filters: [
        { name: S.def.title.replace('Ewreka ', '') + ' dosyaları', extensions: S.def.exts },
        { name: 'Tüm Ewreka belgeleri', extensions: Object.keys(ALL_EXTS) },
      ] });
      if (!f) return;
      const target = ALL_EXTS[extOf(f.name)];
      if (target !== S.module || !(S.pristine && !S.dirty)) { bridge.openWindow(null, f.path); return; }
      return loadFile(f);
    }
    const f = await pickFileBrowser(S.def.exts.map(e => '.' + e).join(','));
    if (f) { if (S.dirty && !confirm('Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?')) return; loadFile(f); }
  }

  function formats() { return S.opts.saveFormats && S.opts.saveFormats.length ? S.opts.saveFormats : [{ id: S.def.exts[0], label: S.def.exts[0].toUpperCase(), ext: S.def.exts[0] }]; }

  async function saveWith(fmt, forceDialog) {
    const isNative = !fmt.export;
    busy('Kaydediliyor…');
    let data;
    try { data = await S.opts.onSave(fmt.id); }
    catch (err) { done(); console.error(err); toast('Kaydedilemedi: ' + (err && err.message ? err.message : err), 'error'); return false; }
    done();
    if (!data) return false;
    if (data instanceof ArrayBuffer) data = new Uint8Array(data);
    if (data instanceof Blob) data = new Uint8Array(await data.arrayBuffer());
    const base = stripExt(S.name || S.def.blank);
    const defaultName = `${base}.${fmt.ext}`;
    if (bridge) {
      const usePath = isNative && !forceDialog && S.path && extOf(S.path) === fmt.ext ? S.path : null;
      const r = await bridge.save({ path: usePath, saveAs: !usePath, data, defaultName, export: !isNative,
        filters: [{ name: fmt.label, extensions: [fmt.ext] }] });
      if (!r) return false;
      if (isNative) { S.path = r.path; S.name = r.name; S.pristine = false; S.dirty = false; updateTitle(); }
      toast(isNative ? `Kaydedildi: ${r.name}` : `Dışa aktarıldı: ${r.name}`, 'ok');
      return true;
    }
    const blob = new Blob([data], { type: fmt.mime || 'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = defaultName;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    if (isNative) { S.name = defaultName; S.dirty = false; S.pristine = false; updateTitle(); }
    return true;
  }
  const cmdSave = () => saveWith(formats()[0], false);
  function cmdSaveAs(anchor) {
    const f = formats();
    if (f.length === 1 || !anchor) return saveWith(f[0], true);
    popMenu(anchor, f.map(x => ({ label: x.label, hint: '.' + x.ext, icon: 'saveAs', onClick: () => saveWith(x, true) })));
  }
  function cmdPrint() { if (S.opts.onPrint) S.opts.onPrint(); else window.print(); }

  // ---------- Hakkında ----------
  const COMPONENTS = [
    ['Electron', 'MIT'], ['PDF.js (Mozilla)', 'Apache-2.0'], ['pdf-lib', 'MIT'],
    ['Univer', 'Apache-2.0'], ['ExcelJS', 'MIT'], ['SuperDoc', 'AGPL-3.0'],
    ['PPTist', 'AGPL-3.0'], ['pptxgenjs', 'MIT'], ['pptxtojson', 'MIT'], ['ECharts', 'Apache-2.0'], ['fflate', 'MIT'], ['Vue.js', 'MIT'], ['ProseMirror', 'MIT'], ['DejaVu Fonts', 'Bitstream Vera'],
  ];
  async function about() {
    let info = {};
    if (bridge) { try { info = await bridge.info(); } catch (_) {} }
    const bg = h(`<div class="ew-modal-bg"><div class="ew-modal" role="dialog" aria-label="Hakkında">
      <header><img src="${asset('logo-light.png')}" alt="ewreka digital"><div><strong style="font-size:18px">${esc(S.def ? S.def.title : 'Ewreka Ofis')}</strong><br><span style="color:#a1a1aa">Ewreka Ofis ${info.version || VERSION} · ücretsiz ve açık kaynak</span></div></header>
      <div class="ew-body">
        <p>Ewreka Ofis, Ewreka Digital tarafından Türkiye'de geliştirilen, açık kaynak tabanlı ücretsiz bir ofis paketidir: <b>Nota</b> (belge), <b>Matrix</b> (tablo), <b>Vista</b> (sunum) ve <b>Carta</b> (PDF).</p>
        <p>Bu yazılım <b>GNU Affero Genel Kamu Lisansı v3 (AGPL-3.0)</b> ile dağıtılır. Kaynak kodu: <a href="${SOURCE_URL}" data-ext>${SOURCE_URL.replace('https://', '')}</a></p>
        <h3>Kullanılan açık kaynak bileşenler</h3>
        <table>${COMPONENTS.map(c => `<tr><td>${esc(c[0])}</td><td>${esc(c[1])}</td></tr>`).join('')}</table>
        <p style="margin-top:12px;color:#8b8b93;font-size:12px">Bu bileşenlerin geliştiricilerine teşekkür ederiz. Lisans metinleri uygulama klasöründeki "lisanslar" dizinindedir.${info.electron ? ` · Electron ${info.electron}` : ''}</p>
      </div>
      <footer><button class="ew-btn ew-primary">Kapat</button></footer></div></div>`);
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('footer button')) bg.remove(); });
    bg.querySelectorAll('[data-ext]').forEach(a => a.addEventListener('click', (e) => { if (bridge) { e.preventDefault(); bridge.openExternal(a.href); } }));
    document.body.appendChild(bg);
  }

  // ---------- Üst çubuk ----------
  function buildBar() {
    const bar = h(`<div class="ew-bar" role="toolbar" aria-label="${esc(S.def.title)}">
      <div class="ew-brand" title="${esc(S.def.title)}"><img src="${asset(S.module + '.svg')}" alt=""><div class="ew-titles"><span class="ew-app">${esc(S.def.title.replace('Ewreka ', '').toLocaleUpperCase('en-US'))}</span><span class="ew-doc"></span></div></div>
      <div class="ew-sep"></div>
      <button class="ew-btn" data-c="new" title="Yeni (${isMac ? '⌘' : 'Ctrl+'}N)">${svg('new')}<span class="ew-lbl ew-opt">Yeni</span></button>
      <button class="ew-btn" data-c="open" title="Aç (${isMac ? '⌘' : 'Ctrl+'}O)">${svg('open')}<span class="ew-lbl">Aç</span></button>
      <button class="ew-btn" data-c="save" title="Kaydet (${isMac ? '⌘' : 'Ctrl+'}S)">${svg('save')}<span class="ew-lbl">Kaydet</span></button>
      <button class="ew-btn" data-c="saveAs" title="Farklı kaydet / dışa aktar">${svg('saveAs')}<span class="ew-lbl ew-opt">Farklı kaydet</span>${formats().length > 1 ? svg('chevron').replace('<svg', '<svg style="width:12px;height:12px;flex-basis:12px;margin-left:-3px"') : ''}</button>
      ${S.opts.print === false ? '' : `<button class="ew-btn" data-c="print" title="Yazdır (${isMac ? '⌘' : 'Ctrl+'}P)">${svg('print')}<span class="ew-lbl ew-opt">Yazdır</span></button>`}
      <div class="ew-sep"></div>
      <div class="ew-actions"></div>
      <div class="ew-spacer"></div>
      ${bridge ? `<button class="ew-btn" data-c="home" title="Başlangıç ekranı">${svg('home')}</button>` : ''}
      <button class="ew-btn" data-c="about" title="Hakkında">${svg('info')}</button>
      <img class="ew-logo" src="${asset('logo-light.png')}" alt="ewreka digital" title="ewreka.net">
    </div>`);
    S.el.doc = bar.querySelector('.ew-doc');
    S.el.actions = bar.querySelector('.ew-actions');
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      const c = b.dataset.c;
      if (c === 'new') cmdNew(); else if (c === 'open') cmdOpen(); else if (c === 'save') cmdSave();
      else if (c === 'saveAs') cmdSaveAs(b); else if (c === 'print') cmdPrint(); else if (c === 'about') about();
      else if (c === 'home') bridge.openWindow('launcher');
    });
    bar.querySelector('.ew-logo').addEventListener('click', () => { const u = 'https://www.ewreka.net'; if (bridge) bridge.openExternal(u); else window.open(u, '_blank'); });
    for (const a of (S.opts.actions || [])) addAction(a);
    return bar;
  }
  function addAction(a) {
    if (a === '-') { S.el.actions.appendChild(h('<div class="ew-sep"></div>')); return; }
    const b = h(`<button class="ew-btn" title="${esc(a.title || a.label)}">${a.icon ? `<svg viewBox="0 0 24 24">${a.icon}</svg>` : ''}<span class="ew-lbl ${a.optional ? 'ew-opt' : ''}">${esc(a.label)}</span></button>`);
    if (a.id) b.dataset.action = a.id;
    b.onclick = (e) => a.onClick(e, b);
    S.el.actions.appendChild(b);
    return b;
  }

  // ---------- Klavye, sürükle-bırak, komutlar ----------
  function onKey(e) {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod || e.altKey) return;
    const k = e.key.toLowerCase();
    // macOS'ta yerel menü bu kısayolları zaten iletir
    if (bridge && isMac && ['n', 'o', 's', 'p'].includes(k)) return;
    if (k === 's') { e.preventDefault(); e.stopPropagation(); e.shiftKey ? cmdSaveAs(null) : cmdSave(); }
    else if (k === 'o' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); cmdOpen(); }
    else if (k === 'n' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); cmdNew(); }
    else if (k === 'p' && !e.shiftKey && S.opts.print !== false) { e.preventDefault(); e.stopPropagation(); cmdPrint(); }
  }
  function setupDrop() {
    const ov = h('<div class="ew-drop"><span>Açmak için bırakın</span></div>');
    document.body.appendChild(ov);
    let depth = 0;
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; depth++; ov.classList.add('ew-on'); });
    window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) ov.classList.remove('ew-on'); });
    window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener('drop', async (e) => {
      if (!hasFiles(e)) return;
      depth = 0; ov.classList.remove('ew-on');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      const ext = extOf(f.name);
      if (!ALL_EXTS[ext]) return; // modül kendi sürükle-bırakını (ör. resim) işlesin
      e.preventDefault(); e.stopPropagation();
      if (S.opts.onDropFile && ALL_EXTS[ext] === S.module && !(S.pristine && !S.dirty)) {
        const handled = await S.opts.onDropFile(f); if (handled) return;
      }
      let p = null;
      try { p = window.ewreka && window.ewreka.getPathForFile ? window.ewreka.getPathForFile(f) : (f.path || null); } catch (_) {}
      if (bridge && p && (ALL_EXTS[ext] !== S.module || !(S.pristine && !S.dirty))) { bridge.openWindow(null, p); return; }
      loadFile({ name: f.name, data: new Uint8Array(await f.arrayBuffer()), path: p });
    }, true);
  }
  async function onCommand(cmd) {
    switch (cmd) {
      case 'new': return cmdNew();
      case 'open': return cmdOpen();
      case 'save': return cmdSave();
      case 'saveAs': return cmdSaveAs(null);
      case 'print': return cmdPrint();
      case 'about': return about();
      case 'undo': if (S.opts.onUndo) S.opts.onUndo(); else document.execCommand('undo'); return;
      case 'redo': if (S.opts.onRedo) S.opts.onRedo(); else document.execCommand('redo'); return;
      case 'save-and-close': { const ok = await cmdSave(); if (ok && bridge) bridge.closeWindow(); return; }
    }
  }

  // ---------- Başlatma ----------
  async function init(opts) {
    S.opts = opts; S.module = opts.module; S.def = MODS[opts.module];
    document.documentElement.style.setProperty('--ew-module', S.def.color);
    if (!document.querySelector('link[data-ew-css]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = BASE + 'ewreka-shell.css'; l.dataset.ewCss = '1';
      document.head.appendChild(l);
    }
    let fav = document.querySelector('link[rel="icon"]');
    if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
    fav.href = asset(S.module + '.svg');
    const bar = buildBar();
    const mount = opts.mount || document.body;
    mount.insertBefore(bar, mount.firstChild);
    window.addEventListener('keydown', onKey, true);
    setupDrop();
    if (bridge) bridge.onCommand(onCommand);
    window.addEventListener('beforeunload', (e) => { if (!bridge && S.dirty) { e.preventDefault(); e.returnValue = ''; } });
    updateTitle();

    // Açılış dosyası
    let file = null;
    if (bridge) { try { file = await bridge.getLaunchFile(); } catch (_) {} }
    else {
      const q = new URLSearchParams(location.search).get('file');
      if (q) { try { const r = await fetch(q); file = { name: decodeURIComponent(q.split('/').pop()), data: new Uint8Array(await r.arrayBuffer()), path: null }; } catch (_) {} }
    }
    if (file && file.error) { toast('Dosya okunamadı: ' + file.error, 'error'); file = null; }
    if (file) await loadFile(file);
    else if (opts.onNew) { try { await opts.onNew(); } catch (err) { console.error(err); } setDocument(null, null); }
    if (opts.onReady) opts.onReady();
    return api;
  }

  const api = {
    init, setDirty, toast, busy, done, about, addAction, popMenu,
    get dirty() { return S.dirty; }, get path() { return S.path; }, get name() { return S.name; },
    get bridge() { return bridge; }, get isMac() { return isMac; },
    setName(n) { S.name = n; updateTitle(); },
    save: () => cmdSave(), saveAs: () => cmdSaveAs(null), open: () => cmdOpen(), newDoc: () => cmdNew(),
    asset, pickFile: (accept) => bridge ? bridge.openDialog({ filters: [{ name: 'Dosyalar', extensions: accept.split(',').map(x => x.replace('.', '').trim()) }] }) : pickFileBrowser(accept),
    download(data, name, mime) {
      if (bridge) return bridge.save({ saveAs: true, data: data instanceof Uint8Array ? data : new Uint8Array(data), defaultName: name, export: true, filters: [{ name: extOf(name).toUpperCase(), extensions: [extOf(name)] }] });
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: mime || 'application/octet-stream' })); a.download = name; a.click();
    },
  };
  window.EwrekaShell = api;
})();
