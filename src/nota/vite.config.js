import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../../ewreka-ofis/modules/nota/', import.meta.url));

const notices = () => ({
  name: 'nota-notices',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'THIRD-PARTY-NOTICES.txt', source: [
      'Ewreka Nota — üçüncü taraf bileşenler / third-party components',
      '',
      'SuperDoc 1.47.1 (npm "superdoc") — GNU AGPL-3.0 — https://github.com/superdoc/docx-editor',
      '  Includes Vue, Pinia, ProseMirror, Konva, eventemitter3, uuid (MIT) as bundled by SuperDoc.',
      'JSZip 3.10 — MIT (dual MIT / GPL-3.0) — https://github.com/Stuk/jszip',
      '',
      'Not: SuperDoc 2.x, özel lisanslı (dağıtımı yasak) "@superdoc/docx-engine" paketine bağımlı olduğu için',
      'KULLANILMAMIŞTIR; tamamen AGPL-3.0 olan 1.x serisi kullanılmıştır.',
      '',
    ].join('\n') });
  },
});

export default defineConfig({
  base: './',
  plugins: [notices()],
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: false,
    minify: process.env.NOTA_NOMINIFY ? false : true,
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 6000,
    reportCompressedSize: false,
  },
  worker: { format: 'es' },
});
