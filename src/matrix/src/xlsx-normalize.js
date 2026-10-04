// ExcelJS'in beklediği paket düzenine uymayan .xlsx dosyalarını (openpyxl, LibreOffice, Google E-Tablolar vb.)
// yüklemeden önce düzeltir: not (comments) ve VML parçalarını ExcelJS'in tanıdığı adlara taşır.
import { unzipSync, zipSync } from 'fflate';

const dec = new TextDecoder();
const enc = new TextEncoder();
const RT_COMMENTS = 'relationships/comments';
const RT_VML = 'relationships/vmlDrawing';

function resolveTarget(baseDir, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = (baseDir + '/' + target).split('/');
  const out = [];
  for (const p of parts) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); }
  return out.join('/');
}

export function normalizeXlsx(bytes, { dropComments = false } = {}) {
  let files;
  try { files = unzipSync(bytes); } catch (_) { return bytes; }
  let changed = false;
  const renames = {}; // eski yol -> yeni yol
  let nComments = 0, nVml = 0;
  const existing = new Set(Object.keys(files));
  const nextName = (kind) => {
    for (;;) {
      if (kind === 'c') { nComments++; const n = `xl/comments${nComments}.xml`; if (!existing.has(n)) { existing.add(n); return n; } }
      else { nVml++; const n = `xl/drawings/vmlDrawing${nVml}.vml`; if (!existing.has(n)) { existing.add(n); return n; } }
    }
  };

  for (const relPath of Object.keys(files)) {
    const m = /^xl\/worksheets\/_rels\/(sheet[^/]*\.xml)\.rels$/.exec(relPath);
    if (!m) continue;
    let xml = dec.decode(files[relPath]);
    const orig = xml;
    xml = xml.replace(/<Relationship\b[^>]*\/>/g, (tag) => {
      const type = (/Type="([^"]+)"/.exec(tag) || [])[1] || '';
      const target = (/Target="([^"]+)"/.exec(tag) || [])[1] || '';
      const isC = type.endsWith(RT_COMMENTS), isV = type.endsWith(RT_VML);
      if (!isC && !isV) return tag;
      if (dropComments) return '';
      const abs = resolveTarget('xl/worksheets', target);
      const ok = isC ? /^xl\/comments\d+\.xml$/.test(abs) : /^xl\/drawings\/vmlDrawing\d+\.vml$/.test(abs);
      if (ok || !files[abs]) return tag;
      const neu = renames[abs] || (renames[abs] = nextName(isC ? 'c' : 'v'));
      const rel = isC ? '../' + neu.slice(3) : '../drawings/' + neu.split('/').pop();
      return tag.replace(/Target="[^"]+"/, `Target="${rel}"`);
    });
    if (xml !== orig) { files[relPath] = enc.encode(xml); changed = true; }
  }
  for (const [from, to] of Object.entries(renames)) { files[to] = files[from]; delete files[from]; changed = true; }

  // ExcelJS not metninde yalnızca <r> parçalarını okur; düz <text><t>..</t></text> biçimini <r> içine sar
  for (const path of Object.keys(files)) {
    if (!/^xl\/comments\d+\.xml$/.test(path)) continue;
    const xml = dec.decode(files[path]);
    const fixed = xml.replace(/<text>(\s*)<t(\s[^>]*)?>([\s\S]*?)<\/t>(\s*)<\/text>/g, (m, a, attrs, body) => `<text><r><t xml:space="preserve">${body}</t></r></text>`);
    if (fixed !== xml) { files[path] = enc.encode(fixed); changed = true; }
  }

  if (changed && files['[Content_Types].xml']) {
    let ct = dec.decode(files['[Content_Types].xml']);
    for (const [from, to] of Object.entries(renames)) ct = ct.split(`PartName="/${from}"`).join(`PartName="/${to}"`);
    if (!/Extension="vml"/.test(ct)) ct = ct.replace('<Types ', '<Types ').replace(/(<Types[^>]*>)/, '$1<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>');
    files['[Content_Types].xml'] = enc.encode(ct);
  }
  if (!changed) return bytes;
  return zipSync(files, { level: 0 });
}
