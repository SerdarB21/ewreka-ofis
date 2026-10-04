<template>
  <Teleport to="body">
    <div class="ew-render-host" ref="hostRef" v-if="renderState.mode" :class="'ew-mode-' + renderState.mode">
      <div
        class="ew-page"
        v-for="slide in slides"
        :key="slide.id"
        :style="{ width: renderState.size + 'px', height: renderState.size * viewportRatio + 'px' }"
      >
        <ThumbnailSlide :slide="slide" :size="renderState.size" />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
// Ewreka Vista — dışa aktarma (PNG/PDF) için tüm slaytları tam boyutta işleyen gizli yüzey
import { watch, nextTick, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import { renderState, setRenderHostElement } from './renderHost'

const { slides, viewportRatio } = storeToRefs(useSlidesStore())
const hostRef = useTemplateRef<HTMLElement>('hostRef')

watch(() => renderState.mode, () => {
  nextTick(() => setRenderHostElement(renderState.mode ? hostRef.value : null))
})
</script>

<style lang="scss">
.ew-render-host {
  position: fixed;
  left: -200000px;
  top: 0;
  z-index: -1;
  pointer-events: none;

  .ew-page {
    overflow: hidden;
    position: relative;
    background: #fff;
  }
}
@media print {
  body.ew-printing {
    height: auto !important;
    overflow: visible !important;
    display: block !important;

    & > *:not(.ew-render-host) {
      display: none !important;
    }
    .ew-render-host {
      position: static !important;
      left: 0 !important;
      z-index: auto;
    }
    .ew-page {
      break-after: page;
      page-break-after: always;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ew-page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
  }
}
</style>
