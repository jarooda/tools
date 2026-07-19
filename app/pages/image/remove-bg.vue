<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-remove-bg')!

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const originalUrl = shallowRef<string | null>(null)
const resultUrl = shallowRef<string | null>(null)
const resultBlob = shallowRef<Blob | null>(null)
const busy = ref(false)
const error = ref('')
const progress = ref<{ label: string; pct: number | null }>({ label: '', pct: null })

// Model quality vs. download size trade-off (isnet ≈ best/largest).
const model = ref<'isnet_quint8' | 'isnet_fp16' | 'isnet'>('isnet_fp16')
const modelOptions = [
  { value: 'isnet_quint8', label: 'Fast' },
  { value: 'isnet_fp16', label: 'Balanced' },
  { value: 'isnet', label: 'Best' },
]

const downloadName = () => {
  const base = sourceFile.value?.name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}-no-bg.png`
}

function onSelect(file: File) {
  error.value = ''
  clearResult()
  sourceFile.value = file
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  originalUrl.value = URL.createObjectURL(file)
}

function clearResult() {
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  resultUrl.value = null
  resultBlob.value = null
}

function reset() {
  clearResult()
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  originalUrl.value = null
  sourceFile.value = null
  error.value = ''
}

async function run() {
  const file = sourceFile.value
  if (!file) return
  busy.value = true
  error.value = ''
  clearResult()
  progress.value = { label: 'Loading model', pct: null }
  try {
    // Lazy-load the segmentation model + ONNX runtime only on demand. The image
    // is processed locally in the browser; only the model weights are fetched.
    const { removeBackground } = await import('@imgly/background-removal')
    const blob = await removeBackground(file, {
      model: model.value,
      output: { format: 'image/png' },
      progress: (key: string, current: number, total: number) => {
        const label = key.startsWith('fetch') ? 'Downloading model' : 'Removing background'
        progress.value = { label, pct: total ? Math.round((current / total) * 100) : null }
      },
    })
    resultBlob.value = blob
    resultUrl.value = URL.createObjectURL(blob)
  } catch {
    error.value = 'Background removal failed. Try a different image or model quality.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="rb">
      <Skeleton variant="rect" width="100%" height="260px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!sourceFile"
      title="Remove an image background"
      description="Drop an image — the cutout runs on a model in your browser. The first run downloads the model (a few MB)."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone class="rb__drop" @select="onSelect" />
      </template>
    </EmptyState>

    <div v-else class="rb">
      <div class="rb__stage">
        <div class="rb__panel">
          <span class="rb__panel-label">Original</span>
          <div class="rb__frame">
            <img :src="originalUrl!" alt="Original" class="rb__img" />
          </div>
        </div>
        <div class="rb__panel">
          <span class="rb__panel-label">Result</span>
          <div class="rb__frame rb__frame--checker">
            <div v-if="busy" class="rb__progress">
              <Progress
                :indeterminate="progress.pct == null"
                :value="progress.pct ?? 0"
                :label="progress.label"
                show-value
              />
            </div>
            <img v-else-if="resultUrl" :src="resultUrl" alt="Background removed" class="rb__img" />
            <span v-else class="rb__placeholder">Not processed yet</span>
          </div>
        </div>
      </div>

      <div class="rb__controls">
        <Field label="Model quality">
          <SegmentedControl v-model="model" :options="modelOptions" :disabled="busy" full-width />
        </Field>

        <div class="rb__actions">
          <Button variant="primary" :disabled="busy" @click="run">
            <template #icon><Icon :name="UI_ICON.magic" size="16" /></template>
            {{ busy ? 'Working…' : resultUrl ? 'Run again' : 'Remove background' }}
          </Button>
          <Button variant="ghost" :disabled="busy" @click="reset">
            <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
            New image
          </Button>
        </div>

        <ResultActions v-if="resultBlob" :blob="resultBlob" :filename="downloadName()" />
      </div>
    </div>

    <p v-if="error" class="rb__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.rb {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.rb__stage {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.rb__panel {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.rb__panel-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.rb__frame {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
}
.rb__frame--checker {
  background: repeating-conic-gradient(var(--surface-sunken, #e9e9ef) 0% 25%, transparent 0% 50%)
    50% / 20px 20px;
}
.rb__img {
  max-width: 100%;
  max-height: 340px;
  height: auto;
  border-radius: 4px;
}
.rb__progress {
  width: 85%;
}
.rb__placeholder {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.rb__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.rb__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.rb__drop {
  width: 100%;
}
.rb__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
@media (max-width: 720px) {
  .rb__stage {
    grid-template-columns: 1fr;
  }
}
</style>
