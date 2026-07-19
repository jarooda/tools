<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-office-to-pdf')!
const { loadPdfLib } = usePdf()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const busy = ref(false)
const error = ref('')

// A4 at 96 CSS-DPI for layout, and in PDF points for the output pages.
const A4_WIDTH_PX = 794
const A4_WIDTH_PT = 595.28
const A4_HEIGHT_PT = 841.89
const A4_HEIGHT_PX = A4_WIDTH_PX * (A4_HEIGHT_PT / A4_WIDTH_PT)

function baseName() {
  return (sourceFile.value?.name || 'document').replace(/\.(docx?|DOCX?)$/, '')
}

function onSelect(file: File) {
  error.value = ''
  outputBlob.value = null
  sourceFile.value = file
}

function reset() {
  sourceFile.value = null
  outputBlob.value = null
  error.value = ''
}

/** Render the Word HTML into an offscreen, print-styled A4-width container. */
function buildContainer(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  Object.assign(el.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${A4_WIDTH_PX}px`,
    padding: '48px',
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#111111',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '16px',
    lineHeight: '1.5',
  } as Partial<CSSStyleDeclaration>)
  document.body.appendChild(el)
  return el
}

async function run() {
  const file = sourceFile.value
  if (!file) return
  busy.value = true
  error.value = ''
  outputBlob.value = null
  let container: HTMLElement | null = null
  try {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer })
    if (!html.trim()) throw new Error('empty')

    container = buildContainer(html)
    const html2canvas = (await import('html2canvas')).default
    const scale = 2
    const canvas = await html2canvas(container, { scale, backgroundColor: '#ffffff' })

    const { PDFDocument } = await loadPdfLib()
    const pdf = await PDFDocument.create()
    const sliceHeightPx = Math.floor(A4_HEIGHT_PX * scale)
    const pageCount = Math.max(1, Math.ceil(canvas.height / sliceHeightPx))

    for (let i = 0; i < pageCount; i++) {
      const sliceH = Math.min(sliceHeightPx, canvas.height - i * sliceHeightPx)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceH
      slice
        .getContext('2d')!
        .drawImage(canvas, 0, i * sliceHeightPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
      const dataUrl = slice.toDataURL('image/jpeg', 0.9)
      const img = await pdf.embedJpg(dataUrl)
      const page = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT])
      // Last page is usually shorter than a full A4 — scale height to match.
      const drawH = A4_HEIGHT_PT * (sliceH / sliceHeightPx)
      page.drawImage(img, { x: 0, y: A4_HEIGHT_PT - drawH, width: A4_WIDTH_PT, height: drawH })
    }

    const bytes = await pdf.save()
    outputBlob.value = new Blob([bytes], { type: 'application/pdf' })
  } catch (e) {
    error.value =
      (e as Error).message === 'empty'
        ? 'This document appears to be empty.'
        : 'Could not convert this file. Make sure it’s a valid Word .docx document.'
  } finally {
    if (container) container.remove()
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
      title="Word to PDF"
      description="Drop a Word .docx document — it’s converted to PDF in your browser, never uploaded."
    >
      <template #icon><Icon :name="UI_ICON.fileWord" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="of__drop"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hint="Word .docx"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="of">
      <p class="of__source">{{ sourceFile.name }}</p>

      <div class="of__actions">
        <Button variant="primary" :disabled="busy" @click="run">
          <template #icon><Icon :name="UI_ICON.filePdf" size="16" /></template>
          Convert to PDF
        </Button>
        <Button variant="ghost" @click="reset">
          <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
          New file
        </Button>
      </div>

      <Progress v-if="busy" indeterminate label="Converting…" />

      <ResultActions v-if="outputBlob" :blob="outputBlob" :filename="`${baseName()}.pdf`" no-copy />

      <p class="of__note">
        Converts Word (.docx) with basic formatting. Excel and PowerPoint aren’t supported.
      </p>
    </div>

    <p v-if="error" class="of__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.of {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.of__source {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.of__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.of__note {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.of__drop {
  width: 100%;
}
.of__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
</style>
