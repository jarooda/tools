<script setup lang="ts" generic="U extends string">
import { computed, onMounted, ref, watch } from 'vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { convertLinearAll, type LinearUnit } from '@/utils/linear'

// eslint-disable-next-line no-unused-vars
type ConvertFn<U> = (value: number, from: U, to: U) => number
// eslint-disable-next-line no-unused-vars
type FormatFn<U> = (n: number, unit: U) => string

const props = withDefaults(
  defineProps<{
    /** Units to convert between (must share a base unit via `factor`). */
    units: LinearUnit<U>[]
    /** Which unit the input starts in. */
    initialUnit: U
    /** Starting value. */
    initialValue?: number
    /** Label above the value input, e.g. "Weight". */
    valueLabel?: string
    /** Line shown in the empty state. */
    emptyDescription?: string
    /**
     * Force the loading (skeleton) state on, in addition to the built-in
     * pre-hydration skeleton — for tools whose results depend on an async
     * fetch (e.g. currency's exchange rates).
     */
    loading?: boolean
    /**
     * When set, results are replaced with an error `EmptyState`. Pair with
     * the `#actions` slot for a retry button.
     */
    error?: string | null
    /**
     * Override the conversion math. Defaults to the linear `factor`-based
     * conversion; pass this for non-linear quantities (e.g. temperature,
     * which has an offset, not just a ratio).
     */
    convert?: ConvertFn<U>
    /** Override the display formatting of a converted value. */
    formatValue?: FormatFn<U>
  }>(),
  {
    initialValue: 1,
    valueLabel: 'Value',
    emptyDescription: 'Enter a value on the left to see it in every unit.',
    loading: false,
    error: null,
    convert: undefined,
    formatValue: undefined,
  },
)

const value = ref<number | null>(props.initialValue)
const from = ref<U>(props.initialUnit)

// Loading state: the tool is interactive, so results only exist once the client
// has hydrated. Until then we render a skeleton (never a blank panel).
const ready = ref(false)
onMounted(() => {
  ready.value = true
})

// Group the picker into optgroups when units declare a `group`; otherwise the
// SegmentedControl handles a short, flat list (≤5 units).
const hasGroups = computed(() => props.units.some((u) => u.group))
const useSegmented = computed(() => !hasGroups.value && props.units.length <= 5)

const groupedOptions = computed(() => {
  const order: string[] = []
  const byGroup = new Map<string, { value: U; label: string }[]>()
  for (const u of props.units) {
    const g = u.group ?? ''
    if (!byGroup.has(g)) {
      byGroup.set(g, [])
      order.push(g)
    }
    byGroup.get(g)!.push({ value: u.unit, label: `${u.name} (${u.symbol})` })
  }
  return order.map((label) => ({ label, options: byGroup.get(label)! }))
})

const segmentedOptions = computed(() =>
  props.units.map((u) => ({ value: u.unit, label: u.symbol })),
)

const flatOptions = computed(() =>
  props.units.map((u) => ({ value: u.unit, label: `${u.name} (${u.symbol})` })),
)

/** Format a converted value: more decimals for small numbers, fewer for big. */
function defaultFormat(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  const decimals = abs < 1 ? 6 : abs < 1000 ? 4 : 2
  return Number(n.toFixed(decimals)).toString().replace(/^-0$/, '0')
}
const format = (n: number, unit: U) => (props.formatValue ?? defaultFormat)(n, unit)

interface ResultRow {
  unit: U
  name: string
  symbol: string
  display: string
  isSource: boolean
}

const results = ref<ResultRow[]>([])

watch(
  // Re-run on `loading` transitions too, so async-data tools (currency) refresh
  // their results once the fetch resolves, even if `value`/`from` didn't change.
  [value, from, () => props.loading],
  ([val, unit]) => {
    if (val == null) {
      results.value = []
      return
    }
    const converted = props.convert
      ? props.units.map((u) => ({ ...u, value: props.convert!(val, unit, u.unit) }))
      : convertLinearAll(val, unit, props.units)
    results.value = converted.map((r) => ({
      unit: r.unit,
      name: r.name,
      symbol: r.symbol,
      display: format(r.value, r.unit),
      isSource: r.unit === unit,
    }))
  },
  { immediate: true },
)

const { copy, copied } = useCopy()
const copiedUnit = ref<U | null>(null)

async function copyResult(unit: U, text: string) {
  await copy(text)
  copiedUnit.value = unit
}
</script>

<template>
  <div class="conv">
    <!-- Left: the value + unit to convert from -->
    <div class="conv__input">
      <Field :label="valueLabel">
        <NumberInput v-model="value" :step="1" placeholder="Enter a value" align="left" />
      </Field>
      <Field label="From unit">
        <SegmentedControl
          v-if="useSegmented"
          v-model="from"
          :options="segmentedOptions"
          full-width
        />
        <Select v-else v-model="from" :options="hasGroups ? groupedOptions : flatOptions" />
      </Field>
      <slot name="input-footer" :value="value" :from="from" />
    </div>

    <!-- Right: converted values, each copyable -->
    <div class="conv__results" aria-live="polite">
      <h2 class="conv__results-label">Converts to</h2>

      <!-- Loading: skeleton rows while the client hydrates (or an async fetch is pending) -->
      <ul v-if="!ready || loading" class="conv__list" aria-hidden="true">
        <li v-for="u in units" :key="u.unit" class="conv__row conv__row--skel">
          <Skeleton variant="text" width="88px" />
          <Skeleton variant="rect" width="72px" height="30px" radius="8px" />
        </li>
      </ul>

      <!-- Error -->
      <EmptyState
        v-else-if="error"
        class="conv__empty"
        bordered
        size="sm"
        title="Something went wrong"
        :description="error"
      >
        <template #icon>
          <Icon :name="UI_ICON.private" size="22" />
        </template>
        <template v-if="$slots.actions" #actions>
          <slot name="actions" />
        </template>
      </EmptyState>

      <!-- Empty: user cleared the input -->
      <EmptyState
        v-else-if="value == null"
        class="conv__empty"
        bordered
        size="sm"
        title="Nothing to convert yet"
        :description="emptyDescription"
      >
        <template #icon>
          <Icon :name="UI_ICON.emptyInput" size="22" />
        </template>
      </EmptyState>

      <!-- Results -->
      <ul v-else class="conv__list">
        <li
          v-for="r in results"
          :key="r.unit"
          class="conv__row"
          :class="{ 'conv__row--source': r.isSource }"
        >
          <slot name="result-main" :row="r">
            <div class="conv__row-main">
              <span class="conv__row-value">{{ r.display }}</span>
              <span class="conv__row-symbol">{{ r.symbol }}</span>
            </div>
          </slot>
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
  margin: 0;
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
.conv__row--skel {
  justify-content: space-between;
}
.conv__empty {
  width: 100%;
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
