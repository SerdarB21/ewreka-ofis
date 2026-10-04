// Ewreka Vista — boş sunu / yeni slayt düzenleri (yer tutuculu)
// Copyright (C) 2026 Ewreka Digital — AGPL-3.0-or-later
import { nanoid } from 'nanoid'
import type { Slide, PPTTextElement, SlideTheme } from '@/types/slides'

export const ZWSP = '​'

const placeholderText = (opts: {
  left: number
  top: number
  width: number
  height: number
  fontSize: number
  placeholder: string
  align?: 'left' | 'center'
  bold?: boolean
  color: string
  textType: PPTTextElement['textType']
}): PPTTextElement => {
  const align = opts.align || 'left'
  let inner = `<span style="font-size: ${opts.fontSize}px;">${ZWSP}</span>`
  if (opts.bold) inner = `<strong>${inner}</strong>`
  return {
    type: 'text',
    id: nanoid(10),
    left: opts.left,
    top: opts.top,
    width: opts.width,
    height: opts.height,
    rotate: 0,
    content: `<p style="text-align: ${align};">${inner}</p>`,
    defaultFontName: '',
    defaultColor: opts.color,
    lineHeight: 1.2,
    textType: opts.textType,
    placeholder: opts.placeholder,
  }
}

/** Sunum başlık slaytı (16:9, 1000 x 562.5 görünüm alanı) */
export const createTitleSlide = (theme: SlideTheme, viewportSize = 1000, viewportRatio = 0.5625): Slide => {
  const w = viewportSize
  const h = viewportSize * viewportRatio
  const k = viewportSize / 1000
  return {
    id: nanoid(10),
    type: 'cover',
    elements: [
      placeholderText({
        left: 80 * k, top: h * 0.29, width: w - 160 * k, height: 80 * k, fontSize: Math.round(54 * k),
        placeholder: 'Başlık eklemek için tıklayın', align: 'center', color: theme.fontColor || '#333', textType: 'title',
      }),
      placeholderText({
        left: 150 * k, top: h * 0.56, width: w - 300 * k, height: 48 * k, fontSize: Math.round(26 * k),
        placeholder: 'Alt başlık eklemek için tıklayın', align: 'center', color: '#595959', textType: 'subtitle',
      }),
    ],
    background: { type: 'solid', color: theme.backgroundColor || '#fff' },
  }
}

/** "Başlık ve içerik" düzeninde yeni slayt */
export const createContentSlide = (theme: SlideTheme, viewportSize = 1000, viewportRatio = 0.5625): Slide => {
  const w = viewportSize
  const k = viewportSize / 1000
  void viewportRatio
  return {
    id: nanoid(10),
    type: 'content',
    elements: [
      placeholderText({
        left: 60 * k, top: 36 * k, width: w - 120 * k, height: 64 * k, fontSize: Math.round(40 * k),
        placeholder: 'Başlık eklemek için tıklayın', color: theme.fontColor || '#333', textType: 'title',
      }),
      placeholderText({
        left: 60 * k, top: 130 * k, width: w - 120 * k, height: 44 * k, fontSize: Math.round(24 * k),
        placeholder: 'Metin eklemek için tıklayın', color: theme.fontColor || '#333', textType: 'content',
      }),
    ],
    background: { type: 'solid', color: theme.backgroundColor || '#fff' },
  }
}

/** Metin içeriği (etiketler ve ZWSP hariç) boş mu? */
export const isEmptyRichText = (html?: string) => !String(html || '').replace(/<[^>]+>/g, '').replace(/[​\s]|&nbsp;/g, '')
