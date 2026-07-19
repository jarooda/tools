<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { FAVICON_SIZES, ICO_SIZES, buildIco, faviconHtmlSnippet } from '@/utils/favicon'
import type { LoadedImage } from '@/composables/useCanvasImage'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-favicon')!
const { loadImage, createCanvas, canvasToBlob } = useCanvasImage()
const { downloadBlob } = useDownload()
const { copy, copied } = useCopy()

const ready = ref(false)
onMounted(() => (ready.value = true))

const loaded = shallowRef<LoadedImage | null>(null)
const error = ref('')
const cover = ref(false)

interface Preview {
  size: number
  label: string
  url: string
  blob: Blob
}
const previews = ref<Preview[]>([])
const icoBlob = shallowRef<Blob | null>(null)

function revokePreviews() {
  previews.value.forEach((p) => URL.revokeObjectURL(p.url))
  previews.value = []
}

async function onSelect(file: File) {
  error.value = ''
  try {
    loaded.value?.revoke()
    loaded.value = await loadImage(file)
  } catch (e) {
    error.value = (e as Error).message
    loaded.value = null
  }
}

function reset() {
  loaded.value?.revoke()
  loaded.value = null
  revokePreviews()
  icoBlob.value = null
}

function squareCanvas(img: LoadedImage, size: number): HTMLCanvasElement {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')!
  const scale = cover.value
    ? Math.max(size / img.width, size / img.height)
    : Math.min(size / img.width, size / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img.el, (size - w) / 2, (size - h) / 2, w, h)
  return canvas
}

async function generate() {
  const img = loaded.value
  if (!img) return
  revokePreviews()

  const outs: Preview[] = []
  for (const { size, label } of FAVICON_SIZES) {
    const blob = await canvasToBlob(squareCanvas(img, size), 'image/png')
    outs.push({ size, label, blob, url: URL.createObjectURL(blob) })
  }
  previews.value = outs

  const icoEntries = []
  for (const size of ICO_SIZES) {
    const blob = await canvasToBlob(squareCanvas(img, size), 'image/png')
    icoEntries.push({ size, png: new Uint8Array(await blob.arrayBuffer()) })
  }
  icoBlob.value = buildIco(icoEntries)
}

watch([loaded, cover], generate, { immediate: true })
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="fv">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!loaded"
      title="Generate a favicon set"
      description="Drop a square logo or image — we’ll render every size plus a multi-resolution .ico."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone class="fv__drop" @select="onSelect" />
      </template>
    </EmptyState>

    <div v-else class="fv">
      <div class="fv__top">
        <Switch v-model="cover" label="Crop to fill (cover)" />
        <div class="fv__top-actions">
          <Button
            v-if="icoBlob"
            variant="primary"
            size="sm"
            @click="downloadBlob(icoBlob, 'favicon.ico')"
          >
            <template #icon><Icon :name="UI_ICON.download" size="15" /></template>
            favicon.ico
          </Button>
          <Button variant="ghost" size="sm" @click="reset">
            <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
            New image
          </Button>
        </div>
      </div>

      <ul class="fv__grid">
        <li v-for="p in previews" :key="p.size" class="fv__cell">
          <div class="fv__thumb" :style="{ background: 'var(--surface-sunken, #f4f4f8)' }">
            <img :src="p.url" :alt="`${p.size}px preview`" :width="Math.min(p.size, 96)" />
          </div>
          <span class="fv__size">{{ p.size }}px</span>
          <Button
            variant="ghost"
            size="sm"
            :aria-label="`Download ${p.label}.png`"
            @click="downloadBlob(p.blob, `${p.label}.png`)"
          >
            <template #icon><Icon :name="UI_ICON.download" size="14" /></template>
            PNG
          </Button>
        </li>
      </ul>

      <div class="fv__snippet">
        <div class="fv__snippet-head">
          <span class="fv__snippet-label">HTML tags</span>
          <Button variant="ghost" size="sm" @click="copy(faviconHtmlSnippet())">
            <template #icon
              ><Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="14"
            /></template>
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>
        <pre class="fv__code">{{ faviconHtmlSnippet() }}</pre>
      </div>
    </div>

    <p v-if="error" class="fv__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.fv {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.fv__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.fv__top-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}
.fv__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}
.fv__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.fv__thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 104px;
  border-radius: 8px;
  overflow: hidden;
}
.fv__thumb img {
  image-rendering: auto;
}
.fv__size {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.fv__snippet {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  overflow: hidden;
}
.fv__snippet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.4rem 0.4rem 0.85rem;
  background: var(--surface-sunken, #f4f4f8);
}
.fv__snippet-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.fv__code {
  margin: 0;
  padding: 0.85rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  overflow-x: auto;
  color: var(--text-primary);
}
.fv__drop {
  width: 100%;
}
.fv__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
</style>
