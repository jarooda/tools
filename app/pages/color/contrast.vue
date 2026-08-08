<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert } from '@/components/ui/alert'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { parseColor } from '@/utils/colorConvert'
import { rgbToHex } from '@/utils/colorFormat'
import { contrastRatio, wcagCompliance, formatRatio } from '@/utils/contrast'

definePageMeta({ layout: 'tool' })

const tool = getTool('color-contrast')!

const fg = ref('#1f2937')
const bg = ref('#ffffff')
const ready = ref(false)

const fgRgb = computed(() => parseColor(fg.value))
const bgRgb = computed(() => parseColor(bg.value))
const fgInvalid = computed(() => fg.value.trim() !== '' && fgRgb.value === null)
const bgInvalid = computed(() => bg.value.trim() !== '' && bgRgb.value === null)

const fgHex = computed(() =>
  fgRgb.value ? rgbToHex(fgRgb.value.r, fgRgb.value.g, fgRgb.value.b) : '#000000',
)
const bgHex = computed(() =>
  bgRgb.value ? rgbToHex(bgRgb.value.r, bgRgb.value.g, bgRgb.value.b) : '#ffffff',
)

const ratio = computed(() =>
  fgRgb.value && bgRgb.value ? contrastRatio(fgRgb.value, bgRgb.value) : null,
)
const compliance = computed(() => (ratio.value != null ? wcagCompliance(ratio.value) : null))

const fgPicker = computed({ get: () => fgHex.value, set: (v: string) => (fg.value = v) })
const bgPicker = computed({ get: () => bgHex.value, set: (v: string) => (bg.value = v) })

const checks = computed(() => {
  const c = compliance.value
  if (!c) return []
  return [
    { label: 'AA · normal text', pass: c.aaNormal },
    { label: 'AA · large text', pass: c.aaLarge },
    { label: 'AAA · normal text', pass: c.aaaNormal },
    { label: 'AAA · large text', pass: c.aaaLarge },
  ]
})

onMounted(() => {
  ready.value = true
})
</script>

<template>
  <ToolPage :tool="tool">
    <div class="ct">
      <div class="ct__inputs">
        <div class="ct__color">
          <input v-model="fgPicker" type="color" class="ct__picker" aria-label="Text color" />
          <Field label="Text color" :error="fgInvalid ? 'Invalid' : ''">
            <Input v-model="fg" :invalid="fgInvalid" />
          </Field>
        </div>
        <div class="ct__color">
          <input v-model="bgPicker" type="color" class="ct__picker" aria-label="Background color" />
          <Field label="Background" :error="bgInvalid ? 'Invalid' : ''">
            <Input v-model="bg" :invalid="bgInvalid" />
          </Field>
        </div>
      </div>

      <div v-if="!ready" aria-hidden="true">
        <Skeleton variant="rect" width="100%" height="220px" radius="10px" />
      </div>
      <div v-else class="ct__results" aria-live="polite">
        <template v-if="ratio != null">
          <div class="ct__preview" :style="{ background: bgHex, color: fgHex }">
            <p class="ct__sample-lg">Large sample text</p>
            <p class="ct__sample-sm">The quick brown fox jumps over the lazy dog.</p>
          </div>

          <div class="ct__ratio">
            <span class="ct__ratio-value">{{ formatRatio(ratio) }}</span>
            <span class="ct__ratio-label">contrast ratio</span>
          </div>

          <div class="ct__checks">
            <div
              v-for="c in checks"
              :key="c.label"
              class="ct__check"
              :data-pass="c.pass || undefined"
            >
              <Icon :name="c.pass ? UI_ICON.check : UI_ICON.remove" size="16" />
              <span>{{ c.label }}</span>
              <strong>{{ c.pass ? 'Pass' : 'Fail' }}</strong>
            </div>
          </div>
        </template>
        <Alert v-else tone="danger">Enter two valid colors to compare.</Alert>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.ct {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.ct__inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}
.ct__results {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.ct__color {
  display: flex;
  align-items: flex-end;
  gap: 0.6rem;
}
.ct__picker {
  width: 44px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: none;
  cursor: pointer;
}
.ct__preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
}
.ct__sample-lg {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}
.ct__sample-sm {
  margin: 0;
  font-size: 0.9375rem;
}
.ct__ratio {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.ct__ratio-value {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.ct__ratio-label {
  font-size: 0.875rem;
  color: var(--text-tertiary);
}
.ct__checks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}
.ct__check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
  color: var(--danger-text, var(--warning-text));
  font-size: 0.875rem;
}
.ct__check[data-pass] {
  color: var(--success-text, var(--success));
}
.ct__check span {
  flex: 1;
  color: var(--text-secondary);
}
.ct__check strong {
  font-weight: 700;
}
</style>
