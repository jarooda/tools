<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import PdfPreview from '@/components/tool/PdfPreview.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

/** Parse a `#rrggbb` hex (as emitted by <input type="color">) to 0–1 channels. */
function hexChannels(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-watermark')!
const { loadPdfLib, readBytes } = usePdf()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const busy = ref(false)
const error = ref('')

const text = ref('CONFIDENTIAL')
const fontSize = ref(48)
const opacity = ref(20)
const color = ref('#ff3b30')
const layout = ref<'diagonal' | 'horizontal'>('diagonal')
const tile = ref(false)

const layoutOptions = [
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'horizontal', label: 'Horizontal' },
]

/**
 * Approximate HelveticaBold advance width, in points. Close enough to pdf-lib's
 * real font metrics to lay the *preview* out; `run()` still uses exact metrics.
 */
let measureCtx: CanvasRenderingContext2D | null = null
function measureText(label: string, size: number) {
  if (!import.meta.client) return label.length * size * 0.55
  measureCtx ||= document.createElement('canvas').getContext('2d')
  if (!measureCtx) return label.length * size * 0.55
  measureCtx.font = `bold ${size}px Helvetica, Arial, sans-serif`
  return measureCtx.measureText(label).width
}

/** Stamp centres for the live preview — mirrors the layout maths in `run()`. */
function stamps(width: number, height: number) {
  const label = text.value.trim()
  if (!label) return []
  if (!tile.value) return [{ x: width / 2, y: height / 2 }]
  const out: Array<{ x: number; y: number }> = []
  const stepX = Math.max(measureText(label, fontSize.value), width / 3) + 40
  const stepY = fontSize.value * 4
  for (let y = stepY / 2; y < height; y += stepY) {
    for (let x = stepX / 2; x < width + stepX; x += stepX) out.push({ x, y })
  }
  return out
}

/** Place one stamp, converting PDF points (origin bottom-left) to CSS. */
function stampStyle(s: { x: number; y: number }, width: number, height: number) {
  return {
    left: `${(s.x / width) * 100}%`,
    top: `${((height - s.y) / height) * 100}%`,
    // The page box is a size container, so cqw tracks the real page width.
    fontSize: `${(fontSize.value / width) * 100}cqw`,
    color: color.value,
    opacity: opacity.value / 100,
    transform: `translate(-50%, -50%) rotate(${layout.value === 'diagonal' ? -45 : 0}deg)`,
  }
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

async function run() {
  const file = sourceFile.value
  if (!file || !text.value.trim()) return
  busy.value = true
  error.value = ''
  outputBlob.value = null
  try {
    const { PDFDocument, StandardFonts, degrees, rgb } = await loadPdfLib()
    const doc = await PDFDocument.load(await readBytes(file))
    const font = await doc.embedFont(StandardFonts.HelveticaBold)
    const { r, g, b } = hexChannels(color.value)
    const paint = rgb(r, g, b)
    const rotation = layout.value === 'diagonal' ? 45 : 0
    const label = text.value.trim()
    const textWidth = font.widthOfTextAtSize(label, fontSize.value)

    for (const page of doc.getPages()) {
      const { width, height } = page.getSize()
      const draw = (cx: number, cy: number) => {
        // Offset so the text rotates about its own centre.
        const rad = (rotation * Math.PI) / 180
        const dx = (Math.cos(rad) * textWidth) / 2 + (Math.sin(rad) * fontSize.value) / 2
        const dy = (Math.sin(rad) * textWidth) / 2 - (Math.cos(rad) * fontSize.value) / 2
        page.drawText(label, {
          x: cx - dx,
          y: cy - dy,
          size: fontSize.value,
          font,
          color: paint,
          opacity: opacity.value / 100,
          rotate: degrees(rotation),
        })
      }
      if (tile.value) {
        const stepX = Math.max(textWidth, width / 3) + 40
        const stepY = fontSize.value * 4
        for (let y = stepY / 2; y < height; y += stepY) {
          for (let x = stepX / 2; x < width + stepX; x += stepX) draw(x, y)
        }
      } else {
        draw(width / 2, height / 2)
      }
    }

    const bytes = await doc.save()
    outputBlob.value = new Blob([bytes], { type: 'application/pdf' })
  } catch {
    error.value = 'Could not watermark this PDF. It may be encrypted or invalid.'
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
      title="Watermark a PDF"
      description="Drop a PDF and stamp a text watermark across every page — all in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyFile" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="wm__drop"
          accept="application/pdf,.pdf"
          hint="PDF file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="wm">
      <div class="wm__file">
        <p class="wm__source">{{ sourceFile.name }}</p>
        <PdfPreview :file="sourceFile">
          <template #overlay="{ width, height }">
            <span
              v-for="(s, i) in stamps(width, height)"
              :key="i"
              class="wm__stamp"
              :style="stampStyle(s, width, height)"
              >{{ text }}</span
            >
          </template>
        </PdfPreview>
      </div>

      <Field label="Watermark text">
        <Input v-model="text" placeholder="CONFIDENTIAL" />
      </Field>

      <div class="wm__row">
        <Field label="Layout">
          <SegmentedControl v-model="layout" :options="layoutOptions" full-width />
        </Field>
        <Field label="Color">
          <input v-model="color" type="color" class="wm__color" aria-label="Watermark color" />
        </Field>
      </div>

      <Field label="Font size">
        <Slider
          v-model="fontSize"
          :min="12"
          :max="120"
          :step="2"
          show-value
          :format-value="(v) => `${v}pt`"
        />
      </Field>

      <Field label="Opacity">
        <Slider
          v-model="opacity"
          :min="5"
          :max="100"
          :step="5"
          show-value
          :format-value="(v) => `${v}%`"
        />
      </Field>

      <Switch v-model="tile" label="Tile across the whole page" />

      <div class="wm__actions">
        <Button variant="primary" :disabled="busy || !text.trim()" @click="run">
          <template #icon><Icon :name="UI_ICON.filePdf" size="16" /></template>
          Apply watermark
        </Button>
        <Button variant="ghost" @click="reset">
          <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
          New file
        </Button>
      </div>

      <Progress v-if="busy" indeterminate label="Stamping…" />

      <ResultActions v-if="outputBlob" :blob="outputBlob" filename="watermarked.pdf" no-copy />
    </div>

    <Alert v-if="error" tone="danger">{{ error }}</Alert>
  </ToolPage>
</template>

<style scoped>
.wm {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.wm__file {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.wm__stamp {
  position: absolute;
  white-space: nowrap;
  font-family: Helvetica, Arial, sans-serif;
  font-weight: 700;
  line-height: 1;
}
.wm__source {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.wm__row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: end;
}
.wm__color {
  width: 3rem;
  height: 2.4rem;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.5rem);
  background: none;
  cursor: pointer;
}
.wm__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.wm__drop {
  width: 100%;
}
</style>
