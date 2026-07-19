<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { parseColor } from '@/utils/colorConvert'
import { rgbToHex, rgbToHsl, rgbString, hslString } from '@/utils/colorFormat'

definePageMeta({ layout: 'tool' })

const tool = getTool('color-convert')!

const input = ref('#3366ff')
const ready = ref(false)

const rgb = computed(() => parseColor(input.value))
const invalid = computed(() => input.value.trim() !== '' && rgb.value === null)

const hex = computed(() => (rgb.value ? rgbToHex(rgb.value.r, rgb.value.g, rgb.value.b) : ''))
const rgbText = computed(() => (rgb.value ? rgbString(rgb.value) : ''))
const hslText = computed(() =>
  rgb.value ? hslString(rgbToHsl(rgb.value.r, rgb.value.g, rgb.value.b)) : '',
)

// Keep the native colour picker in sync (it only understands #rrggbb).
const picker = computed({
  get: () => hex.value || '#000000',
  set: (v: string) => (input.value = v),
})

const rows = computed(() => [
  { label: 'HEX', value: hex.value },
  { label: 'RGB', value: rgbText.value },
  { label: 'HSL', value: hslText.value },
])

const lastCopied = ref('')
const { copy } = useCopy()
let timer: ReturnType<typeof setTimeout> | undefined
function copyValue(v: string) {
  copy(v)
  lastCopied.value = v
  clearTimeout(timer)
  timer = setTimeout(() => (lastCopied.value = ''), 1200)
}

onMounted(() => {
  ready.value = true
})
</script>

<template>
  <ToolPage :tool="tool">
    <div class="cc">
      <div class="cc__input">
        <input v-model="picker" type="color" class="cc__picker" aria-label="Pick a color" />
        <Field label="Color" class="cc__field" :error="invalid ? 'Unrecognized color' : ''">
          <Input v-model="input" :invalid="invalid" placeholder="#3366ff, rgb(…), hsl(…)" />
        </Field>
      </div>

      <div v-if="!ready" aria-hidden="true">
        <Skeleton variant="rect" width="100%" height="180px" radius="10px" />
      </div>
      <template v-else>
        <div class="cc__swatch" :style="{ background: hex || 'transparent' }" />
        <div class="cc__rows">
          <div v-for="row in rows" :key="row.label" class="cc__row">
            <span class="cc__row-label">{{ row.label }}</span>
            <code class="cc__row-value">{{ row.value || '—' }}</code>
            <Button
              v-if="row.value"
              variant="ghost"
              size="sm"
              :aria-label="`Copy ${row.label}`"
              @click="copyValue(row.value)"
            >
              <template #icon>
                <Icon :name="lastCopied === row.value ? UI_ICON.check : UI_ICON.copy" size="15" />
              </template>
              {{ lastCopied === row.value ? 'Copied' : 'Copy' }}
            </Button>
          </div>
        </div>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.cc {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.cc__input {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}
.cc__picker {
  width: 48px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: none;
  cursor: pointer;
}
.cc__field {
  flex: 1;
  max-width: 360px;
}
.cc__swatch {
  height: 96px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
}
.cc__rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cc__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.5rem 0.5rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.cc__row-label {
  width: 44px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
}
.cc__row-value {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.9375rem;
  color: var(--text-primary);
  word-break: break-all;
}
</style>
