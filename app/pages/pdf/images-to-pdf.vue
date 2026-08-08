<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-images-to-pdf')!
const { loadPdfLib, readBytes } = usePdf()
const { loadImage, createCanvas, canvasToBlob } = useCanvasImage()

const ready = ref(false)
onMounted(() => (ready.value = true))

interface Item {
  id: number
  file: File
  url: string
}
let nextId = 0
const items = ref<Item[]>([])
const outputBlob = shallowRef<Blob | null>(null)
const busy = ref(false)
const error = ref('')

const pageSize = ref<'fit' | 'a4' | 'letter'>('fit')
const orientation = ref<'auto' | 'portrait' | 'landscape'>('auto')

const sizeOptions = [
  { value: 'fit', label: 'Match image' },
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
]
const orientOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
]
// Page dimensions in PDF points (72 pt = 1 inch).
const PAGE_DIMS = { a4: [595.28, 841.89], letter: [612, 792] } as const

function addFiles(files: File[]) {
  error.value = ''
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      items.value.push({ id: nextId++, file, url: URL.createObjectURL(file) })
    }
  }
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= items.value.length) return
  const next = items.value.slice()
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row!)
  items.value = next
}

function removeAt(index: number) {
  URL.revokeObjectURL(items.value[index]!.url)
  items.value.splice(index, 1)
}

function reset() {
  items.value.forEach((i) => URL.revokeObjectURL(i.url))
  items.value = []
  outputBlob.value = null
  error.value = ''
}

/** Get JPG/PNG bytes for pdf-lib, transcoding other formats to PNG via canvas. */
async function encodeForPdf(file: File): Promise<{ bytes: Uint8Array; kind: 'jpg' | 'png' }> {
  const type = file.type
  if (type === 'image/jpeg') return { bytes: await readBytes(file), kind: 'jpg' }
  if (type === 'image/png') return { bytes: await readBytes(file), kind: 'png' }
  const img = await loadImage(file)
  const canvas = createCanvas(img.width, img.height)
  canvas.getContext('2d')!.drawImage(img.el, 0, 0)
  img.revoke()
  const blob = await canvasToBlob(canvas, 'image/png')
  return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: 'png' }
}

let runId = 0
async function build() {
  outputBlob.value = null
  if (!items.value.length) return
  const myRun = ++runId
  busy.value = true
  error.value = ''
  try {
    const { PDFDocument } = await loadPdfLib()
    const pdf = await PDFDocument.create()
    for (const { file } of items.value) {
      const { bytes, kind } = await encodeForPdf(file)
      const img = kind === 'jpg' ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes)

      let pw: number
      let ph: number
      if (pageSize.value === 'fit') {
        pw = img.width
        ph = img.height
      } else {
        const [a, b] = PAGE_DIMS[pageSize.value]
        const landscape =
          orientation.value === 'landscape' ||
          (orientation.value === 'auto' && img.width > img.height)
        pw = landscape ? b : a
        ph = landscape ? a : b
      }

      const page = pdf.addPage([pw, ph])
      if (pageSize.value === 'fit') {
        page.drawImage(img, { x: 0, y: 0, width: pw, height: ph })
      } else {
        const margin = 24
        const scale = Math.min((pw - margin * 2) / img.width, (ph - margin * 2) / img.height)
        const w = img.width * scale
        const h = img.height * scale
        page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
      }
    }
    const outBytes = await pdf.save()
    if (myRun !== runId) return
    outputBlob.value = new Blob([outBytes], { type: 'application/pdf' })
  } catch {
    if (myRun !== runId) return
    error.value = 'Could not build the PDF from these images.'
  } finally {
    if (myRun === runId) busy.value = false
  }
}

watch([items, pageSize, orientation], build, { deep: true })
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!items.length"
      title="Images to PDF"
      description="Add JPG or PNG images — they’re combined into one PDF in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="ip__drop"
          accept="image/*"
          hint="JPG, PNG, WebP…"
          multiple
          @files="addFiles"
        />
      </template>
    </EmptyState>

    <div v-else class="ip">
      <ul class="ip__grid">
        <li v-for="(item, i) in items" :key="item.id" class="ip__cell">
          <div class="ip__thumb"><img :src="item.url" :alt="item.file.name" /></div>
          <span class="ip__num">{{ i + 1 }}</span>
          <div class="ip__cell-actions">
            <button
              class="ip__iconbtn"
              :disabled="i === 0"
              aria-label="Move up"
              @click="move(i, -1)"
            >
              <Icon :name="UI_ICON.arrowUp" size="15" />
            </button>
            <button
              class="ip__iconbtn"
              :disabled="i === items.length - 1"
              aria-label="Move down"
              @click="move(i, 1)"
            >
              <Icon :name="UI_ICON.arrowDown" size="15" />
            </button>
            <button class="ip__iconbtn" aria-label="Remove" @click="removeAt(i)">
              <Icon :name="UI_ICON.trash" size="15" />
            </button>
          </div>
        </li>
      </ul>

      <FileDropzone
        class="ip__drop"
        accept="image/*"
        hint="Add more images"
        multiple
        @files="addFiles"
      />

      <div class="ip__opts">
        <Field label="Page size">
          <SegmentedControl v-model="pageSize" :options="sizeOptions" full-width />
        </Field>
        <Field v-if="pageSize !== 'fit'" label="Orientation">
          <SegmentedControl v-model="orientation" :options="orientOptions" full-width />
        </Field>
      </div>

      <Progress v-if="busy" indeterminate label="Building PDF…" />

      <ResultActions v-else :blob="outputBlob" filename="images.pdf" no-copy>
        <template #extra>
          <Button variant="ghost" size="sm" @click="reset">
            <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
            New file
          </Button>
        </template>
      </ResultActions>
    </div>

    <Alert v-if="error" tone="danger">{{ error }}</Alert>
  </ToolPage>
</template>

<style scoped>
.ip {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ip__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}
.ip__cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.ip__thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface-sunken, #f4f4f8);
}
.ip__thumb img {
  max-width: 100%;
  max-height: 96px;
  object-fit: contain;
}
.ip__num {
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
.ip__cell-actions {
  display: flex;
  justify-content: center;
  gap: 0.15rem;
}
.ip__iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
.ip__iconbtn:hover:not(:disabled) {
  background: var(--surface-sunken, #f4f4f8);
  color: var(--text-primary);
}
.ip__iconbtn:disabled {
  opacity: 0.35;
  cursor: default;
}
.ip__opts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.ip__drop {
  width: 100%;
}
@media (max-width: 560px) {
  .ip__opts {
    grid-template-columns: 1fr;
  }
}
</style>
