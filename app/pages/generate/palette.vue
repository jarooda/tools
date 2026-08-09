<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Snippet } from '@/components/ui/snippet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip } from '@/components/ui/tooltip'
import { getTool } from '@/lib/tools/registry'
import {
  buildPalette,
  linearGradientCss,
  PALETTE_SCHEMES,
  type PaletteScheme,
} from '@/utils/palette'

definePageMeta({ layout: 'tool' })

const tool = getTool('generate-palette')!

const base = ref('#3366ff')
const scheme = ref<PaletteScheme>('analogous')
const angle = ref(90)
const ready = ref(false)

const palette = computed(() => buildPalette(base.value, scheme.value))
const gradientFrom = computed(() => palette.value[0] ?? base.value)
const gradientTo = computed(() => palette.value[palette.value.length - 1] ?? base.value)
const gradientCss = computed(() =>
  linearGradientCss(gradientFrom.value, gradientTo.value, angle.value),
)

const lastCopied = ref('')
const { copy } = useCopy()
let copyTimer: ReturnType<typeof setTimeout> | undefined
function copySwatch(hex: string) {
  copy(hex)
  lastCopied.value = hex
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (lastCopied.value = ''), 1200)
}

const gradientCssDecl = computed(() => `background: ${gradientCss.value};`)

onMounted(() => {
  ready.value = true
})
</script>

<template>
  <ToolPage :tool="tool">
    <div class="pal">
      <div class="pal__controls">
        <Field label="Base color">
          <div class="pal__base">
            <input
              v-model="base"
              type="color"
              class="pal__swatch-input"
              aria-label="Base color swatch"
            />
            <input v-model="base" type="text" class="pal__hex-input" spellcheck="false" />
          </div>
        </Field>
        <Field label="Harmony" class="pal__scheme">
          <Select v-model="scheme" :options="PALETTE_SCHEMES" />
        </Field>
      </div>

      <!-- Palette -->
      <div v-if="!ready" aria-hidden="true">
        <Skeleton variant="rect" width="100%" height="120px" radius="10px" />
      </div>
      <template v-else>
        <div class="pal__swatches">
          <Tooltip
            v-for="hex in palette"
            :key="hex"
            class="pal__swatch-tip"
            :content="`Copy ${hex}`"
          >
            <button
              type="button"
              class="pal__swatch"
              :style="{ background: hex }"
              @click="copySwatch(hex)"
            >
              <span class="pal__swatch-label">{{ lastCopied === hex ? 'Copied!' : hex }}</span>
            </button>
          </Tooltip>
        </div>

        <!-- Gradient -->
        <div class="pal__gradient">
          <div class="pal__gradient-preview" :style="{ background: gradientCss }" />
          <div class="pal__gradient-controls">
            <Field :label="`Angle — ${angle}°`" class="pal__angle">
              <Slider v-model="angle" :min="0" :max="360" :step="1" />
            </Field>
            <Snippet variant="block" title="Gradient CSS" :code="gradientCssDecl" />
          </div>
        </div>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.pal {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.pal__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1.5rem;
}
.pal__base {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.pal__swatch-input {
  width: 44px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: none;
  cursor: pointer;
}
.pal__hex-input {
  width: 120px;
  height: 38px;
  padding: 0 0.7rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
  color: var(--text-primary);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.875rem;
}
.pal__scheme {
  min-width: 200px;
}
.pal__swatches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}
/* The tooltip wrapper takes the swatch's place as the grid item, so it has to
   pass the full cell width down to the button. */
.pal__swatch-tip {
  display: flex;
}
.pal__swatch {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 110px;
  padding: 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  cursor: pointer;
  transition: transform 0.1s ease;
}
.pal__swatch:hover {
  transform: translateY(-2px);
}
.pal__swatch-label {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.85);
  color: #111;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  font-weight: 600;
}
.pal__gradient {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.pal__gradient-preview {
  height: 90px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
}
.pal__gradient-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.pal__angle {
  max-width: 320px;
}
</style>
