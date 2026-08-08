<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { IMAGE_FORMATS, outputFilename } from '@/utils/imageFormat'
import { formatBytes } from '@/utils/fileSize'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-heic-to-jpg')!

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const previewUrl = shallowRef<string | null>(null)
const busy = ref(false)
const error = ref('')

const format = ref<'jpeg' | 'png'>('jpeg')
const quality = ref(90)

const formatOptions = [
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
]
const downloadName = () => outputFilename(sourceFile.value?.name || 'photo', format.value)

function onSelect(file: File) {
  error.value = ''
  sourceFile.value = file
}

function reset() {
  sourceFile.value = null
  outputBlob.value = null
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
  error.value = ''
}

let runId = 0
async function convert() {
  const file = sourceFile.value
  if (!file) return
  const myRun = ++runId
  busy.value = true
  error.value = ''
  try {
    // Lazy-load the HEIC decoder (~1.5 MB WASM) only when actually needed,
    // so it never touches the base bundle. Everything stays in the browser.
    const heic2any = (await import('heic2any')).default
    const result = await heic2any({
      blob: file,
      toType: IMAGE_FORMATS[format.value].mime,
      quality: format.value === 'jpeg' ? quality.value / 100 : undefined,
    })
    if (myRun !== runId) return // a newer conversion superseded this one
    const blob = Array.isArray(result) ? result[0]! : result
    outputBlob.value = blob
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(blob)
  } catch {
    if (myRun !== runId) return
    error.value = 'Could not convert this file. Make sure it’s a valid HEIC/HEIF image.'
    outputBlob.value = null
  } finally {
    if (myRun === runId) busy.value = false
  }
}

watch([sourceFile, format, quality], convert)
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="hc">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!sourceFile"
      title="Convert HEIC to JPG"
      description="Drop an Apple HEIC/HEIF photo — it’s decoded and converted entirely in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="hc__drop"
          accept=".heic,.heif,image/heic,image/heif"
          hint="HEIC / HEIF"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="hc">
      <div class="hc__preview">
        <Progress v-if="busy" indeterminate label="Converting…" class="hc__progress" />
        <img v-else-if="previewUrl" :src="previewUrl" alt="Converted preview" class="hc__img" />
      </div>

      <div class="hc__controls">
        <p class="hc__source">{{ sourceFile.name }} · {{ formatBytes(sourceFile.size) }}</p>

        <Field label="Output format">
          <SegmentedControl v-model="format" :options="formatOptions" full-width />
        </Field>

        <Field v-if="format === 'jpeg'" label="Quality">
          <Slider
            v-model="quality"
            :min="40"
            :max="100"
            :step="5"
            show-value
            :format-value="(v) => `${v}%`"
          />
        </Field>

        <ResultActions :blob="outputBlob" :filename="downloadName()">
          <template #extra>
            <Button variant="ghost" size="sm" @click="reset">
              <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
              New file
            </Button>
          </template>
        </ResultActions>
      </div>
    </div>

    <Alert v-if="error" tone="danger">{{ error }}</Alert>
  </ToolPage>
</template>

<style scoped>
.hc {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.hc__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
}
.hc__progress {
  width: 80%;
}
.hc__img {
  max-width: 100%;
  max-height: 420px;
  height: auto;
  border-radius: 4px;
}
.hc__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.hc__source {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.hc__drop {
  width: 100%;
}
@media (max-width: 720px) {
  .hc {
    grid-template-columns: 1fr;
  }
}
</style>
