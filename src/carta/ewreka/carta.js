/* Ewreka Carta — PDF görüntüleyici ve düzenleyici
 * Motor: Mozilla PDF.js (Apache-2.0) + pdf-lib (MIT). Copyright (C) 2026 Ewreka Digital — AGPL-3.0-or-later
 */
(function () {
  'use strict';

  // ---------- 1) PDF.js seçenekleri (viewer başlamadan önce) ----------
  document.addEventListener('webviewerloaded', () => {
    const O = window.PDFViewerApplicationOptions;
    const set = (k, v) => { try { O.set(k, v); } catch (_) {} };
    set('disablePreferences', true);
    set('defaultUrl', '');
    set('localeProperties', { lang: 'tr' });
    set('viewerCssTheme', 1);            // açık tema
    set('enableSignatureEditor', true);  // imza
    set('enableComment', true);          // yorum
    set('enableSplitMerge', true);       // sayfa düzenleme (küçük resimlerde)
    set('enableMerge', true);
    set('enableHighlightFloatingButton', true);
    set('enableUpdatedAddImage', true);
    set('enableAltText', false);
    set('enableGuessAltText', false);
    set('enableAltTextModelDownload', false); // ağ isteği yapmasın
    set('enableNewAltTextWhenAddingImage', false);
    set('enableNewBadge', false);
    set('enableWebGPU', false);
    set('enablePermissions', false);
    set('historyUpdateUrl', false);
    set('sidebarViewOnLoad', 0);
    set('externalLinkTarget', 2);        // bağlantılar yeni pencerede (tarayıcıda açılır)
  }, { once: true });

  const $ = (s, r) => (r || document).querySelector(s);
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const extOf = (n) => { const m = /\.([^.]+)$/.exec(n || ''); return m ? m[1].toLowerCase() : ''; };

  let App = null;           // PDFViewerApplication
  let Shell = null;         // EwrekaShell
  let hasDoc = false;
  let opsDirty = false;     // pdf-lib işlemleriyle yapılan değişiklik
  let capture = null;       // indirme yakalama
  let suppress = 0;         // kendi aç/kapa işlemlerimizde PDF.js otomatik kaydını yut

  // ---------- 2) PDF.js çıktısını yakala ----------
  function hookDownloads() {
    const dm = App.downloadManager;
    if (!dm) return;
    const orig = dm.download.bind(dm);
    dm.download = (data, url, filename) => {
      if (capture) { const c = capture; capture = null; c(data); return; }
      if (suppress) return;
      // PDF.js'in kendi "kaydet" yolu tetiklendiyse Ewreka kaydetmesine yönlendir
      if (Shell) Shell.save(); else orig(data, url, filename);
    };
    if (dm.openOrDownloadData) dm.openOrDownloadData = () => false;
  }

  async function currentBytes() {
    if (!App.pdfDocument) throw new Error('Açık belge yok');
    const p = new Promise((resolve) => { capture = resolve; });
    const t = setTimeout(() => { if (capture) { capture = null; } }, 60000);
    await App.downloadOrSave();
    clearTimeout(t);
    const data = await Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Kaydetme zaman aşımı')), 100))]).catch(async () => {
      // bazı durumlarda doğrudan veri al
      capture = null;
      return App.pdfDocument.annotationStorage.size > 0 ? App.pdfDocument.saveDocument() : App.pdfDocument.getData();
    });
    return data instanceof Uint8Array ? data : new Uint8Array(data);
  }

  // Belgeyi (değiştirilmiş baytlarla) yeniden yükle; sayfa konumunu koru
  async function reopen(bytes, page, filename) {
    const keepPage = page || (App.pdfViewer && App.pdfViewer.currentPageNumber) || 1;
    const scale = App.pdfViewer && App.pdfViewer.currentScaleValue;
    suppress++;
    try {
      await App.open({ data: bytes.slice(), filename: filename || App._docFilename || 'belge.pdf' });
    } finally { suppress--; }
    hasDoc = true; showWelcome(false);
    await new Promise((r) => { const on = () => { App.eventBus.off('pagesinit', on); r(); }; App.eventBus.on('pagesinit', on); setTimeout(r, 3000); });
    try {
      if (scale) App.pdfViewer.currentScaleValue = scale;
      App.pdfViewer.currentPageNumber = Math.min(keepPage, App.pagesCount || keepPage);
    } catch (_) {}
  }

  // ---------- 3) Hoş geldin ekranı ----------
  let welcome = null;
  const IC = {
    open: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"/><path d="M3 7v11a2 2 0 0 0 2 2h13.5a2 2 0 0 0 1.9-1.4L22 12H7.2a2 2 0 0 0-1.9 1.4L3 20"/>',
    merge: '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 7v10M8 12h8"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    blank: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    pages: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/>',
    tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    sign: '<path d="M3 17c3-3 4-9 6-9s-1 9 2 9 3-5 5-5 1 4 5 4"/><path d="M3 21h18"/>',
  };
  const isvg = (k) => `<svg viewBox="0 0 24 24">${IC[k]}</svg>`;

  function buildWelcome() {
    welcome = h(`<div id="cartaWelcome" class="carta-welcome">
      <div class="cw-inner">
        <div class="cw-hero">
          <img src="../../../shared/assets/carta.svg" alt="">
          <div><h1>Ewreka Carta</h1><p>PDF görüntüleyin, not alın, imzalayın, sayfaları düzenleyin.</p></div>
        </div>
        <button class="cw-drop" data-a="open">${isvg('open')}<strong>PDF dosyası açın</strong><span>ya da dosyayı bu pencereye sürükleyip bırakın</span></button>
        <div class="cw-grid">
          <button data-a="merge">${isvg('merge')}<strong>PDF birleştir</strong><span>Birden çok PDF'i tek dosyada toplayın</span></button>
          <button data-a="images">${isvg('image')}<strong>Görüntüden PDF</strong><span>JPG/PNG görüntülerini PDF'e dönüştürün</span></button>
          <button data-a="blank">${isvg('blank')}<strong>Boş PDF</strong><span>Boş bir A4 sayfayla başlayın</span></button>
        </div>
      </div></div>`);
    welcome.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'open') Shell.open();
      else if (a === 'merge') toolMerge();
      else if (a === 'images') toolImages(false);
      else if (a === 'blank') toolBlank();
    });
    $('#mainContainer').appendChild(welcome);
  }
  function showWelcome(on) {
    if (!welcome) buildWelcome();
    welcome.hidden = !on;
    document.body.classList.toggle('carta-empty', !!on);
  }

  // ---------- 4) Dosya seçme yardımcıları ----------
  function pickMany(exts, multi, title) {
    const br = Shell.bridge;
    if (br) {
      return br.openDialog({ multi, title, filters: [{ name: exts.map(e => e.toUpperCase()).join(', '), extensions: exts }] })
        .then(r => r ? (Array.isArray(r) ? r : [r]) : []);
    }
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.multiple = !!multi; inp.accept = exts.map(e => '.' + e).join(',');
      inp.style.display = 'none';
      inp.onchange = async () => {
        const out = [];
        for (const f of inp.files) out.push({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) });
        inp.remove(); resolve(out);
      };
      document.body.appendChild(inp); inp.click();
    });
  }

  const PL = () => window.PDFLib;
  const A4 = [595.28, 841.89];

  async function openGenerated(bytes, name) {
    // yeni oluşturulan belgeyi bu pencerede aç (kaydedilmemiş olarak)
    await reopen(bytes, 1, name);
    Shell.setName(name);
    opsDirty = true; Shell.setDirty(true);
  }

  async function loadPdfLib(bytes) {
    try { return await PL().PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false }); }
    catch (e) {
      if (/encrypt/i.test(String(e && e.message))) throw new Error('Bu PDF parola korumalı/şifreli; sayfa işlemleri yapılamıyor.');
      throw e;
    }
  }

  async function toolMerge() {
    const files = await pickMany(['pdf'], true, 'Birleştirilecek PDF dosyalarını seçin');
    if (!files.length) return;
    Shell.busy('PDF dosyaları birleştiriliyor…');
    try {
      const out = await PL().PDFDocument.create();
      const sources = [];
      if (hasDoc) sources.push({ name: Shell.name || 'belge.pdf', data: await currentBytes() });
      sources.push(...files);
      for (const f of sources) {
        const src = await loadPdfLib(f.data);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach(p => out.addPage(p));
      }
      stamp(out);
      const bytes = await out.save();
      if (hasDoc) { await reopen(bytes); markOps(); }
      else await openGenerated(bytes, 'Birleştirilmiş.pdf');
      Shell.toast(`${sources.length} dosya birleştirildi (${out.getPageCount()} sayfa).`, 'ok');
    } catch (e) { console.error(e); Shell.toast('Birleştirilemedi: ' + e.message, 'error'); }
    finally { Shell.done(); }
  }

  async function imagePage(doc, f) {
    const ext = extOf(f.name);
    let img;
    if (ext === 'png') img = await doc.embedPng(f.data);
    else if (ext === 'jpg' || ext === 'jpeg') img = await doc.embedJpg(f.data);
    else {
      // diğer biçimleri (webp/gif/bmp) tuval üzerinden PNG'ye çevir
      const bmp = await createImageBitmap(new Blob([f.data]));
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      c.getContext('2d').drawImage(bmp, 0, 0);
      const png = new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/png'))).arrayBuffer());
      img = await doc.embedPng(png);
    }
    const landscape = img.width > img.height;
    const [W, H] = landscape ? [A4[1], A4[0]] : A4;
    const m = 28;
    const s = Math.min((W - 2 * m) / img.width, (H - 2 * m) / img.height, 1.5);
    const w = img.width * s, hh = img.height * s;
    const page = doc.addPage([W, H]);
    page.drawImage(img, { x: (W - w) / 2, y: (H - hh) / 2, width: w, height: hh });
    return page;
  }

  async function toolImages(insertIntoCurrent) {
    const files = await pickMany(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'], true, 'Görüntüleri seçin');
    if (!files.length) return;
    Shell.busy('Görüntüler PDF\'e dönüştürülüyor…');
    try {
      if (insertIntoCurrent && hasDoc) {
        const cur = App.pdfViewer.currentPageNumber;
        const doc = await loadPdfLib(await currentBytes());
        const tmp = await PL().PDFDocument.create();
        for (const f of files) await imagePage(tmp, f);
        const pages = await doc.copyPages(tmp, tmp.getPageIndices());
        pages.forEach((p, i) => doc.insertPage(cur + i, p));
        await reopen(await doc.save(), cur + 1); markOps();
      } else {
        const doc = await PL().PDFDocument.create();
        for (const f of files) await imagePage(doc, f);
        stamp(doc);
        await openGenerated(await doc.save(), files.length === 1 ? files[0].name.replace(/\.[^.]+$/, '') + '.pdf' : 'Görüntüler.pdf');
      }
      Shell.toast(`${files.length} görüntü eklendi.`, 'ok');
    } catch (e) { console.error(e); Shell.toast('Görüntüler eklenemedi: ' + e.message, 'error'); }
    finally { Shell.done(); }
  }

  async function toolBlank() {
    const doc = await PL().PDFDocument.create();
    doc.addPage(A4); stamp(doc);
    await openGenerated(await doc.save(), 'Adsız.pdf');
  }

  function stamp(doc) {
    try { doc.setProducer('Ewreka Carta'); doc.setCreator('Ewreka Carta'); doc.setModificationDate(new Date()); } catch (_) {}
  }
  function markOps() { opsDirty = true; Shell.setDirty(true); }

  // ---------- 5) Sayfa işlemleri ----------
  async function pageOp(label, fn) {
    if (!hasDoc) { Shell.toast('Önce bir PDF açın.', 'error'); return; }
    Shell.busy(label + '…');
    try {
      const cur = App.pdfViewer.currentPageNumber;
      const doc = await loadPdfLib(await currentBytes());
      const res = await fn(doc, cur - 1);
      if (res === false) return;
      stamp(doc);
      await reopen(await doc.save(), (res && res.page) || cur);
      markOps();
      if (res && res.msg) Shell.toast(res.msg, 'ok');
    } catch (e) { console.error(e); Shell.toast(label + ' başarısız: ' + e.message, 'error'); }
    finally { Shell.done(); }
  }

  const rotate = (deg) => pageOp('Sayfa döndürülüyor', (doc, i) => {
    const p = doc.getPage(i); p.setRotation(PL().degrees(((p.getRotation().angle + deg) % 360 + 360) % 360));
    return { page: i + 1 };
  });
  const rotateAll = (deg) => pageOp('Sayfalar döndürülüyor', (doc, i) => {
    doc.getPages().forEach(p => p.setRotation(PL().degrees(((p.getRotation().angle + deg) % 360 + 360) % 360)));
    return { page: i + 1, msg: 'Tüm sayfalar döndürüldü.' };
  });
  const deletePage = () => pageOp('Sayfa siliniyor', (doc, i) => {
    if (doc.getPageCount() <= 1) { Shell.toast('Belgedeki son sayfa silinemez.', 'error'); return false; }
    doc.removePage(i); return { page: Math.max(1, i), msg: `${i + 1}. sayfa silindi.` };
  });
  const blankAfter = () => pageOp('Boş sayfa ekleniyor', (doc, i) => {
    const ref = doc.getPage(i).getSize();
    doc.insertPage(i + 1, [ref.width, ref.height]); return { page: i + 2 };
  });
  const duplicatePage = () => pageOp('Sayfa çoğaltılıyor', async (doc, i) => {
    const [p] = await doc.copyPages(doc, [i]); doc.insertPage(i + 1, p); return { page: i + 2 };
  });
  async function insertPdfAfter() {
    const files = await pickMany(['pdf'], true, 'Eklenecek PDF dosyalarını seçin');
    if (!files.length) return;
    pageOp('PDF ekleniyor', async (doc, i) => {
      let at = i + 1;
      for (const f of files) {
        const src = await loadPdfLib(f.data);
        const pages = await doc.copyPages(src, src.getPageIndices());
        pages.forEach(p => doc.insertPage(at++, p));
      }
      return { page: i + 2, msg: `${at - i - 1} sayfa eklendi.` };
    });
  }
  const movePage = (dir) => pageOp('Sayfa taşınıyor', async (doc, i) => {
    const j = i + dir;
    if (j < 0 || j >= doc.getPageCount()) return false;
    const [p] = await doc.copyPages(doc, [i]);
    doc.removePage(i); doc.insertPage(j, p);
    return { page: j + 1 };
  });

  async function addPageNumbers() {
    const r = await formDialog('Sayfa numarası ekle', [
      { id: 'pos', label: 'Konum', type: 'select', options: [['bc', 'Alt orta'], ['br', 'Alt sağ'], ['bl', 'Alt sol'], ['tc', 'Üst orta'], ['tr', 'Üst sağ']] },
      { id: 'fmt', label: 'Biçim', type: 'select', options: [['n', '1, 2, 3…'], ['nt', '1 / 10'], ['sn', 'Sayfa 1']] },
      { id: 'start', label: 'Başlangıç numarası', type: 'number', value: 1 },
      { id: 'size', label: 'Yazı boyutu', type: 'number', value: 10 },
    ]);
    if (!r) return;
    pageOp('Sayfa numaraları ekleniyor', async (doc, i) => {
      const font = await embedTurkishFont(doc);
      const pages = doc.getPages(); const total = pages.length;
      const size = Math.max(6, Math.min(36, +r.size || 10));
      pages.forEach((p, k) => {
        const n = (+r.start || 1) + k;
        const text = r.fmt === 'nt' ? `${n} / ${total + (+r.start || 1) - 1}` : r.fmt === 'sn' ? `Sayfa ${n}` : String(n);
        const { width, height } = p.getSize();
        const tw = font.widthOfTextAtSize(text, size);
        const m = 28;
        const x = r.pos.endsWith('c') ? (width - tw) / 2 : r.pos.endsWith('r') ? width - m - tw : m;
        const y = r.pos.startsWith('b') ? m - size / 3 + 4 : height - m - size + 4;
        p.drawText(text, { x, y, size, font, color: PL().rgb(0.2, 0.2, 0.22) });
      });
      return { page: i + 1, msg: 'Sayfa numaraları eklendi.' };
    });
  }

  let fontBytes = null;
  async function embedTurkishFont(doc) {
    if (!window.fontkit) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = '../lib/fontkit.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    doc.registerFontkit(window.fontkit);
    if (!fontBytes) fontBytes = new Uint8Array(await (await fetch('../lib/DejaVuSans-Bold.ttf')).arrayBuffer());
    return doc.embedFont(fontBytes, { subset: true });
  }

  async function addWatermark() {
    const r = await formDialog('Filigran ekle', [
      { id: 'text', label: 'Filigran metni', type: 'text', value: 'GİZLİ' },
      { id: 'opacity', label: 'Saydamlık (%)', type: 'number', value: 18 },
      { id: 'color', label: 'Renk', type: 'select', options: [['gray', 'Gri'], ['red', 'Kırmızı'], ['blue', 'Mavi'], ['yellow', 'Ewreka sarısı']] },
    ]);
    if (!r || !r.text.trim()) return;
    const colors = { gray: [0.45, 0.45, 0.48], red: [0.85, 0.15, 0.2], blue: [0.2, 0.35, 0.8], yellow: [1, 0.76, 0] };
    pageOp('Filigran ekleniyor', async (doc, i) => {
      const font = await embedTurkishFont(doc);
      const c = colors[r.color] || colors.gray;
      for (const p of doc.getPages()) {
        const { width, height } = p.getSize();
        const diag = Math.sqrt(width * width + height * height);
        let size = 80; const tw0 = font.widthOfTextAtSize(r.text, size);
        size = Math.min(160, size * (diag * 0.7) / tw0);
        const tw = font.widthOfTextAtSize(r.text, size);
        const ang = Math.atan2(height, width);
        const x = width / 2 - (tw / 2) * Math.cos(ang) + (size / 3) * Math.sin(ang);
        const y = height / 2 - (tw / 2) * Math.sin(ang) - (size / 3) * Math.cos(ang);
        p.drawText(r.text, { x, y, size, font, color: PL().rgb(c[0], c[1], c[2]), opacity: Math.max(0.03, Math.min(1, (+r.opacity || 18) / 100)), rotate: PL().radians(ang) });
      }
      return { page: i + 1, msg: 'Filigran eklendi.' };
    });
  }

  async function extractRange() {
    if (!hasDoc) return;
    const n = App.pagesCount;
    const cur = App.pdfViewer.currentPageNumber;
    const r = await formDialog('Sayfaları ayrı PDF olarak kaydet', [
      { id: 'range', label: `Sayfa aralığı (1–${n}, ör. 1-3, 5, 8-10)`, type: 'text', value: String(cur) },
    ]);
    if (!r) return;
    const idx = parseRange(r.range, n);
    if (!idx.length) { Shell.toast('Geçerli bir sayfa aralığı girin.', 'error'); return; }
    Shell.busy('Sayfalar ayıklanıyor…');
    try {
      const src = await loadPdfLib(await currentBytes());
      const out = await PL().PDFDocument.create();
      (await out.copyPages(src, idx)).forEach(p => out.addPage(p));
      stamp(out);
      const base = (Shell.name || 'belge').replace(/\.pdf$/i, '');
      Shell.done();
      await Shell.download(await out.save(), `${base} (sayfa ${r.range.replace(/\s+/g, '')}).pdf`, 'application/pdf');
    } catch (e) { Shell.done(); Shell.toast('Ayıklanamadı: ' + e.message, 'error'); }
  }
  async function splitAll() {
    if (!hasDoc) return;
    const r = await formDialog('PDF\'i böl', [{ id: 'every', label: 'Her kaç sayfada bir yeni dosya?', type: 'number', value: 1 }]);
    if (!r) return;
    const every = Math.max(1, Math.floor(+r.every || 1));
    Shell.busy('PDF bölünüyor…');
    try {
      const src = await loadPdfLib(await currentBytes());
      const n = src.getPageCount();
      const base = (Shell.name || 'belge').replace(/\.pdf$/i, '');
      const parts = [];
      for (let s = 0; s < n; s += every) {
        const out = await PL().PDFDocument.create();
        const ids = []; for (let k = s; k < Math.min(n, s + every); k++) ids.push(k);
        (await out.copyPages(src, ids)).forEach(p => out.addPage(p));
        stamp(out);
        parts.push({ name: `${base}-${String(parts.length + 1).padStart(2, '0')}.pdf`, data: await out.save() });
      }
      Shell.done();
      if (parts.length > 1) {
        const zip = makeZip(parts);
        await Shell.download(zip, `${base} (bölünmüş).zip`, 'application/zip');
      } else await Shell.download(parts[0].data, parts[0].name, 'application/pdf');
    } catch (e) { Shell.done(); Shell.toast('Bölünemedi: ' + e.message, 'error'); }
  }
  function parseRange(str, n) {
    const out = [];
    for (const part of String(str).split(/[,;]/)) {
      const m = /^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/.exec(part);
      if (!m) continue;
      let a = +m[1], b = m[2] ? +m[2] : a;
      if (a > b) [a, b] = [b, a];
      for (let k = Math.max(1, a); k <= Math.min(n, b); k++) out.push(k - 1);
    }
    return out;
  }
  // Basit ZIP (sıkıştırmasız) — bölünmüş dosyaları tek indirmede vermek için
  function makeZip(files) {
    const enc = new TextEncoder();
    const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc32 = (d) => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = crcTable[(c ^ d[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const chunks = [], central = []; let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = f.data, crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
      chunks.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const csize = central.reduce((s, c) => s + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    const all = [...chunks, ...central, new Uint8Array(end.buffer)];
    const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0)); let p = 0; for (const c of all) { out.set(c, p); p += c.length; }
    return out;
  }

  // Küçük form penceresi
  function formDialog(title, fields) {
    return new Promise((resolve) => {
      const bg = h(`<div class="ew-modal-bg"><form class="ew-modal carta-form"><header><strong style="font-size:16px">${title}</strong></header><div class="ew-body"></div><footer><button type="button" class="ew-btn" data-x>İptal</button><button type="submit" class="ew-btn ew-primary">Uygula</button></footer></form></div>`);
      const body = bg.querySelector('.ew-body');
      for (const f of fields) {
        let input;
        if (f.type === 'select') input = `<select name="${f.id}">${f.options.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`;
        else input = `<input name="${f.id}" type="${f.type}" value="${f.value != null ? String(f.value).replace(/"/g, '&quot;') : ''}" ${f.type === 'number' ? 'step="1"' : ''}>`;
        body.appendChild(h(`<label class="carta-field"><span>${f.label}</span>${input}</label>`));
      }
      const close = (v) => { bg.remove(); resolve(v); };
      bg.querySelector('[data-x]').onclick = () => close(null);
      bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(null); });
      bg.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(null); });
      bg.querySelector('form').onsubmit = (e) => { e.preventDefault(); const o = {}; for (const f of fields) o[f.id] = bg.querySelector(`[name="${f.id}"]`).value; close(o); };
      document.body.appendChild(bg);
      const first = bg.querySelector('input,select'); if (first) { first.focus(); if (first.select) first.select(); }
    });
  }

  function pagesMenu(e, btn) {
    Shell.popMenu(btn, [
      { label: 'Sayfa küçük resimlerini göster/gizle', onClick: () => $('#viewsManagerToggleButton') && $('#viewsManagerToggleButton').click() },
      '-',
      { label: 'Geçerli sayfayı sağa döndür', hint: '↻ 90°', onClick: () => rotate(90) },
      { label: 'Geçerli sayfayı sola döndür', hint: '↺ 90°', onClick: () => rotate(-90) },
      { label: 'Tüm sayfaları sağa döndür', onClick: () => rotateAll(90) },
      '-',
      { label: 'Geçerli sayfayı yukarı taşı', onClick: () => movePage(-1) },
      { label: 'Geçerli sayfayı aşağı taşı', onClick: () => movePage(1) },
      { label: 'Geçerli sayfayı çoğalt', onClick: duplicatePage },
      { label: 'Sonrasına boş sayfa ekle', onClick: blankAfter },
      { label: 'Geçerli sayfayı sil', onClick: deletePage },
    ]);
  }
  function toolsMenu(e, btn) {
    Shell.popMenu(btn, [
      { label: 'PDF birleştir (sona ekle)…', onClick: toolMerge },
      { label: 'Geçerli sayfadan sonra PDF ekle…', onClick: insertPdfAfter },
      { label: 'Görüntü ekle (yeni sayfa olarak)…', onClick: () => toolImages(true) },
      '-',
      { label: 'Sayfaları ayrı PDF olarak kaydet…', onClick: extractRange },
      { label: 'PDF\'i böl…', onClick: splitAll },
      '-',
      { label: 'Sayfa numarası ekle…', onClick: addPageNumbers },
      { label: 'Filigran ekle…', onClick: addWatermark },
      '-',
      { label: 'Belge özellikleri', onClick: () => App.pdfDocumentProperties && App.pdfDocumentProperties.open() },
      { label: 'Sunum modu', onClick: () => App.requestPresentationMode && App.requestPresentationMode() },
    ]);
  }

  // ---------- 6) Başlat ----------
  async function start() {
    await new Promise((r) => { const t = setInterval(() => { if (window.PDFViewerApplication) { clearInterval(t); r(); } }, 20); });
    App = window.PDFViewerApplication;
    await App.initializedPromise;
    hookDownloads();
    App.eventBus.on('documentloaded', () => { hasDoc = true; showWelcome(false); });

    // Değişiklik takibi
    setInterval(() => {
      if (!Shell || !hasDoc) return;
      let changed = opsDirty;
      try { changed = changed || App._hasChanges(); } catch (_) {}
      if (changed && !Shell.dirty) Shell.setDirty(true);
    }, 600);

    Shell = await window.EwrekaShell.init({
      module: 'carta',
      saveFormats: [{ id: 'pdf', label: 'PDF Belgesi', ext: 'pdf', mime: 'application/pdf' }],
      onNew: async () => {
        if (App.pdfLoadingTask) { suppress++; try { await App.close(); } finally { suppress--; } }
        hasDoc = false; opsDirty = false; showWelcome(true);
      },
      onOpen: async (file) => {
        if (extOf(file.name) !== 'pdf') throw new Error('Yalnızca PDF dosyaları açılabilir.');
        suppress++;
        try { await App.open({ data: file.data.slice(), filename: file.name }); }
        catch (e) { showWelcome(true); hasDoc = false; throw new Error('Geçerli bir PDF dosyası değil ya da dosya bozuk.'); }
        finally { suppress--; }
        hasDoc = true; opsDirty = false; showWelcome(false);
      },
      onSave: async () => {
        if (!hasDoc) { Shell.toast('Kaydedilecek bir PDF yok. Önce bir dosya açın.', 'error'); return null; }
        const bytes = await currentBytes();
        // Kaydedilen hali yeniden yükle: düzenleme durumu temizlenir, notlar PDF'in parçası olur
        setTimeout(async () => { try { await reopen(bytes); opsDirty = false; } catch (_) {} }, 0);
        return bytes;
      },
      onPrint: () => { if (!hasDoc) { Shell.toast('Yazdırılacak bir PDF yok.', 'error'); return; } App.triggerPrinting(); },
      onUndo: () => App.eventBus.dispatch('editingaction', { source: null, name: 'undo' }),
      onRedo: () => App.eventBus.dispatch('editingaction', { source: null, name: 'redo' }),
      actions: [
        { id: 'pages', label: 'Sayfalar', title: 'Sayfa işlemleri: döndür, taşı, sil, ekle', icon: IC.pages, onClick: pagesMenu },
        { id: 'tools', label: 'Araçlar', title: 'Birleştir, böl, sayfa numarası, filigran', icon: IC.tools, onClick: toolsMenu },
        { id: 'sign', label: 'İmzala', title: 'İmza ekle', icon: IC.sign, optional: true, onClick: () => { if (!hasDoc) { Shell.toast('Önce bir PDF açın.', 'error'); return; } const b = $('#editorSignatureButton'); if (b) b.click(); } },
      ],
    });
    if (!hasDoc) showWelcome(true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
