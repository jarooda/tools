<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { resizeToWidth, resizeToHeight, resizeByPercent } from '@/utils/imageResize'
import type { LoadedImage } from '@/composables/useCanvasImage'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-resize')!
const { loadImage, createCanvas, canvasToBlob } = useCanvasImage()

const ready = ref(false)
onMounted(() => (ready.value = true))

const loaded = shallowRef<LoadedImage | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const error = ref('')

const width = ref<number | null>(0)
const height = ref<number | null>(0)
const lockAspect = ref(true)

/** Keep the output in the source format where the browser can encode it. */
const outMime = () => {
  const t = loaded.value?.file.type
  return t === 'image/jpeg' || t === 'image/webp' ? t : 'image/png'
}
const outExt = () =>
  outMime() === 'image/jpeg' ? 'jpg' : outMime() === 'image/webp' ? 'webp' : 'png'
const downloadName = () => {
  const base = loaded.value?.file.name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}-${width.value}x${height.value}.${outExt()}`
}

async function onSelect(file: File) {
  error.value = ''
  try {
    loaded.value?.revoke()
    const img = await loadImage(file)
    loaded.value = img
    width.value = img.width
    height.value = img.height
  } catch (e) {
    error.value = (e as Error).message
    loaded.value = null
  }
}

function reset() {
  loaded.value?.revoke()
  loaded.value = null
  outputBlob.value = null
}

function onWidth(v: number | null) {
  width.value = v
  const img = loaded.value
  if (lockAspect.value && img && v) height.value = resizeToWidth(img.width, img.height, v).height
}

function onHeight(v: number | null) {
  height.value = v
  const img = loaded.value
  if (lockAspect.value && img && v) width.value = resizeToHeight(img.width, img.height, v).width
}

function scale(percent: number) {
  const img = loaded.value
  if (!img) return
  const d = resizeByPercent(img.width, img.height, percent)
  width.value = d.width
  height.value = d.height
}

async function render() {
  const img = loaded.value
  if (!img || !width.value || !height.value) return
  const canvas = createCanvas(width.value, height.value)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img.el, 0, 0, canvas.width, canvas.height)
  outputBlob.value = await canvasToBlob(canvas, outMime(), 0.92)
}

watch([loaded, width, height], render, { immediate: true })
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="rs">
      <Skeleton variant="rect" width="100%" height="260px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!loaded"
      title="Resize an image"
      description="Drop an image below to change its dimensions — it never leaves your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone class="rs__drop" @select="onSelect" />
      </template>
    </EmptyState>

    <div v-else class="rs">
      <div class="rs__preview">
        <img :src="loaded.url" :alt="loaded.file.name" class="rs__img" />
        <span class="rs__orig">Original: {{ loaded.width }} × {{ loaded.height }} px</span>
      </div>

      <div class="rs__controls">
        <div class="rs__dims">
          <Field label="Width (px)">
            <NumberInput :model-value="width" :min="1" :step="1" @update:model-value="onWidth" />
          </Field>
          <Field label="Height (px)">
            <NumberInput :model-value="height" :min="1" :step="1" @update:model-value="onHeight" />
          </Field>
        </div>

        <Switch v-model="lockAspect" label="Lock aspect ratio" />

        <Field label="Quick scale">
          <div class="rs__scales">
            <Button
              v-for="p in [25, 50, 75, 100]"
              :key="p"
              variant="secondary"
              size="sm"
              @click="scale(p)"
            >
              {{ p }}%
            </Button>
          </div>
        </Field>

        <ResultActions :blob="outputBlob" :filename="downloadName()">
          <template #extra>
            <Button variant="ghost" size="sm" @click="reset">
              <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
              New image
            </Button>
          </template>
        </ResultActions>
      </div>
    </div>

    <p v-if="error" class="rs__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.rs {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.rs__preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
}
.rs__img {
  max-width: 100%;
  max-height: 400px;
  height: auto;
  border-radius: 4px;
}
.rs__orig {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
.rs__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.rs__dims {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.rs__scales {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.rs__drop {
  width: 100%;
}
.rs__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
@media (max-width: 720px) {
  .rs {
    grid-template-columns: 1fr;
  }
}
</style>
