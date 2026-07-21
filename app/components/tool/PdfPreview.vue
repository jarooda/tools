<script setup lang="ts">
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { onBeforeUnmount, ref, watch } from 'vue'
import { Skeleton } from '@/components/ui/skeleton'
import { UI_ICON } from '@/lib/icons'

/**
 * First-page thumbnail preview of an uploaded PDF, so users can confirm they
 * picked the right file before running a tool. Renders client-side via the lazy
 * pdf.js engine (`usePdf`) — nothing is uploaded. Self-contained: it manages its
 * own loading state and object URL, and degrades to a quiet notice if the page
 * can't be rendered (e.g. an encrypted file), leaving the tool's own validation
 * to surface the real error.
 */
const props = withDefaults(
  defineProps<{
    /** The PDF to preview. */
    file: File
    /** Total page count, shown in the caption when > 1. */
    pageCount?: number
    /** Render scale for the first page. */
    scale?: number
  }>(),
  { pageCount: 0, scale: 1 },
)

const { openForRender, closeDoc, renderPageToCanvas, canvasToBlob } = usePdf()

const src = ref('')
const loading = ref(true)
const failed = ref(false)

function revoke() {
  if (src.value) URL.revokeObjectURL(src.value)
  src.value = ''
}

async function render(file: File) {
  loading.value = true
  failed.value = false
  revoke()
  let doc: PDFDocumentProxy | undefined
  try {
    doc = await openForRender(file)
    const canvas = await renderPageToCanvas(doc, 1, props.scale)
    const blob = await canvasToBlob(canvas, 'image/png')
    src.value = URL.createObjectURL(blob)
  } catch {
    failed.value = true
  } finally {
    await closeDoc(doc)
    loading.value = false
  }
}

watch(() => props.file, render, { immediate: true })
onBeforeUnmount(revoke)
</script>

<template>
  <figure class="pdf-preview">
    <Skeleton v-if="loading" variant="rect" width="180px" height="240px" radius="8px" />
    <div v-else-if="failed" class="pdf-preview__fallback">
      <Icon :name="UI_ICON.filePdf" size="28" />
      <span>Preview unavailable</span>
    </div>
    <img v-else :src="src" class="pdf-preview__page" alt="First page of the uploaded PDF" />
    <figcaption v-if="pageCount > 1" class="pdf-preview__caption">
      Page 1 of {{ pageCount }}
    </figcaption>
  </figure>
</template>

<style scoped>
.pdf-preview {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
}
.pdf-preview__page {
  max-width: 180px;
  max-height: 240px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--neutral-0);
  box-shadow: var(--shadow-sm, 0 1px 3px rgb(0 0 0 / 0.08));
}
.pdf-preview__fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 180px;
  height: 240px;
  border: 1px dashed var(--border-subtle);
  border-radius: 8px;
  color: var(--text-tertiary);
  font-size: 0.8125rem;
}
.pdf-preview__caption {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
</style>
