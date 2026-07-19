<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { normalizeRect, clampRect, scaleRect, type Rect } from '@/utils/imageCrop'
import type { LoadedImage } from '@/composables/useCanvasImage'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-crop')!
const { loadImage, createCanvas, canvasToBlob } = useCanvasImage()

const ready = ref(false)
onMounted(() => (ready.value = true))

const loaded = shallowRef<LoadedImage | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const error = ref('')

const stageEl = ref<HTMLElement | null>(null)
const imgEl = ref<HTMLImageElement | null>(null)
const sel = ref<Rect | null>(null)
const natSel = ref<Rect | null>(null)
let startX = 0
let startY = 0
let dragging = false

const outMime = () => {
  const t = loaded.value?.file.type
  return t === 'image/jpeg' || t === 'image/webp' ? t : 'image/png'
}
const outExt = () =>
  outMime() === 'image/jpeg' ? 'jpg' : outMime() === 'image/webp' ? 'webp' : 'png'
const downloadName = () => {
  const base = loaded.value?.file.name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}-cropped.${outExt()}`
}

async function onSelect(file: File) {
  error.value = ''
  sel.value = null
  natSel.value = null
  outputBlob.value = null
  try {
    loaded.value?.revoke()
    loaded.value = await loadImage(file)
  } catch (e) {
    error.value = (e as Error).message
    loaded.value = null
  }
}

function reset() {
  loaded.value?.revoke()
  loaded.value = null
  outputBlob.value = null
  sel.value = null
  natSel.value = null
}

function pointerPos(e: PointerEvent) {
  const r = stageEl.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function onDown(e: PointerEvent) {
  if (!imgEl.value) return
  dragging = true
  const p = pointerPos(e)
  startX = p.x
  startY = p.y
  sel.value = { x: p.x, y: p.y, width: 0, height: 0 }
  stageEl.value?.setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!dragging || !imgEl.value) return
  const p = pointerPos(e)
  sel.value = clampRect(
    normalizeRect(startX, startY, p.x, p.y),
    imgEl.value.clientWidth,
    imgEl.value.clientHeight,
  )
}

async function onUp() {
  dragging = false
  await crop()
}

async function crop() {
  const img = loaded.value
  const el = imgEl.value
  const s = sel.value
  if (!img || !el || !s || s.width < 2 || s.height < 2) {
    outputBlob.value = null
    natSel.value = null
    return
  }
  const factor = img.width / el.clientWidth
  const nat = clampRect(scaleRect(s, factor), img.width, img.height)
  natSel.value = nat
  const canvas = createCanvas(nat.width, nat.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(img.el, nat.x, nat.y, nat.width, nat.height, 0, 0, nat.width, nat.height)
  outputBlob.value = await canvasToBlob(canvas, outMime(), 0.92)
}
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="cr">
      <Skeleton variant="rect" width="100%" height="260px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!loaded"
      title="Crop an image"
      description="Drop an image, then drag on it to select the area to keep."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone class="cr__drop" @select="onSelect" />
      </template>
    </EmptyState>

    <div v-else class="cr">
      <div class="cr__left">
        <div
          ref="stageEl"
          class="cr__stage"
          @pointerdown="onDown"
          @pointermove="onMove"
          @pointerup="onUp"
        >
          <img
            ref="imgEl"
            :src="loaded.url"
            :alt="loaded.file.name"
            class="cr__img"
            draggable="false"
          />
          <div
            v-if="sel && sel.width > 0"
            class="cr__sel"
            :style="{
              left: `${sel.x}px`,
              top: `${sel.y}px`,
              width: `${sel.width}px`,
              height: `${sel.height}px`,
            }"
          />
        </div>
        <p class="cr__hint">Drag on the image to select an area to crop.</p>
      </div>

      <div class="cr__controls">
        <p v-if="natSel" class="cr__dims">Selection: {{ natSel.width }} × {{ natSel.height }} px</p>
        <p v-else class="cr__dims cr__dims--muted">No selection yet</p>

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

    <p v-if="error" class="cr__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.cr {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(240px, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.cr__stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  overflow: hidden;
  touch-action: none;
  cursor: crosshair;
  user-select: none;
}
.cr__img {
  max-width: 100%;
  max-height: 440px;
  height: auto;
  display: block;
}
.cr__sel {
  position: absolute;
  border: 2px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.cr__hint {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.cr__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cr__dims {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}
.cr__dims--muted {
  font-weight: 500;
  color: var(--text-tertiary);
}
.cr__drop {
  width: 100%;
}
.cr__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
@media (max-width: 720px) {
  .cr {
    grid-template-columns: 1fr;
  }
}
</style>
