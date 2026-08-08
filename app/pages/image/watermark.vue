<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import {
  watermarkPlacement,
  WATERMARK_POSITIONS,
  type WatermarkPosition,
} from '@/utils/imageWatermark'
import type { LoadedImage } from '@/composables/useCanvasImage'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-watermark')!
const { loadImage } = useCanvasImage()

const ready = ref(false)
onMounted(() => (ready.value = true))

const loaded = shallowRef<LoadedImage | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const error = ref('')

const text = ref('© Your Name')
const position = ref<WatermarkPosition>('bottom-right')
const opacity = ref(60)
const fontScale = ref(5)
const color = ref('#ffffff')

async function onSelect(file: File) {
  error.value = ''
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
}

const downloadName = () => {
  const base = loaded.value?.file.name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}-watermarked.png`
}

async function redraw() {
  const img = loaded.value
  const canvas = canvasEl.value
  if (!img || !canvas) return
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img.el, 0, 0)

  if (text.value.trim()) {
    const fontPx = Math.max(8, (img.width * fontScale.value) / 100)
    const margin = fontPx * 0.6
    ctx.font = `600 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
    ctx.fillStyle = color.value
    ctx.globalAlpha = opacity.value / 100
    const p = watermarkPlacement(canvas.width, canvas.height, position.value, margin)
    ctx.textAlign = p.align
    ctx.textBaseline = p.baseline
    ctx.fillText(text.value, p.x, p.y)
    ctx.globalAlpha = 1
  }

  outputBlob.value = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
}

// Redraw on any change once the canvas exists.
watch([loaded, text, position, opacity, fontScale, color], () => nextTick(redraw), {
  immediate: true,
})
</script>

<template>
  <ToolPage :tool="tool">
    <!-- Loading -->
    <div v-if="!ready" class="wm">
      <Skeleton variant="rect" width="100%" height="260px" radius="12px" />
    </div>

    <!-- Empty: no image yet -->
    <EmptyState
      v-else-if="!loaded"
      title="Add an image to watermark"
      description="Drop a PNG or JPG below — everything runs in your browser, nothing is uploaded."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone class="wm__drop" @select="onSelect" />
      </template>
    </EmptyState>

    <!-- Result -->
    <div v-else class="wm">
      <div class="wm__preview">
        <canvas ref="canvasEl" class="wm__canvas" />
      </div>

      <div class="wm__controls">
        <Field label="Watermark text">
          <Input v-model="text" placeholder="© Your Name" />
        </Field>

        <Field label="Position">
          <div class="wm__grid" role="radiogroup" aria-label="Watermark position">
            <button
              v-for="pos in WATERMARK_POSITIONS"
              :key="pos"
              type="button"
              class="wm__cell"
              :class="{ 'wm__cell--active': position === pos }"
              :aria-label="pos.replace('-', ' ')"
              :aria-pressed="position === pos"
              @click="position = pos"
            >
              <span class="wm__dot" />
            </button>
          </div>
        </Field>

        <Field label="Opacity">
          <Slider
            v-model="opacity"
            :min="10"
            :max="100"
            :step="5"
            show-value
            :format-value="(v) => `${v}%`"
          />
        </Field>

        <Field label="Size">
          <Slider
            v-model="fontScale"
            :min="2"
            :max="20"
            :step="1"
            show-value
            :format-value="(v) => `${v}%`"
          />
        </Field>

        <Field label="Color">
          <input v-model="color" type="color" class="wm__color" aria-label="Watermark color" />
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

    <Alert v-if="error" tone="danger">{{ error }}</Alert>
  </ToolPage>
</template>

<style scoped>
.wm {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.wm__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: repeating-conic-gradient(var(--surface-sunken, #e9e9ef) 0% 25%, transparent 0% 50%)
    50% / 20px 20px;
}
.wm__canvas {
  max-width: 100%;
  max-height: 420px;
  height: auto;
  border-radius: 4px;
}
.wm__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.wm__drop {
  width: 100%;
}
.wm__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  width: 108px;
  aspect-ratio: 3 / 2;
}
.wm__cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--surface-card);
  cursor: pointer;
  padding: 0;
}
.wm__cell--active {
  border-color: var(--accent);
  background: var(--accent-subtle);
}
.wm__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-tertiary);
}
.wm__cell--active .wm__dot {
  background: var(--accent);
}
.wm__color {
  width: 48px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: none;
  cursor: pointer;
}
@media (max-width: 720px) {
  .wm {
    grid-template-columns: 1fr;
  }
}
</style>
