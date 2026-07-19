<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import {
  IMAGE_FORMATS,
  outputFilename,
  formatFromMime,
  type ImageFormat,
} from '@/utils/imageFormat'
import type { LoadedImage } from '@/composables/useCanvasImage'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-convert')!
const { loadImage, createCanvas, canvasToBlob, canEncode } = useCanvasImage()

const ready = ref(false)
const encodable = ref<ImageFormat[]>(['png', 'jpeg', 'webp'])
onMounted(() => {
  encodable.value = (Object.keys(IMAGE_FORMATS) as ImageFormat[]).filter((f) =>
    canEncode(IMAGE_FORMATS[f].mime),
  )
  ready.value = true
})

const loaded = shallowRef<LoadedImage | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const error = ref('')

const format = ref<ImageFormat>('webp')
const quality = ref(85)

const formatOptions = computed(() =>
  encodable.value.map((f) => ({ value: f, label: IMAGE_FORMATS[f].label })),
)
const isLossy = computed(() => IMAGE_FORMATS[format.value].lossy)
const downloadName = () => outputFilename(loaded.value?.file.name || 'image', format.value)

async function onSelect(file: File) {
  error.value = ''
  try {
    loaded.value?.revoke()
    loaded.value = await loadImage(file)
    // Default the target to something different from the source.
    const src = formatFromMime(file.type)
    if (src === format.value) format.value = encodable.value.find((f) => f !== src) ?? format.value
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
  if (!img) return
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // Flatten onto white for JPEG (no alpha channel).
  if (format.value === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img.el, 0, 0)
  outputBlob.value = await canvasToBlob(
    canvas,
    IMAGE_FORMATS[format.value].mime,
    isLossy.value ? quality.value / 100 : undefined,
  )
}

const reduction = computed(() => {
  if (!loaded.value || !outputBlob.value) return null
  const before = loaded.value.file.size
  const after = outputBlob.value.size
  return Math.round((1 - after / before) * 100)
})

watch([loaded, format, quality], render, { immediate: true })
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="cv">
      <Skeleton variant="rect" width="100%" height="260px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!loaded"
      title="Convert an image"
      description="Drop a PNG, JPG, WebP, or AVIF — conversion happens entirely in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone class="cv__drop" @select="onSelect" />
      </template>
    </EmptyState>

    <div v-else class="cv">
      <div class="cv__preview">
        <img :src="loaded.url" :alt="loaded.file.name" class="cv__img" />
      </div>

      <div class="cv__controls">
        <Field label="Output format">
          <SegmentedControl v-model="format" :options="formatOptions" full-width />
        </Field>

        <Field v-if="isLossy" label="Quality">
          <Slider
            v-model="quality"
            :min="10"
            :max="100"
            :step="5"
            show-value
            :format-value="(v) => `${v}%`"
          />
        </Field>
        <p v-else class="cv__note">PNG is lossless — quality is fixed.</p>

        <p v-if="reduction != null" class="cv__stat">
          <span :class="reduction >= 0 ? 'cv__stat--down' : 'cv__stat--up'">
            {{ reduction >= 0 ? `${reduction}% smaller` : `${-reduction}% larger` }}
          </span>
          than the original
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

    <p v-if="error" class="cv__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.cv {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.cv__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
}
.cv__img {
  max-width: 100%;
  max-height: 400px;
  height: auto;
  border-radius: 4px;
}
.cv__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cv__note {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.cv__stat {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.cv__stat--down {
  font-weight: 700;
  color: var(--success-text, var(--success));
}
.cv__stat--up {
  font-weight: 700;
  color: var(--warning-text, var(--warning));
}
.cv__drop {
  width: 100%;
}
.cv__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
@media (max-width: 720px) {
  .cv {
    grid-template-columns: 1fr;
  }
}
</style>
