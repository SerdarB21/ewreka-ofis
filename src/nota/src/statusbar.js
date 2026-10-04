/* Ewreka Nota — durum çubuğu: sayfa bilgisi, sözcük sayısı, yakınlaştırma */
const WORD_RE = /[\p{L}\p{N}]+(?:[’'\-.][\p{L}\p{N}]+)*/gu;

function countWords(s) { if (!s) return 0; const m = s.match(WORD_RE); return m ? m.length : 0; }
const fmt = new Intl.NumberFormat('tr-TR');

export function createStatusBar(root, { onZoom, onFit, getEditor, canvas }) {
  root.innerHTML = `
    <div class="ns-left">
      <span class="ns-item" data-k="page">Sayfa 1 / 1</span>
      <span class="ns-sep"></span>
      <span class="ns-item" data-k="words">Sözcük: 0</span>
      <span class="ns-sep"></span>
      <span class="ns-item ns-dim" data-k="lang" title="Belge dili">Türkçe (Türkiye)</span>
    </div>
    <div class="ns-right">
      <button class="ns-btn" data-k="fit" title="Sayfa genişliğine sığdır">Sığdır</button>
      <span class="ns-sep"></span>
      <button class="ns-btn ns-ico" data-k="out" title="Uzaklaştır (Ctrl+−)" aria-label="Uzaklaştır">−</button>
      <input class="ns-range" data-k="range" type="range" min="25" max="300" step="5" value="100" aria-label="Yakınlaştırma">
      <button class="ns-btn ns-ico" data-k="in" title="Yakınlaştır (Ctrl++)" aria-label="Yakınlaştır">+</button>
      <button class="ns-btn ns-zoom" data-k="pct" title="Yakınlaştırma düzeyi (%100'e dönmek için tıklayın)">%100</button>
    </div>`;
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  const st = { zoom: 100, total: 1, current: 1, timer: 0 };

  q('out').onclick = () => onZoom(st.zoom - 10);
  q('in').onclick = () => onZoom(st.zoom + 10);
  q('pct').onclick = () => onZoom(100);
  q('fit').onclick = () => onFit();
  q('range').oninput = (e) => onZoom(+e.target.value);

  function setZoom(z) {
    st.zoom = Math.round(z);
    q('pct').textContent = '%' + st.zoom;
    q('range').value = String(Math.min(300, Math.max(25, st.zoom)));
  }
  function renderPage() { q('page').textContent = `Sayfa ${st.current} / ${st.total}`; }
  function setTotalPages(n) { st.total = Math.max(1, n || 1); if (st.current > st.total) st.current = st.total; renderPage(); }

  function updateCurrentPage() {
    const pages = canvas.querySelectorAll('.superdoc-page[data-page-index]');
    if (!pages.length) return;
    const cr = canvas.getBoundingClientRect();
    const probe = cr.top + Math.min(cr.height * 0.35, 260);
    let best = null, bestD = Infinity;
    for (const p of pages) {
      const r = p.getBoundingClientRect();
      if (r.bottom < cr.top || r.top > cr.bottom) continue;
      const d = r.top <= probe && r.bottom >= probe ? 0 : Math.min(Math.abs(r.top - probe), Math.abs(r.bottom - probe));
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best) { st.current = (+best.dataset.pageIndex) + 1; renderPage(); }
  }
  let raf = 0;
  canvas.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; updateCurrentPage(); }); }, { passive: true });

  function countNow() {
    st.timer = 0;
    const ed = getEditor();
    if (!ed || !ed.state) return;
    try {
      const { doc, selection } = ed.state;
      const total = countWords(doc.textBetween(0, doc.content.size, ' ', ' '));
      let label = `Sözcük: ${fmt.format(total)}`;
      if (selection && !selection.empty) {
        const sel = countWords(doc.textBetween(selection.from, selection.to, ' ', ' '));
        if (sel) label = `Sözcük: ${fmt.format(sel)} / ${fmt.format(total)}`;
      }
      q('words').textContent = label;
    } catch (_) { /* sayım isteğe bağlı */ }
  }
  function scheduleCount() { if (!st.timer) st.timer = setTimeout(countNow, 250); }
  function refreshAll() { scheduleCount(); setTimeout(updateCurrentPage, 300); }

  return { setZoom, setTotalPages, scheduleCount, refreshAll, updateCurrentPage };
}
