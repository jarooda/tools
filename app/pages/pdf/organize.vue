<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-organize')!
const { loadPdfLib, readBytes, openForRender, closeDoc, renderPageToCanvas, canvasToBlob } =
  usePdf()

const ready = ref(false)
onMounted(() => (ready.value = true))

interface PageThumb {
  /** Original 0-based page index in the source PDF. */
  original: number
  url: string
}
const sourceFile = shallowRef<File | null>(null)
const pages = ref<PageThumb[]>([])
const outputBlob = shallowRef<Blob | null>(null)
const loading = ref(false)
const building = ref(false)
const progress = ref(0)
const total = ref(0)
const error = ref('')

const dirty = ref(false)
const canApply = computed(() => pages.value.length > 0 && dirty.value)

function revokeThumbs() {
  pages.value.forEach((p) => URL.revokeObjectURL(p.url))
  pages.value = []
}

async function onSelect(file: File) {
  error.value = ''
  revokeThumbs()
  outputBlob.value = null
  dirty.value = false
  sourceFile.value = file
  loading.value = true
  progress.value = 0
  try {
    const doc = await openForRender(file)
    total.value = doc.numPages
    const thumbs: PageThumb[] = []
    for (let p = 1; p <= doc.numPages; p++) {
      const canvas = await renderPageToCanvas(doc, p, 0.4)
      const blob = await canvasToBlob(canvas, 'image/png')
      thumbs.push({ original: p - 1, url: URL.createObjectURL(blob) })
      progress.value = p
    }
    await closeDoc(doc)
    pages.value = thumbs
  } catch {
    error.value = 'Could not open this PDF. It may be encrypted or invalid.'
    sourceFile.value = null
  } finally {
    loading.value = false
  }
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= pages.value.length) return
  const next = pages.value.slice()
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row!)
  pages.value = next
  dirty.value = true
  outputBlob.value = null
}

function removePage(index: number) {
  URL.revokeObjectURL(pages.value[index]!.url)
  pages.value.splice(index, 1)
  dirty.value = true
  outputBlob.value = null
}

function reset() {
  revokeThumbs()
  sourceFile.value = null
  outputBlob.value = null
  dirty.value = false
  error.value = ''
}

async function apply() {
  const file = sourceFile.value
  if (!file || !pages.value.length) return
  building.value = true
  error.value = ''
  try {
    const { PDFDocument } = await loadPdfLib()
    const src = await PDFDocument.load(await readBytes(file))
    const out = await PDFDocument.create()
    const order = pages.value.map((p) => p.original)
    const copied = await out.copyPages(src, order)
    copied.forEach((pg) => out.addPage(pg))
    const bytes = await out.save()
    outputBlob.value = new Blob([bytes], { type: 'application/pdf' })
    dirty.value = false
  } catch {
    error.value = 'Could not save the reorganized PDF.'
  } finally {
    building.value = false
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
      title="Organize pages"
      description="Drop a PDF, then reorder or delete pages on a thumbnail grid — all in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyFile" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="og__drop"
          accept="application/pdf,.pdf"
          hint="PDF file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else-if="loading" class="og__loading">
      <Progress
        :value="total ? (progress / total) * 100 : 0"
        :label="`Loading page ${progress} of ${total}…`"
      />
    </div>

    <div v-else class="og">
      <div class="og__bar">
        <span class="og__count">{{ pages.length }} page{{ pages.length === 1 ? '' : 's' }}</span>
        <div class="og__bar-actions">
          <Button variant="ghost" size="sm" @click="reset">
            <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
            New file
          </Button>
        </div>
      </div>

      <ul v-if="pages.length" class="og__grid">
        <li v-for="(page, i) in pages" :key="page.original" class="og__cell">
          <div class="og__thumb"><img :src="page.url" :alt="`Page ${page.original + 1}`" /></div>
          <span class="og__pos">{{ i + 1 }}</span>
          <div class="og__cell-actions">
            <IconButton
              variant="ghost"
              size="sm"
              :disabled="i === 0"
              aria-label="Move earlier"
              @click="move(i, -1)"
            >
              <Icon :name="UI_ICON.arrowUp" size="15" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              :disabled="i === pages.length - 1"
              aria-label="Move later"
              @click="move(i, 1)"
            >
              <Icon :name="UI_ICON.arrowDown" size="15" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              class="og__iconbtn--danger"
              aria-label="Delete page"
              @click="removePage(i)"
            >
              <Icon :name="UI_ICON.trash" size="15" />
            </IconButton>
          </div>
        </li>
      </ul>

      <EmptyState
        v-else
        title="No pages left"
        description="You’ve removed every page. Start over to load a PDF again."
      >
        <template #icon><Icon :name="UI_ICON.trash" size="24" /></template>
      </EmptyState>

      <Progress v-if="building" indeterminate label="Saving…" />

      <div v-if="pages.length" class="og__footer">
        <Button v-if="canApply" variant="primary" :disabled="building" @click="apply">
          <template #icon><Icon :name="UI_ICON.check" size="16" /></template>
          Apply changes
        </Button>
        <ResultActions v-if="outputBlob" :blob="outputBlob" filename="organized.pdf" no-copy />
      </div>
    </div>

    <Alert v-if="error" tone="danger">{{ error }}</Alert>
  </ToolPage>
</template>

<style scoped>
.og {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.og__loading {
  padding: 1rem 0;
}
.og__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.og__count {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.og__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}
.og__cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.og__thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface-sunken, #f4f4f8);
}
.og__thumb img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}
.og__pos {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--accent, #4c6ef5);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
}
.og__cell-actions {
  display: flex;
  justify-content: center;
  gap: 0.15rem;
}
.og__iconbtn--danger:hover:not(:disabled) {
  color: var(--danger, #d9534f);
}
.og__footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.og__drop {
  width: 100%;
}
</style>
