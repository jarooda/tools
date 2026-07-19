<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { rotateBy, rotatedDimensions, type Rotation } from '@/utils/imageTransform'
import type { LoadedImage } from '@/composables/useCanvasImage'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-rotate')!
const { loadImage, createCanvas, canvasToBlob } = useCanvasImage()

const ready = ref(false)
onMounted(() => (ready.value = true))

const loaded = shallowRef<LoadedImage | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const error = ref('')

const rotation = ref<Rotation>(0)
const flipH = ref(false)
const flipV = ref(false)

const outMime = () => {
  const t = loaded.value?.file.type
  return t === 'image/jpeg' || t === 'image/webp' ? t : 'image/png'
}
const outExt = () =>
  outMime() === 'image/jpeg' ? 'jpg' : outMime() === 'image/webp' ? 'webp' : 'png'
const downloadName = () => {
  const base = loaded.value?.file.name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}-rotated.${outExt()}`
}

async function onSelect(file: File) {
  error.value = ''
  rotation.value = 0
  flipH.value = false
  flipV.value = false
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

async function render() {
  const img = loaded.value
  const display = canvasEl.value
  if (!img || !display) return
  const dims = rotatedDimensions(img.width, img.height, rotation.value)

  const canvas = createCanvas(dims.width, dims.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotation.value * Math.PI) / 180)
  ctx.scale(flipH.value ? -1 : 1, flipV.value ? -1 : 1)
  ctx.drawImage(img.el, -img.width / 2, -img.height / 2)

  // Mirror onto the visible preview canvas.
  display.width = canvas.width
  display.height = canvas.height
  display.getContext('2d')?.drawImage(canvas, 0, 0)

  outputBlob.value = await canvasToBlob(canvas, outMime(), 0.92)
}

watch([loaded, rotation, flipH, flipV], () => nextTick(render), { immediate: true })
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="rt">
      <Skeleton variant="rect" width="100%" height="260px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!loaded"
      title="Rotate or flip an image"
      description="Drop an image to turn it in 90° steps or mirror it — all in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone class="rt__drop" @select="onSelect" />
      </template>
    </EmptyState>

    <div v-else class="rt">
      <div class="rt__preview">
        <canvas ref="canvasEl" class="rt__canvas" />
      </div>

      <div class="rt__controls">
        <Field label="Rotate">
          <div class="rt__row">
            <Button variant="secondary" size="sm" @click="rotation = rotateBy(rotation, -90)">
              <template #icon><Icon :name="UI_ICON.rotateLeft" size="16" /></template>
              Left
            </Button>
            <Button variant="secondary" size="sm" @click="rotation = rotateBy(rotation, 90)">
              <template #icon><Icon :name="UI_ICON.rotateRight" size="16" /></template>
              Right
            </Button>
          </div>
        </Field>

        <Field label="Flip">
          <div class="rt__row">
            <Button :variant="flipH ? 'primary' : 'secondary'" size="sm" @click="flipH = !flipH">
              <template #icon><Icon :name="UI_ICON.flipHorizontal" size="16" /></template>
              Horizontal
            </Button>
            <Button :variant="flipV ? 'primary' : 'secondary'" size="sm" @click="flipV = !flipV">
              <template #icon><Icon :name="UI_ICON.flipVertical" size="16" /></template>
              Vertical
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

    <p v-if="error" class="rt__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.rt {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(240px, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.rt__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
}
.rt__canvas {
  max-width: 100%;
  max-height: 420px;
  height: auto;
  border-radius: 4px;
}
.rt__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.rt__row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.rt__drop {
  width: 100%;
}
.rt__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
@media (max-width: 720px) {
  .rt {
    grid-template-columns: 1fr;
  }
}
</style>
