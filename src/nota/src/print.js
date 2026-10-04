/* Ewreka Nota — yazdırma ve PDF
 * SuperDoc sayfaları sanal (görünür pencere) olarak çizer. Yazdırmadan önce kaydırma alanını sayfa sayfa
 * dolaşıp her sayfanın DOM kopyasını alıyoruz; kopyalar #nota-print içine konur ve yazdırma CSS'i yalnızca
 * bu kapsayıcıyı gösterir (araç çubukları, kabuk, durum çubuğu basılmaz).
 */
const PX_PER_IN = 96;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function frame() { return new Promise((r) => requestAnimationFrame(() => r())); }

function pageEls() { return [...document.querySelectorAll('#nota-editor .superdoc-page[data-page-index]')]; }

async function waitFor(fn, timeout = 1500) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    const v = fn(); if (v) return v;
    await frame();
  }
  return fn();
}

/**
 * Tüm sayfaların kopyalarını toplar.
 * @param {HTMLElement} scroller kaydırılan kapsayıcı
 * @param {number} total toplam sayfa sayısı
 * @param {(i:number,n:number)=>void} [progress]
 */
export async function collectPages(scroller, total, progress) {
  const clones = new Map();
  const grab = () => {
    for (const p of pageEls()) {
      const i = +p.dataset.pageIndex;
      if (clones.has(i)) continue;
      // içi boş (henüz çizilmemiş) sayfa iskeletlerini alma
      if (!p.childElementCount) continue;
      clones.set(i, { node: p.cloneNode(true), w: parseFloat(p.style.width) || p.offsetWidth, h: parseFloat(p.style.height) || p.offsetHeight });
    }
  };
  const savedTop = scroller.scrollTop;
  grab();
  if (!total) total = Math.max(1, ...pageEls().map((p) => +p.dataset.pageIndex + 1));
  for (let i = 0; i < total; i++) {
    if (clones.has(i)) continue;
    progress && progress(i, total);
    // sayfa konumunu bul: çizilmiş komşudan tahmin et
    const est = estimateOffset(i);
    if (est != null) scroller.scrollTop = est;
    await waitFor(() => { grab(); return clones.has(i); }, 2000);
    if (!clones.has(i)) {
      // yedek: sayfa sayfa ilerle
      for (let k = 0; k < 6 && !clones.has(i); k++) { scroller.scrollTop += scroller.clientHeight * 0.8; await sleep(60); grab(); }
    }
  }
  scroller.scrollTop = savedTop;
  return [...clones.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
}

function estimateOffset(i) {
  const pages = pageEls();
  if (!pages.length) return null;
  const scroller = document.getElementById('nota-canvas');
  const sRect = scroller.getBoundingClientRect();
  let best = null;
  for (const p of pages) {
    const j = +p.dataset.pageIndex;
    const r = p.getBoundingClientRect();
    if (!best || Math.abs(j - i) < Math.abs(best.j - i)) best = { j, top: r.top - sRect.top + scroller.scrollTop, h: r.height };
  }
  const gap = 24 * (currentZoom() / 100);
  return Math.max(0, best.top + (i - best.j) * (best.h + gap) - 40);
}
function currentZoom() { try { return window.__nota.sd.getZoom() || 100; } catch (_) { return 100; } }

/** Kopyaları yazdırma kapsayıcısına koyar; sayfa boyutunu (inç) döndürür. */
export async function preparePrint(scroller, total, progress) {
  const pages = await collectPages(scroller, total, progress);
  let host = document.getElementById('nota-print');
  if (!host) { host = document.createElement('div'); host.id = 'nota-print'; document.body.appendChild(host); }
  host.innerHTML = '';
  let first = null;
  for (const { node, w, h } of pages) {
    const W = Math.round(w), H = Math.round(h); // sayfa kutusu %100 ölçekte (yakınlaştırma dış kapsayıcıda)
    if (!first) first = { W, H };
    node.style.transform = 'none';
    node.style.margin = '0';
    node.style.boxShadow = 'none';
    node.style.border = '0';
    node.style.width = W + 'px'; node.style.height = H + 'px';
    node.style.minWidth = W + 'px'; node.style.minHeight = H + 'px';
    const wrap = document.createElement('div');
    wrap.className = 'nota-print-page';
    wrap.style.width = W + 'px'; wrap.style.height = H + 'px';
    wrap.appendChild(node);
    host.appendChild(wrap);
  }
  // resimlerin yüklenmesini bekle
  await Promise.all([...host.querySelectorAll('img')].map((img) => (img.complete ? null : img.decode().catch(() => {}))));
  const size = first || { W: 794, H: 1123 };
  const css = document.getElementById('nota-print-css') || Object.assign(document.createElement('style'), { id: 'nota-print-css' });
  css.textContent = `@page { size: ${size.W / PX_PER_IN}in ${size.H / PX_PER_IN}in; margin: 0; }`;
  document.head.appendChild(css);
  return { widthIn: size.W / PX_PER_IN, heightIn: size.H / PX_PER_IN, count: pages.length };
}

export function cleanupPrint() {
  const host = document.getElementById('nota-print');
  if (host) host.innerHTML = '';
}
