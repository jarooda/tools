<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { formatBytes } from '@/utils/fileSize'
import { PdfPageRangeError, parsePdfChunks, parsePdfPageGroups } from '@/utils/pdfPageRange'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-split')!
const { loadPdfLib, readBytes } = usePdf()
const { downloadBlob } = useDownload()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const pageCount = ref(0)
const busy = ref(false)
const error = ref('')

const mode = ref<'ranges' | 'every' | 'all'>('ranges')
const rangeSpec = ref('1')
const chunkSize = ref(1)

const modeOptions = [
  { value: 'ranges', label: 'Page ranges' },
  { value: 'every', label: 'Every N pages' },
  { value: 'all', label: 'Each page' },
]

interface Output {
  name: string
  blob: Blob
}
const outputs = ref<Output[]>([])
const baseName = computed(() => (sourceFile.value?.name || 'document').replace(/\.pdf$/i, ''))

async function onSelect(file: File) {
  error.value = ''
  outputs.value = []
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
  outputs.value = []
  pageCount.value = 0
  error.value = ''
}

function planGroups(): number[][] {
  if (mode.value === 'all') return parsePdfChunks(pageCount.value, 1)
  if (mode.value === 'every') return parsePdfChunks(pageCount.value, Math.max(1, chunkSize.value))
  return parsePdfPageGroups(rangeSpec.value, pageCount.value)
}

let runId = 0
async function run() {
  const file = sourceFile.value
  if (!file || !pageCount.value) return
  const myRun = ++runId
  busy.value = true
  error.value = ''
  outputs.value = []
  try {
    const groups = planGroups()
    const { PDFDocument } = await loadPdfLib()
    const src = await PDFDocument.load(await readBytes(file))
    const result: Output[] = []
    for (const group of groups) {
      const out = await PDFDocument.create()
      const pages = await out.copyPages(
        src,
        group.map((p) => p - 1),
      )
      pages.forEach((pg) => out.addPage(pg))
      const bytes = await out.save()
      const label = group.length === 1 ? `p${group[0]}` : `p${group[0]}-${group.at(-1)}`
      result.push({
        name: `${baseName.value}-${label}.pdf`,
        blob: new Blob([bytes], { type: 'application/pdf' }),
      })
    }
    if (myRun !== runId) return
    outputs.value = result
  } catch (e) {
    if (myRun !== runId) return
    error.value = e instanceof PdfPageRangeError ? e.message : 'Could not split this PDF.'
  } finally {
    if (myRun === runId) busy.value = false
  }
}

// Re-plan live as options change (but not the heavy split — that's on click).
watch([mode, rangeSpec, chunkSize], () => {
  outputs.value = []
  error.value = ''
})
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!sourceFile"
      title="Split a PDF"
      description="Drop a PDF, then extract page ranges or break it into separate files — all in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyFile" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="sp__drop"
          accept="application/pdf,.pdf"
          hint="PDF file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="sp">
      <p class="sp__source">
        {{ sourceFile.name }} · {{ pageCount }} page{{ pageCount === 1 ? '' : 's' }}
      </p>

      <Field label="Split mode">
        <SegmentedControl v-model="mode" :options="modeOptions" full-width />
      </Field>

      <Field
        v-if="mode === 'ranges'"
        label="Page ranges"
        hint="Comma-separated. Each range becomes its own PDF, e.g. 1-3, 4, 5-8."
      >
        <Input v-model="rangeSpec" placeholder="1-3, 4, 5-8" />
      </Field>

      <Field v-else-if="mode === 'every'" label="Pages per file">
        <NumberInput v-model="chunkSize" :min="1" :max="pageCount" :step="1" />
      </Field>

      <div class="sp__actions">
        <Button variant="primary" @click="run">
          <template #icon><Icon :name="UI_ICON.filePdf" size="16" /></template>
          Split PDF
        </Button>
        <Button variant="ghost" @click="reset">
          <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
          New file
        </Button>
      </div>

      <Progress v-if="busy" indeterminate label="Splitting…" />

      <ul v-if="outputs.length" class="sp__list">
        <li v-for="out in outputs" :key="out.name" class="sp__row">
          <Icon :name="UI_ICON.filePdf" size="18" class="sp__ic" />
          <span class="sp__name">{{ out.name }}</span>
          <span class="sp__size">{{ formatBytes(out.blob.size) }}</span>
          <Button variant="ghost" size="sm" @click="downloadBlob(out.blob, out.name)">
            <template #icon><Icon :name="UI_ICON.download" size="15" /></template>
            Save
          </Button>
        </li>
      </ul>
    </div>

    <p v-if="error" class="sp__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.sp {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.sp__source {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.sp__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.sp__list {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.sp__row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.sp__ic {
  flex: 0 0 auto;
  color: var(--danger, #d9534f);
}
.sp__name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}
.sp__size {
  flex: 0 0 auto;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
.sp__drop {
  width: 100%;
}
.sp__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
</style>
