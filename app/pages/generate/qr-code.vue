<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('generate-qr-code')!

type Level = 'L' | 'M' | 'Q' | 'H'

const text = ref('https://example.com')
const level = ref<Level>('M')
const size = ref(320)
const margin = ref(2)
const fg = ref('#000000')
const bg = ref('#ffffff')

const ready = ref(false)
const error = ref<string | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

type QRCodeModule = typeof import('qrcode')
let QR: QRCodeModule | null = null

async function render() {
  if (!import.meta.client) return
  const el = canvasRef.value
  if (!el || !text.value.trim()) return
  try {
    if (!QR) QR = await import('qrcode')
    await QR.toCanvas(el, text.value, {
      errorCorrectionLevel: level.value,
      width: size.value,
      margin: margin.value,
      color: { dark: fg.value, light: bg.value },
    })
    error.value = null
  } catch (e) {
    error.value = (e as Error).message
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch([text, level, size, margin, fg, bg], () => {
  clearTimeout(timer)
  timer = setTimeout(render, 120)
})

onMounted(async () => {
  ready.value = true
  await nextTick()
  await render()
})

const { downloadBlob, downloadText } = useDownload()

function downloadPng() {
  canvasRef.value?.toBlob((blob) => {
    if (blob) downloadBlob(blob, 'qr-code.png')
  }, 'image/png')
}

async function downloadSvg() {
  if (!text.value.trim()) return
  if (!QR) QR = await import('qrcode')
  const svg: string = await QR.toString(text.value, {
    type: 'svg',
    errorCorrectionLevel: level.value,
    margin: margin.value,
    color: { dark: fg.value, light: bg.value },
  })
  downloadText(svg, 'qr-code.svg', 'image/svg+xml')
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="qr">
      <div class="qr__controls">
        <Field label="Text or URL" class="qr__text">
          <Textarea
            v-model="text"
            placeholder="Enter a link, message, or any text…"
            auto-resize
            spellcheck="false"
          />
        </Field>

        <div class="qr__options">
          <Field label="Error correction">
            <SegmentedControl
              v-model="level"
              :options="[
                { value: 'L', label: 'L' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' },
                { value: 'H', label: 'H' },
              ]"
              size="sm"
            />
          </Field>

          <Field :label="`Size — ${size}px`">
            <Slider v-model="size" :min="128" :max="1024" :step="16" />
          </Field>

          <Field :label="`Quiet margin — ${margin}`">
            <Slider v-model="margin" :min="0" :max="8" :step="1" />
          </Field>

          <div class="qr__colors">
            <label class="qr__color">
              <span>Foreground</span>
              <input v-model="fg" type="color" />
            </label>
            <label class="qr__color">
              <span>Background</span>
              <input v-model="bg" type="color" />
            </label>
          </div>
        </div>
      </div>

      <div class="qr__preview">
        <div v-if="!ready" aria-hidden="true">
          <Skeleton variant="rect" width="260px" height="260px" radius="12px" />
        </div>
        <EmptyState
          v-else-if="!text.trim()"
          bordered
          size="sm"
          title="Nothing to encode yet"
          description="Type some text or a URL to build a QR code."
        >
          <template #icon><Icon :name="UI_ICON.qrcode" size="22" /></template>
        </EmptyState>
        <p v-else-if="error" class="qr__error" role="alert">{{ error }}</p>
        <template v-else>
          <div class="qr__canvas-wrap">
            <canvas ref="canvasRef" class="qr__canvas" />
          </div>
          <div class="qr__actions">
            <Button variant="secondary" @click="downloadPng">
              <template #icon><Icon :name="UI_ICON.download" size="16" /></template>
              PNG
            </Button>
            <Button variant="secondary" @click="downloadSvg">
              <template #icon><Icon :name="UI_ICON.download" size="16" /></template>
              SVG
            </Button>
          </div>
        </template>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.qr {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 320px);
  gap: 24px;
  align-items: start;
}
.qr__controls {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}
.qr__options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.qr__colors {
  display: flex;
  gap: 1.5rem;
}
.qr__color {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.qr__color input {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: none;
  cursor: pointer;
}
.qr__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-muted, var(--surface-card));
}
.qr__canvas-wrap {
  padding: 8px;
  border-radius: 10px;
  background: #fff;
}
.qr__canvas {
  display: block;
  width: 100%;
  max-width: 240px;
  height: auto;
  image-rendering: pixelated;
}
.qr__actions {
  display: flex;
  gap: 0.5rem;
}
.qr__error {
  margin: 0;
  color: var(--danger-text, var(--warning-text));
  font-size: 0.875rem;
  text-align: center;
}
@media (max-width: 720px) {
  .qr {
    grid-template-columns: 1fr;
  }
}
</style>
