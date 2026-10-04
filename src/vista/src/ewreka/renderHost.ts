// Ewreka Vista — gizli işleme yüzeyi denetimi
import { reactive } from 'vue'

export const renderState = reactive<{ mode: '' | 'image' | 'print'; size: number }>({ mode: '', size: 1600 })

let hostEl: HTMLElement | null = null
let waiters: ((el: HTMLElement) => void)[] = []

export const setRenderHostElement = (el: HTMLElement | null | undefined) => {
  hostEl = el || null
  if (hostEl) {
    const w = waiters
    waiters = []
    w.forEach(fn => fn(hostEl as HTMLElement))
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Slaytları gizli yüzeyde işler, fn tamamlanınca yüzeyi kaldırır */
export const withRenderHost = async <T>(mode: 'image' | 'print', size: number, fn: (el: HTMLElement) => Promise<T>): Promise<T> => {
  renderState.size = size
  renderState.mode = mode
  const el = await new Promise<HTMLElement>((resolve, reject) => {
    waiters.push(resolve)
    if (hostEl) setRenderHostElement(hostEl)
    setTimeout(() => reject(new Error('İşleme yüzeyi hazırlanamadı')), 5000)
  })
  // görseller ve formüller yüklensin
  await sleep(300)
  const imgs = Array.from(el.querySelectorAll('img'))
  await Promise.all(imgs.map(img => img.complete ? null : new Promise(r => {
    img.addEventListener('load', r, { once: true })
    img.addEventListener('error', r, { once: true })
    setTimeout(r, 3000)
  })))
  try {
    return await fn(el)
  }
  finally {
    renderState.mode = ''
    hostEl = null
  }
}
