<script setup lang="ts">
import { ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { LENGTH_UNITS, convertToAll, type LengthUnit } from '@/utils/length'

definePageMeta({ layout: 'tool' })

const tool = getTool('length')!

const value = ref<number | null>(1)
const from = ref<LengthUnit>('m')

// Grouped picker: metric units first, then imperial/US.
const unitOptions = [
  {
    label: 'Metric',
    options: LENGTH_UNITS.filter((u) => u.system === 'metric').map((u) => ({
      value: u.unit,
      label: `${u.name} (${u.symbol})`,
    })),
  },
  {
    label: 'Imperial / US',
    options: LENGTH_UNITS.filter((u) => u.system === 'imperial').map((u) => ({
      value: u.unit,
      label: `${u.name} (${u.symbol})`,
    })),
  },
]

/** Format a converted value: up to 6 significant-ish decimals, no trailing zeros. */
function format(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  // Keep small numbers readable, big numbers exact-ish.
  const decimals = abs < 1 ? 6 : abs < 1000 ? 4 : 2
  return Number(n.toFixed(decimals)).toString().replace(/^-0$/, '0')
}

interface ResultRow {
  unit: LengthUnit
  name: string
  symbol: string
  display: string
  isSource: boolean
}

const results = ref<ResultRow[]>([])

watch(
  [value, from],
  ([val, unit]) => {
    if (val == null) {
      results.value = []
      return
    }
    results.value = convertToAll(val, unit).map((r) => ({
      unit: r.unit,
      name: r.name,
      symbol: r.symbol,
      display: format(r.value),
      isSource: r.unit === unit,
    }))
  },
  { immediate: true },
)

const { copy, copied } = useCopy()
const copiedUnit = ref<LengthUnit | null>(null)

async function copyResult(unit: LengthUnit, text: string) {
  await copy(text)
  copiedUnit.value = unit
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="conv">
      <!-- Left: the value + unit to convert from -->
      <div class="conv__input">
        <Field label="Length">
          <NumberInput v-model="value" :step="1" placeholder="Enter a value" align="left" />
        </Field>
        <Field label="From unit">
          <Select v-model="from" :options="unitOptions" />
        </Field>
      </div>

      <!-- Right: converted values, each copyable -->
      <div class="conv__results">
        <span class="conv__results-label">Converts to</span>
        <ul class="conv__list">
          <li
            v-for="r in results"
            :key="r.unit"
            class="conv__row"
            :class="{ 'conv__row--source': r.isSource }"
          >
            <div class="conv__row-main">
              <span class="conv__row-value">{{ r.display }}</span>
              <span class="conv__row-symbol">{{ r.symbol }}</span>
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
.conv {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.conv__input {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.conv__results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.conv__results-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.conv__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.conv__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.5rem 0.6rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.conv__row--source {
  border-color: var(--accent-muted, var(--accent));
  background: var(--accent-subtle);
}
.conv__row-main {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  min-width: 0;
}
.conv__row-value {
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.conv__row-symbol {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .conv {
    grid-template-columns: 1fr;
  }
}
</style>
