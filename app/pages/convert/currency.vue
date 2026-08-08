<script setup lang="ts">
import { computed } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import UnitConverter from '@/components/tool/UnitConverter.vue'
import { Button } from '@/components/ui/button'
import { getTool } from '@/lib/tools/registry'
import { CURRENCIES, convertCurrency, type Rates } from '@/utils/currency'
import type { LinearUnit } from '@/utils/linear'

definePageMeta({ layout: 'tool' })

const tool = getTool('currency')!

// Rates are fetched client-side only: the tool is interactive and we don't want
// SSR/prerender to depend on the upstream FX feed. `pending` drives the skeleton.
const { data, pending, error, refresh } = await useFetch<{
  base: string
  rates: Rates
  date: string
  stale?: boolean
}>('/api/fx', { server: false, lazy: true })

const rates = computed<Rates | null>(() => data.value?.rates ?? null)

// `factor` is unused — currency routes conversion through `rates`, passed via
// the `convert` prop below — but the shared unit shape requires the field.
const CURRENCY_LINEAR_UNITS: LinearUnit<string>[] = CURRENCIES.map((c) => ({
  unit: c.code,
  name: c.name,
  symbol: c.symbol,
  factor: 1,
}))

function convert(amount: number, from: string, to: string): number {
  if (!rates.value) return NaN
  return convertCurrency(amount, from, to, rates.value)
}

function format(n: number, code: string): string {
  const zeroDecimal = code === 'JPY' || code === 'KRW' || code === 'IDR'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: zeroDecimal ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  }).format(n)
}
</script>

<template>
  <ToolPage :tool="tool">
    <UnitConverter
      :units="CURRENCY_LINEAR_UNITS"
      initial-unit="USD"
      :initial-value="100"
      value-label="Amount"
      empty-description="Enter an amount on the left to see it in every currency."
      :convert="convert"
      :format-value="format"
      :loading="pending || (!rates && !error)"
      :error="error ? 'The rate service is unreachable right now.' : null"
    >
      <template #input-footer>
        <p v-if="data?.date" class="conv__meta">
          Rates as of {{ data.date }}<span v-if="data.stale"> · showing last cached rates</span>
        </p>
      </template>
      <template #actions>
        <Button size="sm" @click="refresh()">Try again</Button>
      </template>
      <template #result-main="{ row }">
        <div class="conv__row-main">
          <span class="conv__row-symbol">{{ row.symbol }}</span>
          <span class="conv__row-value">{{ row.display }}</span>
          <span class="conv__row-code">{{ row.unit }}</span>
        </div>
      </template>
    </UnitConverter>
  </ToolPage>
</template>

<style scoped>
.conv__meta {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
.conv__row-main {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  min-width: 0;
}
.conv__row-symbol {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-tertiary);
}
.conv__row-value {
  font-size: 1.2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.conv__row-code {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}
/* 22 currencies is a long list — scroll it rather than pushing the page down. */
:deep(.conv__list) {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
