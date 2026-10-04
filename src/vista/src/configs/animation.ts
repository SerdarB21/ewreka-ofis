import type { TurningMode } from '@/types/slides'

export const ANIMATION_DEFAULT_DURATION = 1000
export const ANIMATION_DEFAULT_TRIGGER = 'click'
export const ANIMATION_CLASS_PREFIX = 'animate__'

export const ENTER_ANIMATIONS = [
  {
    type: 'bounce',
    name: 'Zıplama',
    children: [
      { name: 'Zıplayarak gir', value: 'bounceIn' },
      { name: 'Soldan zıplayarak gir', value: 'bounceInLeft' },
      { name: 'Sağdan zıplayarak gir', value: 'bounceInRight' },
      { name: 'Aşağıdan zıplayarak gir', value: 'bounceInUp' },
      { name: 'Yukarıdan zıplayarak gir', value: 'bounceInDown' },
    ],
  },
  {
    type: 'fade',
    name: 'Süzülme',
    children: [
      { name: 'Soldurarak gir', value: 'fadeIn' },
      { name: 'Yukarıdan süzülerek gir', value: 'fadeInDown' },
      { name: 'Yukarıdan uzaktan süzülerek gir', value: 'fadeInDownBig' },
      { name: 'Soldan süzülerek gir', value: 'fadeInLeft' },
      { name: 'Soldan uzaktan süzülerek gir', value: 'fadeInLeftBig' },
      { name: 'Sağdan süzülerek gir', value: 'fadeInRight' },
      { name: 'Sağdan uzaktan süzülerek gir', value: 'fadeInRightBig' },
      { name: 'Aşağıdan süzülerek gir', value: 'fadeInUp' },
      { name: 'Aşağıdan uzaktan süzülerek gir', value: 'fadeInUpBig' },
      { name: 'Sol üstten süzülerek gir', value: 'fadeInTopLeft' },
      { name: 'Sağ üstten süzülerek gir', value: 'fadeInTopRight' },
      { name: 'Sol alttan süzülerek gir', value: 'fadeInBottomLeft' },
      { name: 'Sağ alttan süzülerek gir', value: 'fadeInBottomRight' },
    ],
  },
  {
    type: 'rotate',
    name: 'Döndürme',
    children: [
      { name: 'Dönerek gir', value: 'rotateIn' },
      { name: 'Sol alttan dönerek gir', value: 'rotateInDownLeft' },
      { name: 'Sağ alttan dönerek gir', value: 'rotateInDownRight' },
      { name: 'Sol üstten dönerek gir', value: 'rotateInUpLeft' },
      { name: 'Sağ üstten dönerek gir', value: 'rotateInUpRight' },
    ],
  },
  {
    type: 'zoom',
    name: 'Yakınlaştırma',
    children: [
      { name: 'Büyüyerek gir', value: 'zoomIn' },
      { name: 'Yukarıdan büyüyerek gir', value: 'zoomInDown' },
      { name: 'Soldan büyüyerek gir', value: 'zoomInLeft' },
      { name: 'Sağdan büyüyerek gir', value: 'zoomInRight' },
      { name: 'Aşağıdan büyüyerek gir', value: 'zoomInUp' },
    ],
  },
  {
    type: 'slide',
    name: 'Kayarak gir',
    children: [
      { name: 'Yukarıdan kayarak gir', value: 'slideInDown' },
      { name: 'Sağdan kayarak gir', value: 'slideInLeft' },
      { name: 'Soldan kayarak gir', value: 'slideInRight' },
      { name: 'Aşağıdan kayarak gir', value: 'slideInUp' },
    ],
  },
  {
    type: 'flip',
    name: 'Çevirme',
    children: [
      { name: 'X ekseninde dönerek gir', value: 'flipInX' },
      { name: 'Y ekseninde dönerek gir', value: 'flipInY' },
    ],
  },
  {
    type: 'back',
    name: 'Yaklaşarak gir',
    children: [
      { name: 'Yukarıdan yaklaşarak gir', value: 'backInDown' },
      { name: 'Soldan yaklaşarak gir', value: 'backInLeft' },
      { name: 'Sağdan yaklaşarak gir', value: 'backInRight' },
      { name: 'Aşağıdan yaklaşarak gir', value: 'backInUp' },
    ],
  },
  {
    type: 'lightSpeed',
    name: 'Uçarak gir',
    children: [
      { name: 'Sağdan uçarak gir', value: 'lightSpeedInRight' },
      { name: 'Soldan uçarak gir', value: 'lightSpeedInLeft' },
    ],
  },
]

export const EXIT_ANIMATIONS = [
  {
    type: 'bounce',
    name: 'Zıplama',
    children: [
      { name: 'Zıplayarak çık', value: 'bounceOut' },
      { name: 'Sola zıplayarak çık', value: 'bounceOutLeft' },
      { name: 'Sağa zıplayarak çık', value: 'bounceOutRight' },
      { name: 'Yukarı zıplayarak çık', value: 'bounceOutUp' },
      { name: 'Aşağı zıplayarak çık', value: 'bounceOutDown' },
    ],
  },
  {
    type: 'fade',
    name: 'Süzülme',
    children: [
      { name: 'Soldurarak çık', value: 'fadeOut' },
      { name: 'Aşağı süzülerek çık', value: 'fadeOutDown' },
      { name: 'Aşağı uzağa süzülerek çık', value: 'fadeOutDownBig' },
      { name: 'Sola süzülerek çık', value: 'fadeOutLeft' },
      { name: 'Sola uzağa süzülerek çık', value: 'fadeOutLeftBig' },
      { name: 'Sağa süzülerek çık', value: 'fadeOutRight' },
      { name: 'Sağa uzağa süzülerek çık', value: 'fadeOutRightBig' },
      { name: 'Yukarı süzülerek çık', value: 'fadeOutUp' },
      { name: 'Yukarı uzağa süzülerek çık', value: 'fadeOutUpBig' },
      { name: 'Sol üste süzülerek çık', value: 'fadeOutTopLeft' },
      { name: 'Sağ üste süzülerek çık', value: 'fadeOutTopRight' },
      { name: 'Sol alta süzülerek çık', value: 'fadeOutBottomLeft' },
      { name: 'Sağ alta süzülerek çık', value: 'fadeOutBottomRight' },
    ],
  },
  {
    type: 'rotate',
    name: 'Döndürme',
    children: [
      { name: 'Dönerek çık', value: 'rotateOut' },
      { name: 'Sol alta dönerek çık', value: 'rotateOutDownLeft' },
      { name: 'Sağ alta dönerek çık', value: 'rotateOutDownRight' },
      { name: 'Sol üste dönerek çık', value: 'rotateOutUpLeft' },
      { name: 'Sağ üste dönerek çık', value: 'rotateOutUpRight' },
    ],
  },
  {
    type: 'zoom',
    name: 'Yakınlaştırma',
    children: [
      { name: 'Küçülerek çık', value: 'zoomOut' },
      { name: 'Aşağı küçülerek çık', value: 'zoomOutDown' },
      { name: 'Sola küçülerek çık', value: 'zoomOutLeft' },
      { name: 'Sağa küçülerek çık', value: 'zoomOutRight' },
      { name: 'Yukarı küçülerek çık', value: 'zoomOutUp' },
    ],
  },
  {
    type: 'slide',
    name: 'Kayarak çık',
    children: [
      { name: 'Aşağı kayarak çık', value: 'slideOutDown' },
      { name: 'Sola kayarak çık', value: 'slideOutLeft' },
      { name: 'Sağa kayarak çık', value: 'slideOutRight' },
      { name: 'Yukarı kayarak çık', value: 'slideOutUp' },
    ],
  },
  {
    type: 'flip',
    name: 'Çevirme',
    children: [
      { name: 'X ekseninde dönerek çık', value: 'flipOutX' },
      { name: 'Y ekseninde dönerek çık', value: 'flipOutY' },
    ],
  },
  {
    type: 'back',
    name: 'Uzaklaşarak çık',
    children: [
      { name: 'Aşağı uzaklaşarak çık', value: 'backOutDown' },
      { name: 'Sola uzaklaşarak çık', value: 'backOutLeft' },
      { name: 'Sağa uzaklaşarak çık', value: 'backOutRight' },
      { name: 'Yukarı uzaklaşarak çık', value: 'backOutUp' },
    ],
  },
  {
    type: 'lightSpeed',
    name: 'Uçarak çık',
    children: [
      { name: 'Sağa uçarak çık', value: 'lightSpeedOutRight' },
      { name: 'Sola uçarak çık', value: 'lightSpeedOutLeft' },
    ],
  },
]

export const ATTENTION_ANIMATIONS = [
  {
    type: 'shake',
    name: 'Sallanma',
    children: [
      { name: 'Yatay sallan', value: 'shakeX' },
      { name: 'Dikey sallan', value: 'shakeY' },
      { name: 'Baş sallama', value: 'headShake' },
      { name: 'Salınım', value: 'swing' },
      { name: 'Sallanma', value: 'wobble' },
      { name: 'Ta-da', value: 'tada' },
      { name: 'Jöle', value: 'jello' },
    ],
  },
  {
    type: 'other',
    name: 'Diğer',
    children: [
      { name: 'Zıplama', value: 'bounce' },
      { name: 'Yanıp sönme', value: 'flash' },
      { name: 'Nabız', value: 'pulse' },
      { name: 'Lastik bant', value: 'rubberBand' },
      { name: 'Kalp atışı (hızlı)', value: 'heartBeat' },
    ],
  },
]

interface SlideAnimation {
  label: string
  value: TurningMode
}

export const SLIDE_ANIMATIONS: SlideAnimation[] = [
  { label: 'Yok', value: 'no' },
  { label: 'Rastgele', value: 'random' },
  { label: 'Yatay itme', value: 'slideX' },
  { label: 'Dikey itme', value: 'slideY' },
  { label: 'Yatay itme (3B)', value: 'slideX3D' },
  { label: 'Dikey itme (3B)', value: 'slideY3D' },
  { label: 'Solma', value: 'fade' },
  { label: 'Döndürme', value: 'rotate' },
  { label: 'Dikey açılma', value: 'scaleY' },
  { label: 'Yatay açılma', value: 'scaleX' },
  { label: 'Büyüme', value: 'scale' },
  { label: 'Küçülme', value: 'scaleReverse' },
]