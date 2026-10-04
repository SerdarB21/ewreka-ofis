// Türk lirası (₺) simgesi — araç çubuğundaki "para birimi" düğmesi için
import { createElement, forwardRef } from 'react';
import { IconManager } from '@univerjs/preset-sheets-core';

export const LiraIcon = forwardRef(function LiraIcon(props, ref) {
  const { className, extend, preserveStrokeWidth, ...rest } = props;
  return createElement('svg', {
    ref, xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 16 16', width: '1em', height: '1em',
    className: `univerjs-icon univerjs-icon-lira-icon ${className || ''}`.trim(), ...rest,
  },
  createElement('path', { stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none',
    d: 'M6.2 1.8V13.6H7.6C10.5 13.6 12.8 11.4 12.8 8.4M3.6 7.6L10 4.9M3.6 10.4L10 7.7' }));
});
LiraIcon.displayName = 'LiraIcon';

export function registerIcons(injector) {
  try { injector.get(IconManager).register({ LiraIcon }); } catch (e) { console.warn('[matrix] simge kaydedilemedi', e); }
}
