<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import PdfPreview from '@/components/tool/PdfPreview.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { formatBytes } from '@/utils/fileSize'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-compress')!
const { loadPdfLib, openForRender, closeDoc, renderPageToCanvas, canvasToBlob, readBytes } =
  usePdf()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const busy = ref(false)
const progress = ref(0)
const total = ref(0)
const error = ref('')

const mode = ref<'rasterize' | 'lossless'>('rasterize')
const quality = ref(65)
const resolution = ref(100) // % of native page resolution

const modeOptions = [
  { value: 'rasterize', label: 'Strong (rasterize)' },
  { value: 'lossless', label: 'Lossless (keep text)' },
]

const originalSize = computed(() => sourceFile.value?.size ?? 0)
const outputSize = computed(() => outputBlob.value?.size ?? 0)
const reduction = computed(() =>
  originalSize.value && outputSize.value
    ? Math.round((1 - outputSize.value / originalSize.value) * 100)
    : 0,
)

function onSelect(file: File) {
  error.value = ''
  outputBlob.value = null
  sourceFile.value = file
}

function reset() {
  sourceFile.value = null
  outputBlob.value = null
  error.value = ''
  progress.value = 0
  total.value = 0
}

let runId = 0
async function run() {
  const file = sourceFile.value
  if (!file) return
  const myRun = ++runId
  busy.value = true
  error.value = ''
  outputBlob.value = null
  progress.value = 0
  try {
    const { PDFDocument } = await loadPdfLib()
    let bytes: Uint8Array

    if (mode.value === 'lossless') {
      const doc = await PDFDocument.load(await readBytes(file))
      bytes = await doc.save({ useObjectStreams: true })
    } else {
      const doc = await openForRender(file)
      total.value = doc.numPages
      const out = await PDFDocument.create()
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p)
        const pt = page.getViewport({ scale: 1 }) // page size in PDF points
        const canvas = await renderPageToCanvas(doc, p, resolution.value / 100)
        const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality.value / 100)
        const img = await out.embedJpg(new Uint8Array(await jpeg.arrayBuffer()))
        const newPage = out.addPage([pt.width, pt.height])
        newPage.drawImage(img, { x: 0, y: 0, width: pt.width, height: pt.height })
        if (myRun !== runId) return
        progress.value = p
      }
      await closeDoc(doc)
      bytes = await out.save()
    }

    if (myRun !== runId) return
    outputBlob.value = new Blob([bytes], { type: 'application/pdf' })
  } catch {
    if (myRun !== runId) return
    error.value = 'Could not compress this PDF. It may be encrypted or invalid.'
  } finally {
    if (myRun === runId) busy.value = false
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
      title="Compress a PDF"
      description="Drop a PDF — shrink it in your browser. Great for scans and image-heavy documents."
    >
      <template #icon><Icon :name="UI_ICON.emptyFile" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="cp__drop"
          accept="application/pdf,.pdf"
          hint="PDF file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="cp">
      <div class="cp__file">
        <p class="cp__source">{{ sourceFile.name }} · {{ formatBytes(originalSize) }}</p>
        <PdfPreview :file="sourceFile" />
      </div>

      <Field label="Method">
        <SegmentedControl v-model="mode" :options="modeOptions" full-width />
      </Field>

      <template v-if="mode === 'rasterize'">
        <Field label="Image quality">
          <Slider
            v-model="quality"
            :min="30"
            :max="90"
            :step="5"
            show-value
            :format-value="(v) => `${v}%`"
          />
        </Field>
        <Field label="Resolution">
          <Slider
            v-model="resolution"
            :min="50"
            :max="150"
            :step="10"
            show-value
            :format-value="(v) => `${v}%`"
          />
        </Field>
        <p class="cp__hint">
          Rasterizing renders each page to a compressed image — text becomes non-selectable.
        </p>
      </template>
      <p v-else class="cp__hint">
        Lossless keeps text and vectors intact by repacking the file. Savings are usually modest.
      </p>

      <div class="cp__actions">
        <Button variant="primary" :disabled="busy" @click="run">
          <template #icon><Icon :name="UI_ICON.magic" size="16" /></template>
          Compress PDF
        </Button>
        <Button variant="ghost" @click="reset">
          <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
          New file
        </Button>
      </div>

      <Progress
        v-if="busy && mode === 'rasterize'"
        :value="total ? (progress / total) * 100 : 0"
        :label="`Processing page ${progress} of ${total}…`"
      />
      <Progress v-else-if="busy" indeterminate label="Compressing…" />

      <div v-if="outputBlob" class="cp__result">
        <div class="cp__stats">
          <span class="cp__stat">{{ formatBytes(originalSize) }}</span>
          <Icon :name="UI_ICON.arrowRight" size="16" />
          <span class="cp__stat cp__stat--out">{{ formatBytes(outputSize) }}</span>
          <span class="cp__badge" :class="reduction > 0 ? 'cp__badge--good' : 'cp__badge--warn'">
            {{ reduction > 0 ? `−${reduction}%` : 'no smaller' }}
          </span>
        </div>
        <ResultActions :blob="outputBlob" filename="compressed.pdf" no-copy />
        <p v-if="reduction <= 0" class="cp__hint">
          This file didn’t get smaller — try the rasterize method or a lower quality.
        </p>
      </div>
    </div>

    <Alert v-if="error" tone="danger">{{ error }}</Alert>
  </ToolPage>
</template>

<style scoped>
.cp {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cp__file {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cp__source {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.cp__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.cp__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.cp__result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.cp__stats {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-secondary);
}
.cp__stat {
  font-size: 0.9375rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.cp__stat--out {
  color: var(--text-primary);
}
.cp__badge {
  margin-left: auto;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}
.cp__badge--good {
  background: color-mix(in srgb, var(--success) 18%, transparent);
  color: var(--success);
}
.cp__badge--warn {
  background: color-mix(in srgb, var(--warning) 18%, transparent);
  color: var(--warning);
}
.cp__drop {
  width: 100%;
}
</style>
