<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Snippet } from '@/components/ui/snippet'
import { Skeleton } from '@/components/ui/skeleton'
import { getTool } from '@/lib/tools/registry'
import { boxShadowCss, gradientCss, rgbaCss } from '@/utils/cssGenerator'

definePageMeta({ layout: 'tool' })

const tool = getTool('color-css-generator')!

type Mode = 'shadow' | 'gradient'
const mode = ref<Mode>('shadow')
const ready = ref(false)

// Shadow
const offsetX = ref(0)
const offsetY = ref(8)
const blur = ref(24)
const spread = ref(-4)
const shadowColor = ref('#0f172a')
const shadowAlpha = ref(0.25)
const inset = ref(false)

const shadowValue = computed(() =>
  boxShadowCss({
    offsetX: offsetX.value,
    offsetY: offsetY.value,
    blur: blur.value,
    spread: spread.value,
    color: rgbaCss(shadowColor.value, shadowAlpha.value),
    inset: inset.value,
  }),
)

// Gradient
const gType = ref<'linear' | 'radial'>('linear')
const angle = ref(135)
const gColor1 = ref('#6366f1')
const gColor2 = ref('#ec4899')

const gradientValue = computed(() =>
  gradientCss({
    type: gType.value,
    angle: angle.value,
    stops: [
      { color: gColor1.value, pos: 0 },
      { color: gColor2.value, pos: 100 },
    ],
  }),
)

const cssProp = computed(() =>
  mode.value === 'shadow'
    ? `box-shadow: ${shadowValue.value};`
    : `background: ${gradientValue.value};`,
)

onMounted(() => {
  ready.value = true
})
</script>

<template>
  <ToolPage :tool="tool">
    <div class="cg">
      <SegmentedControl
        v-model="mode"
        :options="[
          { value: 'shadow', label: 'Box shadow' },
          { value: 'gradient', label: 'Gradient' },
        ]"
      />

      <div v-if="!ready" aria-hidden="true">
        <Skeleton variant="rect" width="100%" height="260px" radius="10px" />
      </div>

      <template v-else>
        <div class="cg__grid">
          <!-- Controls -->
          <div class="cg__controls">
            <template v-if="mode === 'shadow'">
              <Field :label="`Offset X — ${offsetX}px`">
                <Slider v-model="offsetX" :min="-50" :max="50" :step="1" />
              </Field>
              <Field :label="`Offset Y — ${offsetY}px`">
                <Slider v-model="offsetY" :min="-50" :max="50" :step="1" />
              </Field>
              <Field :label="`Blur — ${blur}px`">
                <Slider v-model="blur" :min="0" :max="100" :step="1" />
              </Field>
              <Field :label="`Spread — ${spread}px`">
                <Slider v-model="spread" :min="-50" :max="50" :step="1" />
              </Field>
              <Field :label="`Opacity — ${Math.round(shadowAlpha * 100)}%`">
                <Slider v-model="shadowAlpha" :min="0" :max="1" :step="0.01" />
              </Field>
              <div class="cg__row">
                <label class="cg__color">
                  <span>Color</span>
                  <input v-model="shadowColor" type="color" />
                </label>
                <Switch v-model="inset" label="Inset" />
              </div>
            </template>

            <template v-else>
              <Field label="Type">
                <SegmentedControl
                  v-model="gType"
                  size="sm"
                  :options="[
                    { value: 'linear', label: 'Linear' },
                    { value: 'radial', label: 'Radial' },
                  ]"
                />
              </Field>
              <Field v-if="gType === 'linear'" :label="`Angle — ${angle}°`">
                <Slider v-model="angle" :min="0" :max="360" :step="1" />
              </Field>
              <div class="cg__row">
                <label class="cg__color">
                  <span>Color 1</span>
                  <input v-model="gColor1" type="color" />
                </label>
                <label class="cg__color">
                  <span>Color 2</span>
                  <input v-model="gColor2" type="color" />
                </label>
              </div>
            </template>
          </div>

          <!-- Preview -->
          <div class="cg__preview-wrap">
            <div
              class="cg__preview"
              :style="
                mode === 'shadow' ? { boxShadow: shadowValue } : { background: gradientValue }
              "
            />
          </div>
        </div>

        <!-- CSS output -->
        <Snippet variant="block" title="CSS" :code="cssProp" />
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.cg {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.cg__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 300px);
  gap: 24px;
  align-items: start;
}
.cg__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}
.cg__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
  padding-top: 0.25rem;
}
.cg__color {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.cg__color input {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: none;
  cursor: pointer;
}
.cg__preview-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 2rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-muted, var(--surface-card));
}
.cg__preview {
  width: 150px;
  height: 150px;
  border-radius: 16px;
  background: var(--surface-card);
}
@media (max-width: 720px) {
  .cg__grid {
    grid-template-columns: 1fr;
  }
}
</style>
