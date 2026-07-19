<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { formatBytes } from '@/utils/fileSize'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-to-images')!
const { openForRender, renderPageToCanvas, canvasToBlob } = usePdf()
const { downloadBlob } = useDownload()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const busy = ref(false)
const progress = ref(0)
const total = ref(0)
const error = ref('')

const format = ref<'png' | 'jpeg'>('png')
const quality = ref(92)
const scale = ref(150) // % of the native PDF page size

const formatOptions = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
]

interface Output {
  page: number
  url: string
  blob: Blob
}
const outputs = ref<Output[]>([])
const baseName = computed(() => (sourceFile.value?.name || 'page').replace(/\.pdf$/i, ''))
const ext = computed(() => (format.value === 'png' ? 'png' : 'jpg'))

function revokeOutputs() {
  outputs.value.forEach((o) => URL.revokeObjectURL(o.url))
  outputs.value = []
}

function onSelect(file: File) {
  error.value = ''
  revokeOutputs()
  sourceFile.value = file
}

function reset() {
  revokeOutputs()
  sourceFile.value = null
  error.value = ''
  progress.value = 0
  total.value = 0
}

let runId = 0
async function render() {
  const file = sourceFile.value
  if (!file) return
  const myRun = ++runId
  busy.value = true
  error.value = ''
  revokeOutputs()
  progress.value = 0
  try {
    const doc = await openForRender(file)
    total.value = doc.numPages
    const mime = format.value === 'png' ? 'image/png' : 'image/jpeg'
    const q = format.value === 'jpeg' ? quality.value / 100 : undefined
    const result: Output[] = []
    for (let p = 1; p <= doc.numPages; p++) {
      const canvas = await renderPageToCanvas(doc, p, scale.value / 100)
      const blob = await canvasToBlob(canvas, mime, q)
      if (myRun !== runId) return
      result.push({ page: p, blob, url: URL.createObjectURL(blob) })
      progress.value = p
    }
    doc.destroy()
    if (myRun !== runId) return
    outputs.value = result
  } catch {
    if (myRun !== runId) return
    error.value = 'Could not render this PDF. It may be encrypted or invalid.'
  } finally {
    if (myRun === runId) busy.value = false
  }
}

function downloadAll() {
  for (const o of outputs.value) {
    downloadBlob(o.blob, `${baseName.value}-p${o.page}.${ext.value}`)
  }
}
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!sourceFile"
      title="PDF to images"
      description="Drop a PDF — each page is rendered to a PNG or JPG in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyFile" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="ti__drop"
          accept="application/pdf,.pdf"
          hint="PDF file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="ti">
      <p class="ti__source">{{ sourceFile.name }}</p>

      <div class="ti__opts">
        <Field label="Format">
          <SegmentedControl v-model="format" :options="formatOptions" full-width />
        </Field>
        <Field label="Resolution">
          <Slider
            v-model="scale"
            :min="75"
            :max="300"
            :step="25"
            show-value
            :format-value="(v) => `${v}%`"
          />
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
      </div>

      <div class="ti__actions">
        <Button variant="primary" :disabled="busy" @click="render">
          <template #icon><Icon :name="UI_ICON.magic" size="16" /></template>
          Render pages
        </Button>
        <Button v-if="outputs.length" variant="secondary" @click="downloadAll">
          <template #icon><Icon :name="UI_ICON.download" size="15" /></template>
          Download all
        </Button>
        <Button variant="ghost" @click="reset">
          <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
          New file
        </Button>
      </div>

      <Progress
        v-if="busy"
        :value="total ? (progress / total) * 100 : 0"
        :label="`Rendering page ${progress} of ${total}…`"
      />

      <ul v-if="outputs.length" class="ti__grid">
        <li v-for="o in outputs" :key="o.page" class="ti__cell">
          <div class="ti__thumb"><img :src="o.url" :alt="`Page ${o.page}`" loading="lazy" /></div>
          <div class="ti__meta">
            <span class="ti__page">Page {{ o.page }}</span>
            <span class="ti__size">{{ formatBytes(o.blob.size) }}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            @click="downloadBlob(o.blob, `${baseName}-p${o.page}.${ext}`)"
          >
            <template #icon><Icon :name="UI_ICON.download" size="14" /></template>
            Save
          </Button>
        </li>
      </ul>
    </div>

    <p v-if="error" class="ti__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.ti {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ti__source {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.ti__opts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}
.ti__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ti__grid {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}
.ti__cell {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.ti__thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface-sunken, #f4f4f8);
}
.ti__thumb img {
  max-width: 100%;
  max-height: 160px;
  object-fit: contain;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}
.ti__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}
.ti__page {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.ti__size {
  font-size: 0.72rem;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
.ti__drop {
  width: 100%;
}
.ti__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
</style>
