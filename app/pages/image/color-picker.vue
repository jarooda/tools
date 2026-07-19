<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { rgbToHex, rgbToHsl, hslString, rgbString } from '@/utils/colorFormat'
import type { LoadedImage } from '@/composables/useCanvasImage'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-color-picker')!
const { loadImage } = useCanvasImage()

const ready = ref(false)
const hasEyeDropper = ref(false)
onMounted(() => {
  hasEyeDropper.value = 'EyeDropper' in window
  ready.value = true
})

const loaded = shallowRef<LoadedImage | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
const error = ref('')

const color = ref<{ r: number; g: number; b: number } | null>(null)
const recent = ref<string[]>([])

const hex = computed(() =>
  color.value ? rgbToHex(color.value.r, color.value.g, color.value.b) : '',
)
const rgb = computed(() => (color.value ? rgbString(color.value) : ''))
const hsl = computed(() =>
  color.value ? hslString(rgbToHsl(color.value.r, color.value.g, color.value.b)) : '',
)

async function onSelect(file: File) {
  error.value = ''
  color.value = null
  try {
    loaded.value?.revoke()
    const img = await loadImage(file)
    loaded.value = img
    await nextTick()
    const canvas = canvasEl.value
    if (!canvas) return
    canvas.width = img.width
    canvas.height = img.height
    ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx?.drawImage(img.el, 0, 0)
  } catch (e) {
    error.value = (e as Error).message
    loaded.value = null
  }
}

function reset() {
  loaded.value?.revoke()
  loaded.value = null
  color.value = null
  recent.value = []
  ctx = null
}

function setColor(r: number, g: number, b: number) {
  color.value = { r, g, b }
  const h = rgbToHex(r, g, b)
  recent.value = [h, ...recent.value.filter((c) => c !== h)].slice(0, 8)
}

function onCanvasClick(e: MouseEvent) {
  const canvas = canvasEl.value
  if (!canvas || !ctx) return
  const rect = canvas.getBoundingClientRect()
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width)
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height)
  const d = ctx.getImageData(x, y, 1, 1).data
  setColor(d[0]!, d[1]!, d[2]!)
}

async function pickWithEyeDropper() {
  try {
    // EyeDropper is a newer web API not yet in TS lib DOM types.
    const ed = new (
      window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }
    ).EyeDropper()
    const res = await ed.open()
    const m = res.sRGBHex.replace('#', '')
    setColor(parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16))
  } catch {
    // User dismissed the eyedropper — nothing to do.
  }
}

const { copy, copied } = useCopy()
const copiedValue = ref('')
async function copyValue(v: string) {
  await copy(v)
  copiedValue.value = v
}
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="pk">
      <Skeleton variant="rect" width="100%" height="260px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!loaded"
      title="Pick colors from an image"
      description="Drop an image, then click anywhere on it to sample the color under your cursor."
    >
      <template #icon><Icon :name="UI_ICON.emptyImage" size="24" /></template>
      <template #actions>
        <FileDropzone class="pk__drop" @select="onSelect" />
      </template>
    </EmptyState>

    <div v-else class="pk">
      <div class="pk__left">
        <canvas ref="canvasEl" class="pk__canvas" @click="onCanvasClick" />
        <p class="pk__hint">Click the image to sample a color.</p>
      </div>

      <div class="pk__controls">
        <div class="pk__swatch" :style="{ background: hex || 'transparent' }">
          <span v-if="!color" class="pk__swatch-empty">No color picked</span>
        </div>

        <ul v-if="color" class="pk__values">
          <li
            v-for="row in [
              { label: 'HEX', value: hex },
              { label: 'RGB', value: rgb },
              { label: 'HSL', value: hsl },
            ]"
            :key="row.label"
            class="pk__row"
          >
            <span class="pk__row-label">{{ row.label }}</span>
            <code class="pk__row-value">{{ row.value }}</code>
            <Button
              variant="ghost"
              size="sm"
              :aria-label="`Copy ${row.label}`"
              @click="copyValue(row.value)"
            >
              <template #icon>
                <Icon
                  :name="copied && copiedValue === row.value ? UI_ICON.check : UI_ICON.copy"
                  size="15"
                />
              </template>
            </Button>
          </li>
        </ul>

        <div v-if="recent.length" class="pk__recent">
          <span class="pk__recent-label">Recent</span>
          <div class="pk__recent-swatches">
            <button
              v-for="c in recent"
              :key="c"
              type="button"
              class="pk__chip"
              :style="{ background: c }"
              :aria-label="`Use ${c}`"
              @click="copyValue(c)"
            />
          </div>
        </div>

        <div class="pk__actions">
          <Button v-if="hasEyeDropper" variant="secondary" size="sm" @click="pickWithEyeDropper">
            <template #icon><Icon :name="UI_ICON.eyedropper" size="15" /></template>
            Screen eyedropper
          </Button>
          <Button variant="ghost" size="sm" @click="reset">
            <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
            New image
          </Button>
        </div>
      </div>
    </div>

    <p v-if="error" class="pk__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.pk {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(240px, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.pk__canvas {
  max-width: 100%;
  max-height: 440px;
  height: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  cursor: crosshair;
  display: block;
}
.pk__hint {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.pk__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.pk__swatch {
  height: 88px;
  border-radius: var(--radius-control, 0.625rem);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pk__swatch-empty {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.pk__values {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.pk__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.4rem 0.4rem 0.7rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.pk__row-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
  width: 30px;
}
.pk__row-value {
  flex: 1;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.pk__recent-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.pk__recent-swatches {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.4rem;
  flex-wrap: wrap;
}
.pk__chip {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  padding: 0;
}
.pk__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.pk__drop {
  width: 100%;
}
.pk__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
@media (max-width: 720px) {
  .pk {
    grid-template-columns: 1fr;
  }
}
</style>
