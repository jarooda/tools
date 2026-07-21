<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Snippet } from '@/components/ui/snippet'
import { Skeleton } from '@/components/ui/skeleton'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { placeholderSvg, placeholderLabel } from '#shared/utils/placeholderSvg'
import { PLACEHOLD_FONTS, buildPlaceholdPath, type PlaceholdFont } from '#shared/utils/placeholdUrl'

definePageMeta({ layout: 'tool' })

const tool = getTool('generate-placeholder')!

const width = ref<number | null>(600)
const height = ref<number | null>(400)
const bg = ref('#e2e8f0')
const fg = ref('#475569')
const label = ref('')
const font = ref<PlaceholdFont>('sans')
const ready = ref(false)

const fontOptions = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
]

const w = computed(() => Math.max(1, Math.round(width.value ?? 1)))
const h = computed(() => Math.max(1, Math.round(height.value ?? 1)))

const svg = computed(() =>
  placeholderSvg({
    width: w.value,
    height: h.value,
    bg: bg.value,
    fg: fg.value,
    text: label.value,
    fontFamily: PLACEHOLD_FONTS[font.value],
  }),
)

/**
 * Shareable URL for the same image, served by `/placehold/*`. The preview above
 * is generated locally; this link is the one thing that hits the server.
 */
const requestUrl = useRequestURL()
const shareUrl = computed(
  () =>
    requestUrl.origin +
    buildPlaceholdPath({
      width: w.value,
      height: h.value,
      bg: bg.value,
      fg: fg.value,
      text: label.value,
      font: font.value,
    }),
)
const dataUrl = computed(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.value)}`)
const shownLabel = computed(() => placeholderLabel(w.value, h.value, label.value))

const { downloadBlob, downloadText } = useDownload()

function downloadSvg() {
  downloadText(svg.value, `placeholder-${w.value}x${h.value}.svg`, 'image/svg+xml')
}

function downloadPng() {
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = w.value
    canvas.height = h.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, w.value, h.value)
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `placeholder-${w.value}x${h.value}.png`)
    }, 'image/png')
  }
  img.src = dataUrl.value
}

onMounted(() => {
  ready.value = true
})
</script>

<template>
  <ToolPage :tool="tool">
    <div class="ph">
      <div class="ph__controls">
        <Field label="Width" class="ph__field">
          <NumberInput v-model="width" :min="1" :max="4000" align="left" suffix="px" />
        </Field>
        <Field label="Height" class="ph__field">
          <NumberInput v-model="height" :min="1" :max="4000" align="left" suffix="px" />
        </Field>
        <Field label="Label (optional)" class="ph__label-field">
          <Input v-model="label" :placeholder="`${w}×${h}`" />
        </Field>
        <Field label="Font" class="ph__font-field">
          <SegmentedControl v-model="font" :options="fontOptions" size="sm" />
        </Field>
        <div class="ph__colors">
          <label class="ph__color">
            <span>Background</span>
            <input v-model="bg" type="color" />
          </label>
          <label class="ph__color">
            <span>Text</span>
            <input v-model="fg" type="color" />
          </label>
        </div>
      </div>

      <div class="ph__preview">
        <div v-if="!ready" aria-hidden="true">
          <Skeleton variant="rect" width="100%" height="240px" radius="10px" />
        </div>
        <template v-else>
          <div class="ph__frame">
            <img :src="dataUrl" :alt="`Placeholder ${shownLabel}`" class="ph__img" />
          </div>
          <div class="ph__actions">
            <Button variant="secondary" @click="downloadPng">
              <template #icon><Icon :name="UI_ICON.download" size="16" /></template>
              PNG
            </Button>
            <Button variant="secondary" @click="downloadSvg">
              <template #icon><Icon :name="UI_ICON.download" size="16" /></template>
              SVG
            </Button>
          </div>

          <div class="ph__url">
            <Snippet variant="block" title="Image URL" :code="shareUrl" />
            <p class="ph__url-hint">
              Drop this straight into an <code>&lt;img src&gt;</code>. Unlike the preview above —
              which is generated in your browser — this URL is rendered by our server.
            </p>
          </div>
        </template>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.ph {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.ph__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem 1.5rem;
}
/* Wide enough for both steppers (38px each) plus the "px" suffix (~40px) and a
   4-digit value — at 120px the number was squeezed into 20px and clipped. */
.ph__field {
  width: 168px;
}
.ph__label-field {
  min-width: 180px;
  flex: 1;
}
.ph__colors {
  display: flex;
  gap: 1.5rem;
}
.ph__color {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.ph__color input {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: none;
  cursor: pointer;
}
.ph__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.ph__frame {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-muted, var(--surface-card));
  overflow: auto;
}
.ph__img {
  max-width: 100%;
  max-height: 360px;
  height: auto;
  border-radius: 4px;
}
.ph__actions {
  display: flex;
  gap: 0.5rem;
}
.ph__url {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
}
.ph__url-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.ph__url-hint code {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
}
</style>
