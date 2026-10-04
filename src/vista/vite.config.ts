import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    outDir: '../../ewreka-ofis/modules/vista',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
  },
  plugins: [
    // Ewreka: pptxtojson 2.2.0 paragraf boşluğu (spcPct) hatası: val=20000 (%20) değerini 20em olarak okuyor
    {
      name: 'ewreka-fix-pptxtojson-spcpct',
      transform(code, id) {
        if (!id.includes('pptxtojson')) return null
        const fixed = code.replace('return e?parseInt(e)/1e3+"em"', 'return e?parseInt(e)/1e5*1.2+"em"')
        return fixed === code ? null : { code: fixed, map: null }
      },
    },
    vue(),
    Components({
      dirs: [],
      resolvers: [
        IconsResolver({
          prefix: 'i',
          customCollections: ['custom'],
        }),
      ],
    }),
    Icons({
      compiler: 'vue3',
      autoInstall: false, 
      customCollections: {
        custom: FileSystemIconLoader('src/assets/icons'),
      },
      scale: 1,
      defaultClass: 'i-icon',
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @import '@/assets/styles/variable.scss';
          @import '@/assets/styles/mixin.scss';
        `
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
