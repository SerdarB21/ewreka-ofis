import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import univerPatches from './scripts/vite-univer-patches.js';

export default defineConfig({
  base: './',
  plugins: [univerPatches()],
  resolve: {
    alias: { exceljs: resolve(import.meta.dirname, 'node_modules/exceljs/dist/exceljs.bare.min.js') },
  },
  build: {
    outDir: resolve(import.meta.dirname, '../../ewreka-ofis/modules/matrix'),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 8000,
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    rollupOptions: {
      onwarn(w, warn) { if (w.code === 'MODULE_LEVEL_DIRECTIVE' || w.code === 'EVAL') return; warn(w); },
      output: {
        advancedChunks: {
          groups: [
            { name: 'exceljs', test: /node_modules[\\/](exceljs|fflate)/ },
            { name: 'univer', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  server: { port: 8702 },
});
