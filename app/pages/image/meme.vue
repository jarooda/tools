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
import { wrapLines } from '@/utils/memeText'
import type { LoadedImage } from '@/composables/useCanvasImage'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-meme')!
const { loadImage } = useCanvasImage()

const ready = ref(false)
onMounted(() => (ready.value = true))

const loaded = shallowRef<LoadedImage | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const error = ref('')

const topText = ref('Top text')
const bottomText = ref('Bottom text')
const fontScale = ref(10)

const downloadName = () => {
  const base = loaded.value?.file.name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}-meme.png`
}

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

function drawCaption(
  ctx: CanvasRenderingContext2D,
  text: string,
  canvasW: number,
  canvasH: number,
  fontPx: number,
  place: 'top' | 'bottom',
) {
  if (!text.trim()) return
  const maxWidth = canvasW * 0.92
  const lineHeight = fontPx * 1.1
  const margin = fontPx * 0.3
  ctx.font = `700 ${fontPx}px Impact, "Arial Black", "Helvetica Neue", sans-serif`
  ctx.textAlign = 'center'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(2, fontPx / 14)
  ctx.strokeStyle = '#000000'
  ctx.fillStyle = '#ffffff'

  const lines = wrapLines(text.toUpperCase(), maxWidth, (s) => ctx.measureText(s).width)
  const centerX = canvasW / 2

  lines.forEach((line, i) => {
    let y: number
    if (place === 'top') {
      ctx.textBaseline = 'top'
      y = margin + i * lineHeight
    } else {
      ctx.textBaseline = 'bottom'
      y = canvasH - margin - (lines.length - 1 - i) * lineHeight
    }
    ctx.strokeText(line, centerX, y)
    ctx.fillText(line, centerX, y)
  })
}

async function render() {
  const img = loaded.value
  const canvas = canvasEl.value
  if (!img || !canvas) return
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img.el, 0, 0)

  const fontPx = (img.width * fontScale.value) / 100
  drawCaption(ctx, topText.value, canvas.width, canvas.height, fontPx, 'top')
  drawCaption(ctx, bottomText.value, canvas.width, canvas.height, fontPx, 'bottom')

  outputBlob.value = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
}

watch([loaded, topText, bottomText, fontScale], () => nextTick(render), { immediate: true })
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="mm">
      <Skeleton variant="rect" width="100%" height="260px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!loaded"
      title="Make a meme"
      description="Drop an image, then add top and bottom captions — rendered right in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone class="mm__drop" @select="onSelect" />
      </template>
    </EmptyState>

    <div v-else class="mm">
      <div class="mm__preview">
        <canvas ref="canvasEl" class="mm__canvas" />
      </div>

      <div class="mm__controls">
        <Field label="Top text">
          <Input v-model="topText" placeholder="Top caption" />
        </Field>
        <Field label="Bottom text">
          <Input v-model="bottomText" placeholder="Bottom caption" />
        </Field>
        <Field label="Text size">
          <Slider
            v-model="fontScale"
            :min="5"
            :max="18"
            :step="1"
            show-value
            :format-value="(v) => `${v}%`"
          />
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
.mm {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.mm__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
}
.mm__canvas {
  max-width: 100%;
  max-height: 440px;
  height: auto;
  border-radius: 4px;
}
.mm__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mm__drop {
  width: 100%;
}
@media (max-width: 720px) {
  .mm {
    grid-template-columns: 1fr;
  }
}
</style>
