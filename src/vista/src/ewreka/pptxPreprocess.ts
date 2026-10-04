// Ewreka Vista — PPTX içe aktarma ön işlemi
// pptxtojson yalnızca paragrafta açıkça yazılmış madde işaretlerini tanıyor. PowerPoint dosyalarında
// madde işaretleri çoğunlukla yerleşim (layout) / asıl slayt (master) düzeyinden miras alınır.
// Bu modül, miras alınan madde işaretlerini slayt XML'ine açıkça yazar.
// Copyright (C) 2026 Ewreka Digital — AGPL-3.0-or-later
import JSZip from 'jszip'

const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
const BULLET_TAGS = ['buNone', 'buChar', 'buAutoNum', 'buBlip']
const BODY_TYPES = new Set(['', 'body', 'obj', 'subTitle'])

type XDoc = Document

const parse = (xml: string): XDoc => new DOMParser().parseFromString(xml, 'application/xml')
const childrenNS = (el: Element | null | undefined, ns: string, local: string) =>
  el ? Array.from(el.children).filter(c => c.namespaceURI === ns && c.localName === local) : []
const childNS = (el: Element | null | undefined, ns: string, local: string) => childrenNS(el, ns, local)[0] || null

const resolveTarget = (base: string, target: string) => {
  const parts = base.split('/').slice(0, -1)
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg !== '.') parts.push(seg)
  }
  return parts.join('/')
}

const relsPath = (path: string) => {
  const i = path.lastIndexOf('/')
  return `${path.slice(0, i)}/_rels/${path.slice(i + 1)}.rels`
}

const findRelTarget = async (zip: JSZip, path: string, typeSuffix: string) => {
  const f = zip.file(relsPath(path))
  if (!f) return null
  const doc = parse(await f.async('string'))
  for (const r of Array.from(doc.getElementsByTagName('Relationship'))) {
    if ((r.getAttribute('Type') || '').endsWith(typeSuffix)) return resolveTarget(path, r.getAttribute('Target') || '')
  }
  return null
}

/** Bir lstStyle / bodyStyle öğesinden seviyeye göre madde işareti öğesi */
const bulletFromStyle = (style: Element | null, lvl: number): Element | null => {
  if (!style) return null
  const lvlPr = childNS(style, NS_A, `lvl${lvl + 1}pPr`)
  if (!lvlPr) return null
  for (const tag of BULLET_TAGS) {
    const b = childNS(lvlPr, NS_A, tag)
    if (b) return b
  }
  return null
}
const bulletFontFromStyle = (style: Element | null, lvl: number): Element | null => {
  const lvlPr = style ? childNS(style, NS_A, `lvl${lvl + 1}pPr`) : null
  return lvlPr ? childNS(lvlPr, NS_A, 'buFont') : null
}

const phInfo = (sp: Element) => {
  const nv = childNS(sp, NS_P, 'nvSpPr')
  const nvPr = childNS(nv, NS_P, 'nvPr')
  const ph = childNS(nvPr, NS_P, 'ph')
  if (!ph) return null
  return { type: ph.getAttribute('type') || '', idx: ph.getAttribute('idx') || '' }
}

const findPlaceholder = (doc: XDoc | null, info: { type: string; idx: string }) => {
  if (!doc) return null
  const sps = Array.from(doc.getElementsByTagNameNS(NS_P, 'sp'))
  let byType: Element | null = null
  for (const sp of sps) {
    const p = phInfo(sp)
    if (!p) continue
    if (info.idx && p.idx === info.idx) return sp
    const t1 = p.type || 'obj', t2 = info.type || 'obj'
    if (!byType && (t1 === t2 || (BODY_TYPES.has(p.type) && BODY_TYPES.has(info.type) && t1 !== 'subTitle' && t2 !== 'subTitle'))) byType = sp
  }
  return byType
}

const lstStyleOf = (sp: Element | null) => {
  const tx = childNS(sp, NS_P, 'txBody')
  return childNS(tx, NS_A, 'lstStyle')
}

export const preprocessPPTX = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  }
  catch {
    return buffer
  }
  const docCache = new Map<string, XDoc | null>()
  const getDoc = async (path: string | null) => {
    if (!path) return null
    if (docCache.has(path)) return docCache.get(path)!
    const f = zip.file(path)
    const d = f ? parse(await f.async('string')) : null
    docCache.set(path, d)
    return d
  }

  let changed = false
  const slidePaths = Object.keys(zip.files).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p))
  for (const slidePath of slidePaths) {
    const layoutPath = await findRelTarget(zip, slidePath, '/slideLayout')
    const masterPath = layoutPath ? await findRelTarget(zip, layoutPath, '/slideMaster') : null
    const layoutDoc = await getDoc(layoutPath)
    const masterDoc = await getDoc(masterPath)
    const bodyStyle = masterDoc ? (masterDoc.getElementsByTagNameNS(NS_P, 'bodyStyle')[0] || null) : null

    const slideDoc = await getDoc(slidePath)
    if (!slideDoc) continue
    let slideChanged = false

    for (const sp of Array.from(slideDoc.getElementsByTagNameNS(NS_P, 'sp'))) {
      const info = phInfo(sp)
      if (!info || !BODY_TYPES.has(info.type)) continue
      const txBody = childNS(sp, NS_P, 'txBody')
      if (!txBody) continue
      const ownStyle = childNS(txBody, NS_A, 'lstStyle')
      const layoutSp = findPlaceholder(layoutDoc, info)
      const layoutStyle = lstStyleOf(layoutSp)
      const masterSp = findPlaceholder(masterDoc, { type: info.type === 'subTitle' ? 'subTitle' : 'body', idx: '' })
      const masterStyle = lstStyleOf(masterSp)
      const chain = info.type === 'subTitle' ? [ownStyle, layoutStyle, masterStyle] : [ownStyle, layoutStyle, masterStyle, bodyStyle]

      for (const p of childrenNS(txBody, NS_A, 'p')) {
        const hasText = childrenNS(p, NS_A, 'r').length || childrenNS(p, NS_A, 'fld').length
        if (!hasText) continue
        let pPr = childNS(p, NS_A, 'pPr')
        if (pPr && BULLET_TAGS.some(t => childNS(pPr, NS_A, t))) continue
        const lvl = parseInt(pPr?.getAttribute('lvl') || '0') || 0
        let bullet: Element | null = null
        let font: Element | null = null
        for (const st of chain) {
          bullet = bulletFromStyle(st, lvl)
          if (bullet) {
            font = bulletFontFromStyle(st, lvl)
            break
          }
        }
        if (!bullet || bullet.localName === 'buNone' || bullet.localName === 'buBlip') continue
        if (!pPr) {
          pPr = slideDoc.createElementNS(NS_A, 'a:pPr')
          p.insertBefore(pPr, p.firstChild)
        }
        const before = ['tabLst', 'defRPr', 'extLst'].map(t => childNS(pPr, NS_A, t)).find(Boolean) || null
        if (font && !childNS(pPr, NS_A, 'buFont')) pPr.insertBefore(slideDoc.importNode(font, true), before)
        pPr.insertBefore(slideDoc.importNode(bullet, true), before)
        slideChanged = true
      }
    }
    if (slideChanged) {
      zip.file(slidePath, new XMLSerializer().serializeToString(slideDoc))
      changed = true
    }
  }
  if (!changed) return buffer
  return zip.generateAsync({ type: 'arraybuffer' })
}
