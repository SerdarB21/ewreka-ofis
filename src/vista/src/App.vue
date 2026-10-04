<template>
  <template v-if="slides.length">
    <Screen v-if="screening" />
    <Editor v-else />
  </template>
  <FullscreenSpin tip="Hazırlanıyor, lütfen bekleyin…" v-else loading :mask="false" />
  <RenderHost />
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { useScreenStore, useMainStore, useSnapshotStore, useSlidesStore } from '@/store'
import { LOCALSTORAGE_KEY_DISCARDED_DB } from '@/configs/storage'
import { deleteDiscardedDB } from '@/utils/database'
import useImport from '@/hooks/useImport'
import useExport from '@/hooks/useExport'
import useScreening from '@/hooks/useScreening'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import { createTitleSlide } from '@/ewreka/blank'
import { setupEwrekaShell } from '@/ewreka/shell'

import Editor from './views/Editor/index.vue'
import Screen from './views/Screen/index.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import RenderHost from '@/ewreka/RenderHost.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const snapshotStore = useSnapshotStore()
const screenStore = useScreenStore()
const { databaseId } = storeToRefs(mainStore)
const { slides } = storeToRefs(slidesStore)
const { screening } = storeToRefs(screenStore)

const { importPPTXData } = useImport()
const { exportPPTXData } = useExport()
const { enterScreeningFromStart } = useScreening()
const { undo, redo } = useHistorySnapshot()

const isAudienceMode = new URLSearchParams(window.location.search).get('mode') === 'audience'

onMounted(async () => {
  if (isAudienceMode) {
    slidesStore.setSlides([{
      id: nanoid(10),
      elements: [],
    }])
    screenStore.setScreening(true)
    return
  }

  // Eski oturumlardan kalan geçmiş veritabanlarını temizle; her pencere boş geçmişle başlar
  try {
    await deleteDiscardedDB()
  }
  catch (err) {
    console.warn(err)
  }
  slidesStore.setSlides([createTitleSlide(slidesStore.theme)])
  await snapshotStore.initSnapshotDatabase()

  try {
    await setupEwrekaShell({ importPPTXData, exportPPTXData, enterScreeningFromStart, undo, redo })
  }
  catch (err) {
    console.error(err)
  }
})

// Uygulama kapanırken bu pencerenin IndexedDB geçmiş veritabanını "silinecek" olarak işaretle
window.addEventListener('beforeunload', () => {
  try {
    const discardedDB = localStorage.getItem(LOCALSTORAGE_KEY_DISCARDED_DB)
    const discardedDBList: string[] = discardedDB ? JSON.parse(discardedDB) : []
    discardedDBList.push(databaseId.value)
    localStorage.setItem(LOCALSTORAGE_KEY_DISCARDED_DB, JSON.stringify(discardedDBList))
  }
  catch { /* yoksay */ }
})
</script>

<style lang="scss">
#app {
  flex: 1;
  min-height: 0;
  position: relative;
}
</style>
