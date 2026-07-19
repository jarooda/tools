<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { CURRENCIES, convertToAll, type Rates, type CurrencyResult } from '@/utils/currency'

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

const amount = ref<number | null>(100)
const from = ref('USD')

const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))

const rates = computed<Rates | null>(() => data.value?.rates ?? null)

function format(n: number, code: string): string {
  const zeroDecimal = code === 'JPY' || code === 'KRW' || code === 'IDR'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: zeroDecimal ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  }).format(n)
}

const results = ref<Array<CurrencyResult & { display: string; isSource: boolean }>>([])

watch(
  [amount, from, rates],
  ([amt, unit, table]) => {
    if (amt == null || !table) {
      results.value = []
      return
    }
    results.value = convertToAll(amt, unit, table).map((r) => ({
      ...r,
      display: format(r.value, r.code),
      isSource: r.code === unit,
    }))
  },
  { immediate: true },
)

const { copy, copied } = useCopy()
const copiedCode = ref<string | null>(null)

async function copyResult(code: string, text: string) {
  await copy(text)
  copiedCode.value = code
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="conv">
      <!-- Left: amount + source currency -->
      <div class="conv__input">
        <Field label="Amount">
          <NumberInput v-model="amount" :step="1" placeholder="Enter an amount" align="left" />
        </Field>
        <Field label="From currency">
          <Select v-model="from" :options="currencyOptions" />
        </Field>
        <p v-if="data?.date" class="conv__meta">
          Rates as of {{ data.date }}<span v-if="data.stale"> · showing last cached rates</span>
        </p>
      </div>

      <!-- Right: converted amounts -->
      <div class="conv__results">
        <span class="conv__results-label">Converts to</span>

        <!-- Loading: fetching rates or before hydration -->
        <ul v-if="pending || (!rates && !error)" class="conv__list" aria-hidden="true">
          <li v-for="c in CURRENCIES.slice(0, 8)" :key="c.code" class="conv__row conv__row--skel">
            <Skeleton variant="text" width="120px" />
            <Skeleton variant="rect" width="72px" height="30px" radius="8px" />
          </li>
        </ul>

        <!-- Error: the FX feed is unreachable -->
        <EmptyState
          v-else-if="error"
          class="conv__empty"
          bordered
          size="sm"
          title="Couldn't load exchange rates"
          description="The rate service is unreachable right now."
        >
          <template #icon>
            <Icon :name="UI_ICON.private" size="22" />
          </template>
          <template #actions>
            <Button size="sm" @click="refresh()">Try again</Button>
          </template>
        </EmptyState>

        <!-- Empty: no amount entered -->
        <EmptyState
          v-else-if="amount == null"
          class="conv__empty"
          bordered
          size="sm"
          title="Nothing to convert yet"
          description="Enter an amount on the left to see it in every currency."
        >
          <template #icon>
            <Icon :name="UI_ICON.emptyInput" size="22" />
          </template>
        </EmptyState>

        <!-- Results -->
        <ul v-else class="conv__list">
          <li
            v-for="r in results"
            :key="r.code"
            class="conv__row"
            :class="{ 'conv__row--source': r.isSource }"
          >
            <div class="conv__row-main">
              <span class="conv__row-symbol">{{ r.symbol }}</span>
              <span class="conv__row-value">{{ r.display }}</span>
              <span class="conv__row-code">{{ r.code }}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              :aria-label="`Copy ${r.name} value`"
              @click="copyResult(r.code, r.display)"
            >
              <template #icon>
                <Icon
                  :name="copied && copiedCode === r.code ? UI_ICON.check : UI_ICON.copy"
                  size="15"
                />
              </template>
              {{ copied && copiedCode === r.code ? 'Copied' : 'Copy' }}
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
.conv__meta {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-tertiary);
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
  max-height: 60vh;
  overflow-y: auto;
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
.conv__empty {
  width: 100%;
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

@media (max-width: 640px) {
  .conv {
    grid-template-columns: 1fr;
  }
}
</style>
