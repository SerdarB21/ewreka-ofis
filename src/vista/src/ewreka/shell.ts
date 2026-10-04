// Ewreka Vista — EwrekaShell entegrasyonu (Yeni / Aç / Kaydet / Dışa aktar / Yazdır / Geri al)
// Copyright (C) 2026 Ewreka Digital — AGPL-3.0-or-later
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { useMainStore, useSlidesStore, useSnapshotStore, useScreenStore } from '@/store'
import type { SlideTheme } from '@/types/slides'
import { getShell, baseName } from '@/utils/ewreka'
import { createTitleSlide } from './blank'
import { withRenderHost, renderState } from './renderHost'
import { preprocessPPTX } from './pptxPreprocess'

interface Deps {
  importPPTXData: (buffer: ArrayBuffer, options?: { cover?: boolean; fixedViewport?: boolean; throwOnError?: boolean; noHistory?: boolean }) => Promise<void>
  exportPPTXData: (slides?: any[], masterOverwrite?: boolean, ignoreMedia?: boolean) => Promise<Uint8Array>
  enterScreeningFromStart: () => void
  undo: () => void
  redo: () => void
}

const BLANK_TITLE = 'Adsız sunum'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const ICON_PLAY = '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M10 8.5v5l4.5-2.5z"/><path d="M8 21h8M12 17v4"/>'

export const setupEwrekaShell = async (deps: Deps) => {
  const shell = getShell()
  const mainStore = useMainStore()
  const slidesStore = useSlidesStore()
  const snapshotStore = useSnapshotStore()
  const screenStore = useScreenStore()

  // Otomatik testler için küçük bir kanca
  ;(window as any).__ewrekaVista = { slidesStore, mainStore, snapshotStore, screenStore, renderState }

  const defaultTheme: SlideTheme = JSON.parse(JSON.stringify(slidesStore.theme))

  // Belge yüklenirken oluşan değişiklikler "kaydedilmemiş" sayılmasın
  let suppressDirty = true
  const markDirty = () => {
    if (!suppressDirty && shell) shell.setDirty(true)
  }
  snapshotStore.$onAction(({ name, after }) => {
    if (name === 'addSnapshot' || name === 'unDo' || name === 'reDo') after(markDirty)
  })
  slidesStore.$onAction(({ name, after }) => {
    if (name === 'setViewportRatio' || name === 'setTheme') after(markDirty)
  })

  // Sunum sırasında kabuk çubuğunu gizle
  screenStore.$subscribe(() => {
    document.body.classList.toggle('ew-screening', screenStore.screening)
  })

  const resetEditorState = () => {
    mainStore.setActiveElementIdList([])
    mainStore.setDialogForExport('')
    if (screenStore.screening) screenStore.setScreening(false)
  }

  const finishLoad = async () => {
    // metin kutularının yükseklik ölçümleri vb. tamamlansın
    await sleep(450)
    await snapshotStore.resetSnapshotDatabase()
    suppressDirty = false
  }

  const newPresentation = async () => {
    suppressDirty = true
    resetEditorState()
    slidesStore.setTheme(JSON.parse(JSON.stringify(defaultTheme)))
    slidesStore.setViewportSize(1000)
    slidesStore.setViewportRatio(0.5625)
    slidesStore.setExportWidthIn(13.333)
    slidesStore.updateSlideIndex(0)
    slidesStore.setSlides([createTitleSlide(slidesStore.theme, 1000, 0.5625)])
    slidesStore.setTitle(BLANK_TITLE)
    await finishLoad()
  }

  const openPresentation = async ({ name, data }: { name: string; data: Uint8Array }) => {
    suppressDirty = true
    resetEditorState()
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    try {
      slidesStore.setTheme(JSON.parse(JSON.stringify(defaultTheme)))
      // Tüm sunular 1000 px genişlikli sabit tuvalde düzenlenir (şablonlar ve yeni slaytlar da bu ölçüdedir)
      slidesStore.setViewportSize(1000)
      await deps.importPPTXData(await preprocessPPTX(buffer), { cover: true, fixedViewport: true, throwOnError: true, noHistory: true })
    }
    catch (err) {
      console.error(err)
      if (!slidesStore.slides.length) slidesStore.setSlides([createTitleSlide(slidesStore.theme)])
      await finishLoad()
      throw new Error('Sunu dosyası okunamadı veya bozuk')
    }
    if (!slidesStore.slides.length) slidesStore.setSlides([createTitleSlide(slidesStore.theme, slidesStore.viewportSize, slidesStore.viewportRatio)])
    slidesStore.updateSlideIndex(0)
    slidesStore.setTitle(baseName(name) || BLANK_TITLE)
    await finishLoad()
  }

  const exportPNGZip = async () => {
    const zip = new JSZip()
    await withRenderHost('image', 1920, async host => {
      const pages = Array.from(host.querySelectorAll<HTMLElement>('.ew-page'))
      host.querySelectorAll('foreignObject [xmlns]').forEach(el => el.removeAttribute('xmlns'))
      let i = 0
      for (const page of pages) {
        i++
        const dataUrl = await toPng(page, { pixelRatio: 1, fontEmbedCSS: '', cacheBust: false })
        zip.file(`slayt-${String(i).padStart(2, '0')}.png`, dataUrl.split(',')[1], { base64: true })
      }
    })
    return zip.generateAsync({ type: 'uint8array' })
  }

  const printSlides = async (toPDF: boolean): Promise<Uint8Array | null> => {
    const bridge = shell?.bridge
    const size = 1280
    const ratio = slidesStore.viewportRatio
    return withRenderHost('print', size, async () => {
      const style = document.createElement('style')
      style.textContent = `@page { size: ${size}px ${Math.round(size * ratio)}px; margin: 0; }`
      document.head.appendChild(style)
      document.body.classList.add('ew-printing')
      try {
        if (toPDF && bridge && bridge.printToPDF) {
          const bytes = await bridge.printToPDF({
            pageSize: { width: size / 96, height: (size * ratio) / 96 },
            landscape: false,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          })
          return bytes as Uint8Array
        }
        const testHook = (window as any).__ewrekaVista?.printHook
        if (typeof testHook === 'function') {
          await testHook()
          return null
        }
        await new Promise<void>(resolve => {
          const done = () => {
            window.removeEventListener('afterprint', done)
            resolve()
          }
          window.addEventListener('afterprint', done)
          window.print()
          setTimeout(done, 1500)
        })
        return null
      }
      finally {
        document.body.classList.remove('ew-printing')
        style.remove()
      }
    })
  }

  const isEditingText = () => {
    const el = document.activeElement as HTMLElement | null
    return !!el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
  }

  if (!shell) {
    await newPresentation()
    return
  }

  await shell.init({
    module: 'vista',
    saveFormats: [
      { id: 'pptx', label: 'PowerPoint Sunusu', ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
      { id: 'pdf', label: 'PDF belgesi', ext: 'pdf', export: true, mime: 'application/pdf' },
      { id: 'png', label: 'PNG görüntüleri (ZIP)', ext: 'zip', export: true, mime: 'application/zip' },
    ],
    onNew: newPresentation,
    onOpen: openPresentation,
    onSave: async (formatId: string) => {
      // Metin düzenleyicisinin gecikmeli (300 ms) eşitlemesi tamamlansın; son yazılan karakterler kaybolmasın
      await sleep(350)
      mainStore.setActiveElementIdList([])
      if (formatId === 'pptx') return deps.exportPPTXData(slidesStore.slides, true, false)
      if (formatId === 'png') return exportPNGZip()
      if (formatId === 'pdf') {
        const data = await printSlides(true)
        if (!data) shell.toast('PDF için yazdırma penceresinde hedef olarak "PDF olarak kaydet"i seçin.', 'ok', 5000)
        return data
      }
      throw new Error('Bilinmeyen biçim: ' + formatId)
    },
    onPrint: () => mainStore.setDialogForExport('pdf'),
    onUndo: () => {
      if (isEditingText()) document.execCommand('undo')
      else deps.undo()
    },
    onRedo: () => {
      if (isEditingText()) document.execCommand('redo')
      else deps.redo()
    },
    actions: [
      {
        id: 'slideshow',
        label: 'Sunuyu başlat',
        title: 'Sunuyu baştan başlat (F5)',
        icon: ICON_PLAY,
        onClick: () => deps.enterScreeningFromStart(),
      },
    ],
  })
}
