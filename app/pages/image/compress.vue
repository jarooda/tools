<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Slider } from '@/components/ui/slider'
import { NumberInput } from '@/components/ui/number-input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { IMAGE_FORMATS, outputFilename, type ImageFormat } from '@/utils/imageFormat'
import { formatBytes, percentSmaller } from '@/utils/fileSize'
import type { LoadedImage } from '@/composables/useCanvasImage'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-compress')!
const { loadImage, createCanvas, canvasToBlob, canEncode } = useCanvasImage()

const ready = ref(false)
const canWebp = ref(true)
onMounted(() => {
  canWebp.value = canEncode('image/webp')
  if (!canWebp.value) format.value = 'jpeg'
  ready.value = true
})

const loaded = shallowRef<LoadedImage | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const busy = ref(false)
const error = ref('')

const mode = ref<'quality' | 'target'>('quality')
const format = ref<Exclude<ImageFormat, 'png'>>('webp')
const quality = ref(70)
const targetKb = ref<number | null>(200)

const modeOptions = [
  { value: 'quality', label: 'Quality' },
  { value: 'target', label: 'Target size' },
]
const formatOptions = computed(() =>
  (['webp', 'jpeg'] as const)
    .filter((f) => f !== 'webp' || canWebp.value)
    .map((f) => ({ value: f, label: IMAGE_FORMATS[f].label })),
)
const reduction = computed(() =>
  loaded.value && outputBlob.value
    ? percentSmaller(loaded.value.file.size, outputBlob.value.size)
    : null,
)
const downloadName = () => outputFilename(loaded.value?.file.name || 'image', format.value)

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

function drawn(): HTMLCanvasElement | null {
  const img = loaded.value
  if (!img) return null
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  if (format.value === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img.el, 0, 0)
  return canvas
}

/** Binary-search the quality that lands just under the target byte budget. */
async function compressToTarget(
  canvas: HTMLCanvasElement,
  mime: string,
  targetBytes: number,
): Promise<Blob> {
  let lo = 0.05
  let hi = 0.95
  let best = await canvasToBlob(canvas, mime, hi)
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2
    const blob = await canvasToBlob(canvas, mime, mid)
    if (blob.size > targetBytes) {
      hi = mid
    } else {
      best = blob
      lo = mid
    }
  }
  return best
}

async function render() {
  const canvas = drawn()
  if (!canvas) return
  busy.value = true
  try {
    const mime = IMAGE_FORMATS[format.value].mime
    outputBlob.value =
      mode.value === 'target' && targetKb.value
        ? await compressToTarget(canvas, mime, targetKb.value * 1024)
        : await canvasToBlob(canvas, mime, quality.value / 100)
  } finally {
    busy.value = false
  }
}

watch([loaded, mode, format, quality, targetKb], render, { immediate: true })
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="cp">
      <Skeleton variant="rect" width="100%" height="260px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!loaded"
      title="Compress an image"
      description="Drop an image to shrink its file size — nothing is uploaded to a server."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone class="cp__drop" @select="onSelect" />
      </template>
    </EmptyState>

    <div v-else class="cp">
      <div class="cp__preview">
        <img :src="loaded.url" :alt="loaded.file.name" class="cp__img" />
        <span class="cp__orig">Original: {{ formatBytes(loaded.file.size) }}</span>
      </div>

      <div class="cp__controls">
        <Field label="Mode">
          <SegmentedControl v-model="mode" :options="modeOptions" full-width />
        </Field>

        <Field label="Output format">
          <SegmentedControl v-model="format" :options="formatOptions" full-width />
        </Field>

        <Field v-if="mode === 'quality'" label="Quality">
          <Slider
            v-model="quality"
            :min="10"
            :max="95"
            :step="5"
            show-value
            :format-value="(v) => `${v}%`"
          />
        </Field>
        <Field v-else label="Target size (KB)">
          <NumberInput v-model="targetKb" :min="5" :step="10" />
        </Field>

        <p v-if="reduction != null" class="cp__stat">
          <span :class="reduction >= 0 ? 'cp__stat--down' : 'cp__stat--up'">
            {{ reduction >= 0 ? `${reduction}% smaller` : `${-reduction}% larger` }}
          </span>
          <span v-if="busy" class="cp__busy">· compressing…</span>
        </p>

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

    <p v-if="error" class="cp__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.cp {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.cp__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
}
.cp__img {
  max-width: 100%;
  max-height: 400px;
  height: auto;
  border-radius: 4px;
}
.cp__orig {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.cp__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cp__stat {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.cp__stat--down {
  font-weight: 700;
  color: var(--success-text, var(--success));
}
.cp__stat--up {
  font-weight: 700;
  color: var(--warning-text, var(--warning));
}
.cp__busy {
  color: var(--text-tertiary);
}
.cp__drop {
  width: 100%;
}
.cp__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
@media (max-width: 720px) {
  .cp {
    grid-template-columns: 1fr;
  }
}
</style>
