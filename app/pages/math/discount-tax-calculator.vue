<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Stat, StatGroup } from '@/components/ui/stat'
import { Alert } from '@/components/ui/alert'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/table'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { applyDiscountStack, calculateTax } from '@/utils/discountTax'

definePageMeta({ layout: 'tool' })

const tool = getTool('math-discount-tax-calculator')!

const MAX_DISCOUNT_ROWS = 5

type Mode = 'discount' | 'tax'
type TaxDirection = 'add' | 'remove'

const MODE_OPTIONS = [
  { value: 'discount', label: 'Discount' },
  { value: 'tax', label: 'Tax' },
]

const DIRECTION_OPTIONS = [
  { value: 'add', label: 'I have the pre-tax amount' },
  { value: 'remove', label: 'I have the total (tax included)' },
]

const mode = ref<Mode>('discount')

function setMode(next: string) {
  mode.value = next as Mode
}

// Discount mode
const originalPrice = ref<number | null>(null)
const discountRows = ref<(number | null)[]>([null])

function addDiscountRow() {
  if (discountRows.value.length >= MAX_DISCOUNT_ROWS) return
  discountRows.value.push(null)
}

function removeDiscountRow(index: number) {
  if (discountRows.value.length <= 1) return
  discountRows.value.splice(index, 1)
}

const activeDiscounts = computed(() => discountRows.value.filter((d): d is number => d !== null))

const discountEmpty = computed(
  () => originalPrice.value === null || activeDiscounts.value.length === 0,
)

const discountResult = computed(() => {
  if (discountEmpty.value) return null
  return applyDiscountStack(originalPrice.value!, activeDiscounts.value)
})

const showDiscountBreakdown = computed(() => activeDiscounts.value.length >= 2)

// Tax mode
const taxDirection = ref<TaxDirection>('add')
const taxAmount = ref<number | null>(null)
const taxRatePercent = ref<number | null>(null)

function setTaxDirection(next: string) {
  taxDirection.value = next as TaxDirection
}

const taxAmountLabel = computed(() =>
  taxDirection.value === 'add' ? 'Pre-tax amount' : 'Total (tax included)',
)

const taxEmpty = computed(() => taxAmount.value === null || taxRatePercent.value === null)

const taxResult = computed(() => {
  if (taxEmpty.value) return null
  return calculateTax({
    amount: taxAmount.value!,
    taxRatePercent: taxRatePercent.value!,
    direction: taxDirection.value,
  })
})

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPercent(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const isEmpty = computed(() => (mode.value === 'discount' ? discountEmpty.value : taxEmpty.value))

const emptyTitle = computed(() =>
  mode.value === 'discount' ? 'Enter a price and discount' : 'Enter an amount and tax rate',
)

const emptyDescription = computed(() =>
  mode.value === 'discount'
    ? 'Enter an original price and at least one discount percentage.'
    : 'Enter an amount and a tax rate to add or remove sales tax.',
)

const discountSummaryText = computed(() => {
  if (!discountResult.value) return ''
  return [
    `Original price: ${fmt(originalPrice.value!)}`,
    `Total discount: ${fmtPercent(discountResult.value.effectiveDiscountPercent)}%`,
    `You save: ${fmt(discountResult.value.totalSavings)}`,
    `Final price: ${fmt(discountResult.value.finalPrice)}`,
  ].join('\n')
})

const taxSummaryText = computed(() => {
  if (!taxResult.value) return ''
  return [
    `Pre-tax amount: ${fmt(taxResult.value.preTaxAmount)}`,
    `Tax amount (${fmtPercent(taxRatePercent.value!)}%): ${fmt(taxResult.value.taxAmount)}`,
    `Total (tax included): ${fmt(taxResult.value.totalAmount)}`,
  ].join('\n')
})

const summaryText = computed(() =>
  mode.value === 'discount' ? discountSummaryText.value : taxSummaryText.value,
)

const { copy: copySummary, copied: summaryCopied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="dtc">
      <SegmentedControl
        :model-value="mode"
        :options="MODE_OPTIONS"
        aria-label="Calculator mode"
        @update:model-value="setMode"
      />

      <div v-if="mode === 'discount'" class="dtc__inputs">
        <Field label="Original price" class="dtc__field">
          <NumberInput v-model="originalPrice" :min="0" :precision="2" />
        </Field>

        <div class="dtc__discount-rows">
          <div v-for="(_, index) in discountRows" :key="index" class="dtc__discount-row">
            <Field v-if="index === 0" label="Discount" class="dtc__field">
              <NumberInput v-model="discountRows[index]" :min="0" :max="100" suffix="%" />
            </Field>
            <NumberInput
              v-else
              v-model="discountRows[index]"
              :min="0"
              :max="100"
              suffix="%"
              :aria-label="`Discount ${index + 1}`"
              class="dtc__field"
            />
            <IconButton
              aria-label="Remove discount"
              class="dtc__remove"
              :disabled="discountRows.length <= 1"
              @click="removeDiscountRow(index)"
            >
              <Icon :name="UI_ICON.trash" size="16" />
            </IconButton>
          </div>
        </div>

        <Button
          variant="ghost"
          :disabled="discountRows.length >= MAX_DISCOUNT_ROWS"
          @click="addDiscountRow"
        >
          <template #icon><Icon :name="UI_ICON.add" size="15" /></template>
          Add another discount
        </Button>
      </div>

      <div v-else class="dtc__tax">
        <SegmentedControl
          :model-value="taxDirection"
          :options="DIRECTION_OPTIONS"
          aria-label="Known amount"
          @update:model-value="setTaxDirection"
        />

        <div class="dtc__inputs">
          <Field :label="taxAmountLabel" class="dtc__field">
            <NumberInput v-model="taxAmount" :min="0" :precision="2" />
          </Field>
          <Field label="Tax rate" class="dtc__field">
            <NumberInput v-model="taxRatePercent" :min="0" suffix="%" />
          </Field>
        </div>
      </div>

      <OutputPanel
        label="Result"
        :empty="isEmpty"
        :live="false"
        :empty-title="emptyTitle"
        :empty-description="emptyDescription"
      >
        <template v-if="!isEmpty" #actions>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Copy summary"
            @click="copySummary(summaryText)"
          >
            <template #icon>
              <Icon :name="summaryCopied ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ summaryCopied ? 'Copied' : 'Copy summary' }}
          </Button>
        </template>

        <div v-if="mode === 'discount' && discountResult" class="dtc__result">
          <Alert v-if="showDiscountBreakdown" tone="info">
            Discounts are applied one after another, not added together — 20% then 10% off is 28%
            off total, not 30%.
          </Alert>

          <StatGroup :columns="3">
            <Stat
              label="Total discount"
              :value="`${fmtPercent(discountResult.effectiveDiscountPercent)}%`"
            />
            <Stat label="You save" :value="fmt(discountResult.totalSavings)" />
            <Stat label="Final price" :value="fmt(discountResult.finalPrice)" />
          </StatGroup>

          <Table v-if="showDiscountBreakdown" density="compact">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Step</TableHeaderCell>
                <TableHeaderCell numeric>Discount</TableHeaderCell>
                <TableHeaderCell numeric>Price before</TableHeaderCell>
                <TableHeaderCell numeric>Price after</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow v-for="(step, index) in discountResult.steps" :key="index">
                <TableCell>{{ index + 1 }}</TableCell>
                <TableCell numeric>{{ fmtPercent(step.percent) }}%</TableCell>
                <TableCell numeric>{{ fmt(step.priceBefore) }}</TableCell>
                <TableCell numeric>{{ fmt(step.priceAfter) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <StatGroup v-else-if="mode === 'tax' && taxResult" :columns="3">
          <Stat label="Pre-tax amount" :value="fmt(taxResult.preTaxAmount)" />
          <Stat label="Tax amount" :value="fmt(taxResult.taxAmount)" />
          <Stat label="Total (tax included)" :value="fmt(taxResult.totalAmount)" />
        </StatGroup>
      </OutputPanel>
    </div>
  </ToolPage>
</template>

<style scoped>
.dtc {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.dtc__inputs {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem;
}
.dtc__field {
  flex: 1;
  min-width: 160px;
}
.dtc__tax {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.dtc__discount-rows {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}
.dtc__discount-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  min-width: 0;
}
.dtc__remove {
  flex-shrink: 0;
  margin-bottom: 0.125rem;
}
.dtc__result {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
