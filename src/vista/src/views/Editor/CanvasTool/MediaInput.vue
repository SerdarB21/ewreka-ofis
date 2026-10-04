<template>
  <div class="media-input">
    <Tabs 
      :tabs="tabs" 
      v-model:value="type" 
      :tabsStyle="{ marginBottom: '15px' }" 
    />

    <template v-if="type === 'video'">
      <Input v-model:value="videoSrc" placeholder="Video adresini girin, ör. https://xxx.mp4"></Input>
      <div class="btns">
        <FileInput accept="video/*" @change="files => uploadVideo(files)">
          <Button><i-icon-park-outline:upload /> Bilgisayardan video yükle</Button>
        </FileInput>
        <div class="group">
          <Button @click="emit('close')" style="margin-right: 10px;">İptal</Button>
          <Button type="primary" @click="insertVideo()">Tamam</Button>
        </div>
      </div>
    </template>

    <template v-if="type === 'audio'">
      <Input v-model:value="audioSrc" placeholder="Ses adresini girin, ör. https://xxx.mp3"></Input>
      <div class="btns">
        <FileInput accept="audio/*" @change="files => uploadAudio(files)">
          <Button><i-icon-park-outline:upload /> Bilgisayardan ses yükle</Button>
        </FileInput>
        <div class="group">
          <Button @click="emit('close')" style="margin-right: 10px;">İptal</Button>
          <Button type="primary" @click="insertAudio()">Tamam</Button>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import message from '@/utils/message'
import { MIME_MAP } from '@/configs/mime'
import Tabs from '@/components/Tabs.vue'
import Input from '@/components/Input.vue'
import Button from '@/components/Button.vue'
import FileInput from '@/components/FileInput.vue'

type TypeKey = 'video' | 'audio'
interface TabItem {
  key: TypeKey
  label: string
}

const emit = defineEmits<{
  (event: 'insertVideo', payload: { src: string, ext?: string }): void
  (event: 'insertAudio', payload: { src: string, ext?: string }): void
  (event: 'close'): void
}>()

const type = ref<TypeKey>('video')

const videoSrc = ref('')
const audioSrc = ref('')

const tabs: TabItem[] = [
  { key: 'video', label: 'Video' },
  { key: 'audio', label: 'Ses' },
]

const insertVideo = () => {
  if (!videoSrc.value) return message.error('Önce geçerli bir video adresi girin')
  emit('insertVideo', { src: videoSrc.value })
}

const insertAudio = () => {
  if (!audioSrc.value) return message.error('Önce geçerli bir ses adresi girin')
  emit('insertAudio', { src: audioSrc.value })
}

const uploadVideo = (files: FileList) => {
  const file = files[0]
  if (!file) return
  const ext = MIME_MAP[file.type] || ''
  emit('insertVideo', { src: URL.createObjectURL(file), ext })
}

const uploadAudio = (files: FileList) => {
  const file = files[0]
  if (!file) return
  const ext = MIME_MAP[file.type] || ''
  emit('insertAudio', { src: URL.createObjectURL(file), ext })
}
</script>

<style lang="scss" scoped>
.media-input {
  width: 480px;
}
.btns {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
}
</style>
