<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import PdfPreview from '@/components/tool/PdfPreview.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { PdfPageRangeError, parsePdfPageList } from '@/utils/pdfPageRange'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-rotate')!
const { loadPdfLib, readBytes } = usePdf()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const pageCount = ref(0)
const outputBlob = shallowRef<Blob | null>(null)
const busy = ref(false)
const error = ref('')

const angle = ref<'90' | '180' | '270'>('90')
const scope = ref<'all' | 'some'>('all')
const rangeSpec = ref('')

const angleOptions = [
  { value: '90', label: '90° ↻' },
  { value: '180', label: '180°' },
  { value: '270', label: '90° ↺' },
]
const scopeOptions = [
  { value: 'all', label: 'All pages' },
  { value: 'some', label: 'Specific pages' },
]

async function onSelect(file: File) {
  error.value = ''
  outputBlob.value = null
  sourceFile.value = file
  try {
    const { PDFDocument } = await loadPdfLib()
    const doc = await PDFDocument.load(await readBytes(file))
    pageCount.value = doc.getPageCount()
    rangeSpec.value = `1-${pageCount.value}`
  } catch {
    error.value = 'Could not read this PDF. It may be encrypted or invalid.'
    sourceFile.value = null
  }
}

function reset() {
  sourceFile.value = null
  outputBlob.value = null
  pageCount.value = 0
  error.value = ''
}

/**
 * Pages the current scope targets, as a Set for the preview to test against.
 * Invalid range input simply previews nothing rather than throwing.
 */
const targetPages = computed(() => {
  if (!pageCount.value) return new Set<number>()
  if (scope.value === 'all') {
    return new Set(Array.from({ length: pageCount.value }, (_, i) => i + 1))
  }
  try {
    return new Set(parsePdfPageList(rangeSpec.value, pageCount.value))
  } catch {
    return new Set<number>()
  }
})

/** Live preview rotation — only the pages this run would actually turn. */
function previewRotation(page: number) {
  return targetPages.value.has(page) ? Number(angle.value) : 0
}

const summary = computed(() =>
  scope.value === 'all'
    ? `Rotating all ${pageCount.value} pages`
    : `Rotating pages: ${rangeSpec.value || '—'}`,
)

async function run() {
  const file = sourceFile.value
  if (!file || !pageCount.value) return
  busy.value = true
  error.value = ''
  outputBlob.value = null
  try {
    const targets =
      scope.value === 'all'
        ? Array.from({ length: pageCount.value }, (_, i) => i + 1)
        : parsePdfPageList(rangeSpec.value, pageCount.value)
    if (!targets.length) throw new PdfPageRangeError('Enter at least one page to rotate.')

    const { PDFDocument, degrees } = await loadPdfLib()
    const doc = await PDFDocument.load(await readBytes(file))
    const pages = doc.getPages()
    const turn = Number(angle.value)
    for (const p of targets) {
      const page = pages[p - 1]!
      const current = page.getRotation().angle
      page.setRotation(degrees((current + turn) % 360))
    }
    const bytes = await doc.save()
    outputBlob.value = new Blob([bytes], { type: 'application/pdf' })
  } catch (e) {
    error.value = e instanceof PdfPageRangeError ? e.message : 'Could not rotate this PDF.'
  } finally {
    busy.value = false
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
      title="Rotate PDF pages"
      description="Drop a PDF and turn some or all pages in 90° steps — all in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyFile" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="rt__drop"
          accept="application/pdf,.pdf"
          hint="PDF file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="rt">
      <div class="rt__file">
        <p class="rt__source">
          {{ sourceFile.name }} · {{ pageCount }} page{{ pageCount === 1 ? '' : 's' }}
        </p>
        <PdfPreview :file="sourceFile" :rotation-for="previewRotation" />
      </div>

      <Field label="Rotation">
        <SegmentedControl v-model="angle" :options="angleOptions" full-width />
      </Field>

      <Field label="Apply to">
        <SegmentedControl v-model="scope" :options="scopeOptions" full-width />
      </Field>

      <Field
        v-if="scope === 'some'"
        label="Pages"
        hint="Comma-separated pages and ranges, e.g. 1, 3-4, 8."
      >
        <Input v-model="rangeSpec" placeholder="1, 3-4, 8" />
      </Field>

      <p class="rt__summary">{{ summary }}</p>

      <div class="rt__actions">
        <Button variant="primary" :disabled="busy" @click="run">
          <template #icon><Icon :name="UI_ICON.rotateRight" size="16" /></template>
          Rotate
        </Button>
        <Button variant="ghost" @click="reset">
          <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
          New file
        </Button>
      </div>

      <Progress v-if="busy" indeterminate label="Rotating…" />

      <ResultActions v-if="outputBlob" :blob="outputBlob" filename="rotated.pdf" no-copy />
    </div>

    <p v-if="error" class="rt__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.rt {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.rt__file {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.rt__source {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.rt__summary {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}
.rt__actions {
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
</style>
