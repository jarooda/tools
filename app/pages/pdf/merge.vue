<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
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
import { formatBytes } from '@/utils/fileSize'
import { useDragReorder } from '@/composables/useDragReorder'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-merge')!
const { loadPdfLib, readBytes } = usePdf()

const ready = ref(false)
onMounted(() => (ready.value = true))

interface Item {
  id: number
  file: File
}
let nextId = 0
const items = ref<Item[]>([])
const outputBlob = shallowRef<Blob | null>(null)
const busy = ref(false)
const error = ref('')

function addFiles(files: File[]) {
  error.value = ''
  for (const file of files) {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      items.value.push({ id: nextId++, file })
    }
  }
}

const announcement = ref('')
const { dragIndex, overIndex, onHandlePointerDown, reorderTo, styleFor } = useDragReorder(items, {
  onReorder: (item, from, to, total) => {
    announcement.value = `${item.file.name} moved to position ${to + 1} of ${total}`
  },
})

function move(index: number, delta: number) {
  reorderTo(index, index + delta)
}

function removeAt(index: number) {
  items.value.splice(index, 1)
}

function reset() {
  items.value = []
  outputBlob.value = null
  error.value = ''
}

let runId = 0
async function merge() {
  outputBlob.value = null
  if (items.value.length < 2) return
  const myRun = ++runId
  busy.value = true
  error.value = ''
  try {
    const { PDFDocument } = await loadPdfLib()
    const out = await PDFDocument.create()
    for (const { file } of items.value) {
      const src = await PDFDocument.load(await readBytes(file))
      const pages = await out.copyPages(src, src.getPageIndices())
      pages.forEach((p) => out.addPage(p))
    }
    const bytes = await out.save()
    if (myRun !== runId) return
    outputBlob.value = new Blob([bytes], { type: 'application/pdf' })
  } catch {
    if (myRun !== runId) return
    error.value = 'Could not merge these files. One may be encrypted or not a valid PDF.'
  } finally {
    if (myRun === runId) busy.value = false
  }
}

// Re-merge whenever the set or order changes.
watch(items, merge, { deep: true })
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!items.length"
      title="Merge PDF files"
      description="Add two or more PDFs — they’re combined in your browser, never uploaded."
    >
      <template #icon><Icon :name="UI_ICON.emptyFile" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="mg__drop"
          accept="application/pdf,.pdf"
          hint="PDF files"
          multiple
          @files="addFiles"
        />
      </template>
    </EmptyState>

    <div v-else class="mg">
      <span class="mg__sr-live" aria-live="polite">{{ announcement }}</span>
      <ol class="mg__list">
        <li
          v-for="(item, i) in items"
          :key="item.id"
          :data-drag-index="i"
          class="mg__row"
          :class="{
            'mg__row--dragging': dragIndex === i,
            'mg__row--over-before': overIndex === i && dragIndex !== null && i < dragIndex,
            'mg__row--over-after': overIndex === i && dragIndex !== null && i > dragIndex,
          }"
          :style="styleFor(i)"
        >
          <IconButton
            variant="ghost"
            size="sm"
            tabindex="-1"
            class="mg__handle"
            :aria-label="`Drag to reorder ${item.file.name}`"
            @pointerdown="onHandlePointerDown($event, i)"
          >
            <Icon :name="UI_ICON.dragHandle" size="16" />
          </IconButton>
          <span class="mg__index">{{ i + 1 }}</span>
          <Icon :name="UI_ICON.filePdf" size="20" class="mg__ic" />
          <span class="mg__name">{{ item.file.name }}</span>
          <span class="mg__size">{{ formatBytes(item.file.size) }}</span>
          <div class="mg__row-actions">
            <IconButton
              variant="ghost"
              size="sm"
              :disabled="i === 0"
              aria-label="Move up"
              @click="move(i, -1)"
            >
              <Icon :name="UI_ICON.arrowUp" size="16" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              :disabled="i === items.length - 1"
              aria-label="Move down"
              @click="move(i, 1)"
            >
              <Icon :name="UI_ICON.arrowDown" size="16" />
            </IconButton>
            <IconButton variant="ghost" size="sm" aria-label="Remove" @click="removeAt(i)">
              <Icon :name="UI_ICON.trash" size="16" />
            </IconButton>
          </div>
        </li>
      </ol>

      <div class="mg__add">
        <FileDropzone
          class="mg__drop"
          accept="application/pdf,.pdf"
          hint="Add more PDFs"
          multiple
          @files="addFiles"
        />
      </div>

      <Progress v-if="busy" indeterminate label="Merging…" />

      <p v-if="items.length < 2" class="mg__note">Add at least one more PDF to merge.</p>

      <ResultActions v-else-if="outputBlob" :blob="outputBlob" filename="merged.pdf" no-copy>
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
.mg {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mg__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.mg__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.mg__row--dragging {
  box-shadow: var(--shadow-lg);
  opacity: 0.9;
  cursor: grabbing;
}
.mg__row--over-before::before,
.mg__row--over-after::after {
  content: '';
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  height: 2px;
  background: var(--accent);
}
.mg__row--over-before::before {
  top: -0.3rem;
}
.mg__row--over-after::after {
  bottom: -0.3rem;
}
.mg__handle {
  flex: 0 0 auto;
  cursor: grab;
  touch-action: none;
}
.mg__index {
  flex: 0 0 auto;
  width: 1.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
.mg__ic {
  flex: 0 0 auto;
  color: var(--text-tertiary);
}
.mg__name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}
.mg__size {
  flex: 0 0 auto;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
.mg__row-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 0.15rem;
}
.mg__drop {
  width: 100%;
}
.mg__note {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
@media (max-width: 560px) {
  .mg__size {
    display: none;
  }
}
.mg__sr-live {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
