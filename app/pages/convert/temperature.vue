<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import {
  TEMPERATURE_UNITS,
  convertToAll,
  isBelowAbsoluteZero,
  type TemperatureUnit,
} from '@/utils/temperature'

definePageMeta({ layout: 'tool' })

const tool = getTool('temperature')!

const value = ref<number | null>(0)
const from = ref<TemperatureUnit>('c')

// Loading state: the tool is interactive, so results only exist once the
// client has hydrated. Until then we render a skeleton (never a blank panel).
const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const unitOptions = TEMPERATURE_UNITS.map((u) => ({ value: u.unit, label: u.symbol }))

/** Format a converted value for display: trim to 2 decimals, drop trailing zeros. */
function format(n: number): string {
  return Number(n.toFixed(2)).toString().replace(/^-0$/, '0')
}

interface ResultRow {
  unit: TemperatureUnit
  name: string
  symbol: string
  display: string
  isSource: boolean
}

const results = ref<ResultRow[]>([])
const belowAbsoluteZero = ref(false)

// Watch the value + source unit; recompute the conversions whenever either
// changes (the NumberInput emits live, so this fires on every keystroke).
watch(
  [value, from],
  ([val, unit]) => {
    if (val == null) {
      results.value = []
      belowAbsoluteZero.value = false
      return
    }
    results.value = convertToAll(val, unit).map((r) => ({
      unit: r.unit,
      name: r.name,
      symbol: r.symbol,
      display: format(r.value),
      isSource: r.unit === unit,
    }))
    belowAbsoluteZero.value = isBelowAbsoluteZero(val, unit)
  },
  { immediate: true },
)

const { copy, copied } = useCopy()
const copiedUnit = ref<TemperatureUnit | null>(null)

async function copyResult(unit: TemperatureUnit, text: string) {
  await copy(text)
  copiedUnit.value = unit
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="temp">
      <!-- Left: the value + unit to convert from -->
      <div class="temp__input">
        <Field label="Temperature">
          <NumberInput v-model="value" :step="1" placeholder="Enter a value" align="left" />
        </Field>
        <Field label="From unit">
          <SegmentedControl v-model="from" :options="unitOptions" full-width />
        </Field>
        <p v-if="belowAbsoluteZero" class="temp__warn" role="alert">
          Below absolute zero (−273.15 °C) — physically impossible, but here's the math.
        </p>
      </div>

      <!-- Right: converted values, each copyable -->
      <div class="temp__results">
        <span class="temp__results-label">Converts to</span>

        <!-- Loading: skeleton rows while the client hydrates -->
        <ul v-if="!ready" class="temp__list" aria-hidden="true">
          <li v-for="u in TEMPERATURE_UNITS" :key="u.unit" class="temp__row temp__row--skel">
            <Skeleton variant="text" width="88px" />
            <Skeleton variant="rect" width="72px" height="30px" radius="8px" />
          </li>
        </ul>

        <!-- Empty: user cleared the input -->
        <EmptyState
          v-else-if="value == null"
          class="temp__empty"
          bordered
          size="sm"
          title="Nothing to convert yet"
          description="Enter a temperature on the left to see it in every unit."
        >
          <template #icon>
            <Icon :name="UI_ICON.emptyInput" size="22" />
          </template>
        </EmptyState>

        <!-- Results -->
        <ul v-else class="temp__list">
          <li
            v-for="r in results"
            :key="r.unit"
            class="temp__row"
            :class="{ 'temp__row--source': r.isSource }"
          >
            <div class="temp__row-main">
              <span class="temp__row-value">{{ r.display }}</span>
              <span class="temp__row-symbol">{{ r.symbol }}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              :aria-label="`Copy ${r.name} value`"
              @click="copyResult(r.unit, r.display)"
            >
              <template #icon>
                <Icon
                  :name="copied && copiedUnit === r.unit ? UI_ICON.check : UI_ICON.copy"
                  size="15"
                />
              </template>
              {{ copied && copiedUnit === r.unit ? 'Copied' : 'Copy' }}
            </Button>
          </li>
        </ul>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.temp {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.temp__input {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.temp__warn {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--warning-text);
}
.temp__results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.temp__results-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.temp__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.temp__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.5rem 0.6rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.temp__row--source {
  border-color: var(--accent-muted, var(--accent));
  background: var(--accent-subtle);
}
.temp__row--skel {
  justify-content: space-between;
}
.temp__empty {
  width: 100%;
}
.temp__row-main {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  min-width: 0;
}
.temp__row-value {
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.temp__row-symbol {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .temp {
    grid-template-columns: 1fr;
  }
}
</style>
