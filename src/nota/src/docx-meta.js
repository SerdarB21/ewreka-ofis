/* Ewreka Nota — .docx paket meta verisi düzeltmeleri (JSZip)
 *  - Yeni belge: her seferinde benzersiz belge kimliği (w14/w15 docId), oluşturma tarihi = şimdi
 *  - Kaydederken: motorun eklediği "Superdoc*" özel özelliklerini kaldır, değiştirme tarihini güncelle,
 *    uygulama adını "Ewreka Nota" yap.
 */
import JSZip from 'jszip';

const isoNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
const guid = () => { const h = hex(16); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };

/** Şablondan yeni bir boş belge üretir. */
export async function freshBlankDocx(templateBytes) {
  const zip = await JSZip.loadAsync(templateBytes);
  const now = isoNow();
  const settings = zip.file('word/settings.xml');
  if (settings) {
    let s = await settings.async('string');
    s = s.replace(/(<w14:docId w14:val=")[0-9A-F]+(")/, `$1${hex(4).replace(/^[89A-F]/, '1')}$2`);
    s = s.replace(/(<w15:docId w15:val="\{)[0-9A-F-]+(\}")/, `$1${guid()}$2`);
    zip.file('word/settings.xml', s);
  }
  const core = zip.file('docProps/core.xml');
  if (core) {
    let s = await core.async('string');
    s = s.replace(/(<dcterms:created [^>]*>)[^<]*(<\/dcterms:created>)/, `$1${now}$2`);
    s = s.replace(/(<dcterms:modified [^>]*>)[^<]*(<\/dcterms:modified>)/, `$1${now}$2`);
    zip.file('docProps/core.xml', s);
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

/** Dışa aktarılan .docx'i son hâline getirir. Hata olursa özgün baytları döndürür. */
export async function finalizeDocx(bytes) {
  try {
    const zip = await JSZip.loadAsync(bytes);
    const now = isoNow();
    const custom = zip.file('docProps/custom.xml');
    if (custom) {
      let s = await custom.async('string');
      s = s.replace(/<property\b[^>]*\bname="Superdoc[^"]*"[^>]*>[\s\S]*?<\/property>/g, '');
      zip.file('docProps/custom.xml', s);
    }
    const core = zip.file('docProps/core.xml');
    if (core) {
      let s = await core.async('string');
      if (/<dcterms:modified\b/.test(s)) s = s.replace(/(<dcterms:modified [^>]*>)[^<]*(<\/dcterms:modified>)/, `$1${now}$2`);
      zip.file('docProps/core.xml', s);
    }
    const app = zip.file('docProps/app.xml');
    if (app) {
      let s = await app.async('string');
      s = s.replace(/<Application>[^<]*<\/Application>/, '<Application>Ewreka Nota</Application>');
      zip.file('docProps/app.xml', s);
    }
    // Klasör girdilerini at (Word gerektirmez; bazı doğrulayıcılar uyarı verir)
    Object.keys(zip.files).forEach((k) => { if (zip.files[k].dir) delete zip.files[k]; });
    return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  } catch (e) {
    console.warn('[nota] meta düzeltmesi atlandı', e);
    return bytes;
  }
}
