<script setup lang="ts">
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UI_ICON } from '@/lib/icons'

/**
 * Live preview of an uploaded PDF, rendered client-side with the lazy pdf.js
 * engine (`usePdf`) — nothing is uploaded.
 *
 * It shows **several pages**, not just the first, and is *tool-aware*: pages can
 * be visually rotated (`rotationFor`, used by Rotate) and tools can paint their
 * own effect on top through the `#overlay` slot (used by Watermark). Each page
 * box is a CSS **size container** matching the real page, so overlays can size
 * themselves in `cqw`/`cqh` and stay accurate at any thumbnail size.
 *
 * Degrades to a quiet notice if pages can't be rendered (e.g. an encrypted
 * file), leaving the tool's own validation to surface the real error.
 */

// eslint-disable-next-line no-unused-vars
type RotationFor = (pageNumber: number) => number

const props = withDefaults(
  defineProps<{
    /** The PDF to preview. */
    file: File
    /** Pages rendered before the "show all" affordance. */
    initialPages?: number
    /** Extra visual rotation in degrees, per page — for the Rotate tool. */
    rotationFor?: RotationFor
  }>(),
  { initialPages: 4, rotationFor: undefined },
)

/** Render scale for thumbnails — sized for a ~200px+ cell on a hi-dpi screen. */
const THUMB_SCALE = 0.8
/** Hard ceiling for "show all" — rendering a 500-page book would lock the tab. */
const MAX_PAGES = 50

interface PageThumb {
  page: number
  url: string
  /** Real page size in PDF points, so overlays can scale against it. */
  width: number
  height: number
}

const { openForRender, closeDoc, renderPageToCanvas, canvasToBlob } = usePdf()

const thumbs = shallowRef<PageThumb[]>([])
const total = ref(0)
const loading = ref(true)
const failed = ref(false)
const showAll = ref(false)

function revoke() {
  thumbs.value.forEach((t) => URL.revokeObjectURL(t.url))
  thumbs.value = []
}

let runId = 0
async function render() {
  const file = props.file
  const myRun = ++runId
  loading.value = true
  failed.value = false
  revoke()

  let doc: PDFDocumentProxy | undefined
  try {
    doc = await openForRender(file)
    if (myRun !== runId) return
    total.value = doc.numPages
    const limit = Math.min(showAll.value ? MAX_PAGES : props.initialPages, doc.numPages)

    const list: PageThumb[] = []
    for (let p = 1; p <= limit; p++) {
      const viewport = (await doc.getPage(p)).getViewport({ scale: 1 })
      const canvas = await renderPageToCanvas(doc, p, THUMB_SCALE)
      const blob = await canvasToBlob(canvas, 'image/png')
      if (myRun !== runId) return
      list.push({
        page: p,
        url: URL.createObjectURL(blob),
        width: viewport.width,
        height: viewport.height,
      })
      // Publish progressively so pages appear as they finish.
      thumbs.value = [...list]
    }
  } catch {
    if (myRun === runId) failed.value = true
  } finally {
    await closeDoc(doc)
    if (myRun === runId) loading.value = false
  }
}

watch(
  () => props.file,
  () => {
    showAll.value = false
    render()
  },
  { immediate: true },
)
watch(showAll, (all) => all && render())
onBeforeUnmount(revoke)

/** A quarter turn swaps the page's footprint, so it needs a square cell to fit. */
function isQuarterTurn(page: number) {
  return Math.abs(props.rotationFor?.(page) ?? 0) % 180 === 90
}

/**
 * The cell only has to be square when the page is quarter-turned — otherwise it
 * takes the page's own aspect ratio, so the thumbnail fills the full column
 * width instead of being letterboxed inside a square.
 */
function boxStyle(t: PageThumb) {
  return { aspectRatio: isQuarterTurn(t.page) ? '1 / 1' : `${t.width} / ${t.height}` }
}

/** Size the page to its real aspect ratio and fit it inside the cell. */
function pageStyle(t: PageThumb) {
  const rotation = props.rotationFor?.(t.page) ?? 0
  const portrait = t.height >= t.width
  return {
    aspectRatio: `${t.width} / ${t.height}`,
    [portrait ? 'height' : 'width']: '100%',
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
  }
}
</script>

<template>
  <div class="pdf-preview">
    <div v-if="failed" class="pdf-preview__fallback">
      <Icon :name="UI_ICON.filePdf" size="28" />
      <span>Preview unavailable</span>
    </div>

    <template v-else>
      <ul class="pdf-preview__grid">
        <li v-for="t in thumbs" :key="t.page" class="pdf-preview__cell">
          <div class="pdf-preview__box" :style="boxStyle(t)">
            <div class="pdf-preview__page" :style="pageStyle(t)">
              <img :src="t.url" :alt="`Page ${t.page}`" class="pdf-preview__img" />
              <div class="pdf-preview__overlay">
                <slot name="overlay" :page="t.page" :width="t.width" :height="t.height" />
              </div>
            </div>
          </div>
          <span class="pdf-preview__num">{{ t.page }}</span>
        </li>

        <li v-if="loading" class="pdf-preview__cell" aria-hidden="true">
          <div class="pdf-preview__box">
            <Skeleton variant="rect" width="100%" height="100%" radius="6px" />
          </div>
        </li>
      </ul>

      <div v-if="!loading && total > thumbs.length" class="pdf-preview__more">
        <Button v-if="!showAll" variant="ghost" size="sm" @click="showAll = true">
          Show all {{ Math.min(total, MAX_PAGES) }} pages
        </Button>
        <span v-else class="pdf-preview__note">
          Previewing the first {{ thumbs.length }} of {{ total }} pages
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pdf-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}
.pdf-preview__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
.pdf-preview__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}
/* Aspect comes from `boxStyle` (page ratio, or square for a quarter turn).
   The square default here covers the loading skeleton, which has no page yet. */
.pdf-preview__box {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1 / 1;
}
.pdf-preview__page {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  background: var(--neutral-0);
  box-shadow: var(--shadow-sm, 0 1px 3px rgb(0 0 0 / 0.08));
  overflow: hidden;
  transition: transform 0.15s var(--ease-standard, ease);
  /* Overlays size themselves against the real page via cqw/cqh. */
  container-type: size;
}
.pdf-preview__img {
  display: block;
  width: 100%;
  height: 100%;
}
.pdf-preview__overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.pdf-preview__num {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
.pdf-preview__more {
  display: flex;
  justify-content: center;
}
.pdf-preview__note {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
.pdf-preview__fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  min-height: 140px;
  border: 1px dashed var(--border-subtle);
  border-radius: 8px;
  color: var(--text-tertiary);
  font-size: 0.8125rem;
}

@media (prefers-reduced-motion: reduce) {
  .pdf-preview__page {
    transition: none;
  }
}
</style>
