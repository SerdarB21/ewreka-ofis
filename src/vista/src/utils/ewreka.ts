// Ewreka Vista — EwrekaShell (../../shared/ewreka-shell.js) ile köprü yardımcıları
// Copyright (C) 2026 Ewreka Digital — AGPL-3.0-or-later

export interface EwrekaShellAPI {
  init: (opts: any) => Promise<any>
  setDirty: (v: boolean) => void
  toast: (msg: string, type?: 'ok' | 'error', ms?: number) => void
  busy: (msg?: string) => void
  done: () => void
  download: (data: Uint8Array | ArrayBuffer, name: string, mime?: string) => any
  popMenu: (anchor: HTMLElement, items: any[]) => void
  setName: (n: string) => void
  save: () => any
  saveAs: () => any
  open: () => any
  newDoc: () => any
  readonly name: string | null
  readonly bridge: any
}

export const getShell = (): EwrekaShellAPI | null => (window as any).EwrekaShell || null

const dataURLToBytes = (dataURL: string) => {
  const [, b64 = ''] = dataURL.split(',')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Dosyayı kabuk üzerinden (masaüstünde kaydetme penceresiyle) ya da tarayıcı indirmesiyle verir. */
export const downloadFile = async (data: Uint8Array | ArrayBuffer | Blob | string, name: string, mime?: string) => {
  let bytes: Uint8Array
  if (typeof data === 'string') bytes = dataURLToBytes(data)
  else if (data instanceof Blob) bytes = new Uint8Array(await data.arrayBuffer())
  else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data)
  else bytes = data

  const safeName = name.replace(/[\\/:*?"<>|]+/g, '_')
  const shell = getShell()
  if (shell) return shell.download(bytes, safeName, mime)

  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([bytes], { type: mime || 'application/octet-stream' }))
  a.download = safeName
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 1500)
}

/** Kabuktaki belge adından (uzantısız) sunum başlığı üretir */
export const baseName = (name?: string | null) => String(name || '').replace(/\.[^.]+$/, '')
