<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Stat, StatGroup } from '@/components/ui/stat'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert } from '@/components/ui/alert'
import { Chart, type ChartPoint } from '@/components/ui/chart'
import { Accordion, AccordionItem } from '@/components/ui/accordion'
import { Pagination } from '@/components/ui/pagination'
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
import { parseDateOnly } from '@/utils/dateDuration'
import { buildAmortizationSchedule, type AmortizationRow } from '@/utils/loanAmortization'

definePageMeta({ layout: 'tool' })

const tool = getTool('math-loan-calculator')!

const MAX_TERM_MONTHS = 600
const SCHEDULE_PAGE_SIZE = 24

const TERM_UNIT_OPTIONS = [
  { value: 'years', label: 'Years' },
  { value: 'months', label: 'Months' },
]

type TermUnit = 'years' | 'months'

const principal = ref<number | null>(300_000)
const rate = ref<number | null>(6.5)
const termUnit = ref<TermUnit>('years')
const termValue = ref<number | null>(30)
const extraPayment = ref<number | null>(0)
const startDateText = ref('')

const ready = ref(false)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function todayDateOnly(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

onMounted(() => {
  startDateText.value = todayDateOnly()
  ready.value = true
})

function setTermUnit(next: string) {
  const unit = next as TermUnit
  if (unit === termUnit.value) return
  if (termValue.value != null) {
    termValue.value =
      unit === 'months'
        ? Math.min(MAX_TERM_MONTHS, Math.round(termValue.value * 12))
        : Math.max(1, Math.round(termValue.value / 12))
  }
  termUnit.value = unit
}

const termMax = computed(() =>
  termUnit.value === 'years' ? MAX_TERM_MONTHS / 12 : MAX_TERM_MONTHS,
)

const termMonths = computed(() => {
  if (termValue.value == null) return 0
  const months = termUnit.value === 'years' ? termValue.value * 12 : termValue.value
  return Math.min(MAX_TERM_MONTHS, Math.max(0, Math.round(months)))
})

const startDateMs = computed(() => parseDateOnly(startDateText.value))

const isEmpty = computed(
  () =>
    principal.value === null ||
    rate.value === null ||
    termValue.value === null ||
    termMonths.value <= 0,
)

const loanResult = computed(() => {
  if (isEmpty.value) return null
  return buildAmortizationSchedule({
    principal: principal.value!,
    annualRatePct: rate.value!,
    termMonths: termMonths.value,
    extraMonthlyPayment: extraPayment.value ?? 0,
    startDateMs: startDateMs.value,
  })
})

const baselineResult = computed(() => {
  if (isEmpty.value || !extraPayment.value || extraPayment.value <= 0) return null
  return buildAmortizationSchedule({
    principal: principal.value!,
    annualRatePct: rate.value!,
    termMonths: termMonths.value,
    extraMonthlyPayment: 0,
    startDateMs: startDateMs.value,
  })
})

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateHuman(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDuration(months: number): string {
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years > 0 && rem > 0) return `${years}yr ${rem}mo`
  if (years > 0) return `${years}yr`
  return `${rem}mo`
}

const payoffValue = computed(() => {
  if (!loanResult.value) return ''
  return loanResult.value.payoffDateMs !== null
    ? formatDateHuman(loanResult.value.payoffDateMs)
    : formatDuration(loanResult.value.payoffMonths)
})

const payoffCaption = computed(() => {
  if (!loanResult.value) return ''
  return loanResult.value.payoffDateMs !== null
    ? formatDuration(loanResult.value.payoffMonths)
    : `${loanResult.value.payoffMonths.toLocaleString()} payments`
})

const savingsMonths = computed(() => {
  if (!baselineResult.value || !loanResult.value) return 0
  return baselineResult.value.payoffMonths - loanResult.value.payoffMonths
})

const savingsInterest = computed(() => {
  if (!baselineResult.value || !loanResult.value) return 0
  return baselineResult.value.totalInterest - loanResult.value.totalInterest
})

const savingsText = computed(() => {
  if (!baselineResult.value || savingsMonths.value <= 0) return ''
  const monthsLabel = savingsMonths.value === 1 ? '1 month' : `${savingsMonths.value} months`
  return `Paying an extra ${fmt(extraPayment.value ?? 0)}/month saves you ${monthsLabel} and ${fmt(savingsInterest.value)} in interest.`
})

interface LoanChartSeries {
  name: string
  data: ChartPoint[]
}

const chartSeries = computed<LoanChartSeries[]>(() => {
  if (!loanResult.value) return []
  return [
    {
      name: 'Principal',
      data: loanResult.value.yearly.map((y) => ({ label: String(y.year), value: y.principalPaid })),
    },
    {
      name: 'Interest',
      data: loanResult.value.yearly.map((y) => ({ label: String(y.year), value: y.interestPaid })),
    },
  ]
})

const schedulePage = ref(1)

watch(loanResult, () => {
  schedulePage.value = 1
})

const scheduleRows = computed<AmortizationRow[]>(() => loanResult.value?.schedule ?? [])

const schedulePageCount = computed(() =>
  Math.max(1, Math.ceil(scheduleRows.value.length / SCHEDULE_PAGE_SIZE)),
)

const pagedScheduleRows = computed(() => {
  const start = (schedulePage.value - 1) * SCHEDULE_PAGE_SIZE
  return scheduleRows.value.slice(start, start + SCHEDULE_PAGE_SIZE)
})

function rowDateLabel(row: AmortizationRow): string {
  return row.dateMs !== null ? formatDateHuman(row.dateMs) : `Month ${row.paymentNumber}`
}

const summaryText = computed(() => {
  if (!loanResult.value) return ''
  return [
    `Monthly payment: ${fmt(loanResult.value.scheduledMonthlyPayment)}`,
    `Total interest paid: ${fmt(loanResult.value.totalInterest)}`,
    `Total paid: ${fmt(loanResult.value.totalPaid)}`,
    `Payoff date: ${payoffValue.value} (${payoffCaption.value})`,
  ].join('\n')
})

const { copy: copySummary, copied: summaryCopied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="lc">
      <template v-if="!ready">
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="180px" radius="10px" />
      </template>

      <template v-else>
        <div class="lc__inputs">
          <Field label="Principal" class="lc__field">
            <NumberInput v-model="principal" :min="1" :precision="2" />
          </Field>
          <Field label="Annual interest rate" class="lc__field">
            <NumberInput v-model="rate" :min="0" :max="100" :precision="3" suffix="%" />
          </Field>
          <Field label="Term" class="lc__field lc__field--term">
            <div class="lc__term">
              <NumberInput v-model="termValue" :min="1" :max="termMax" :precision="0" />
              <SegmentedControl
                :model-value="termUnit"
                :options="TERM_UNIT_OPTIONS"
                aria-label="Term unit"
                @update:model-value="setTermUnit"
              />
            </div>
          </Field>
          <Field label="Extra monthly payment" class="lc__field">
            <NumberInput v-model="extraPayment" :min="0" :precision="2" />
          </Field>
          <Field label="Loan start date" class="lc__field" optional>
            <Input v-model="startDateText" type="date" />
          </Field>
        </div>

        <!--
          live="false": NumberInput commits per keystroke, not a ticking clock —
          same rationale as duration.vue.
        -->
        <OutputPanel
          label="Result"
          :empty="isEmpty"
          :live="false"
          empty-title="Enter loan details"
          empty-description="Enter a principal, interest rate, and term to calculate your payment."
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

          <div v-if="loanResult" class="lc__result">
            <StatGroup>
              <Stat label="Monthly payment" :value="fmt(loanResult.scheduledMonthlyPayment)" />
              <Stat label="Total interest paid" :value="fmt(loanResult.totalInterest)" />
              <Stat label="Total paid" :value="fmt(loanResult.totalPaid)" />
              <Stat label="Payoff date" :value="payoffValue" :caption="payoffCaption" />
            </StatGroup>

            <Alert v-if="savingsText" tone="info">{{ savingsText }}</Alert>

            <div class="lc__chart" aria-hidden="true">
              <Chart type="bar" :stacked="true" :series="chartSeries" :value-format="fmt" />
            </div>

            <OutputPanel label="Yearly summary" :live="false">
              <Table density="compact">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Year</TableHeaderCell>
                    <TableHeaderCell numeric>Principal paid</TableHeaderCell>
                    <TableHeaderCell numeric>Interest paid</TableHeaderCell>
                    <TableHeaderCell numeric>Total paid</TableHeaderCell>
                    <TableHeaderCell numeric>Ending balance</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow v-for="row in loanResult.yearly" :key="row.year">
                    <TableCell>{{ row.year }}</TableCell>
                    <TableCell numeric>{{ fmt(row.principalPaid) }}</TableCell>
                    <TableCell numeric>{{ fmt(row.interestPaid) }}</TableCell>
                    <TableCell numeric>{{ fmt(row.totalPaid) }}</TableCell>
                    <TableCell numeric>{{ fmt(row.endingBalance) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </OutputPanel>

            <Accordion type="single">
              <AccordionItem value="schedule" title="Show monthly schedule">
                <Table density="compact">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Payment #</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell numeric>Principal</TableHeaderCell>
                      <TableHeaderCell numeric>Interest</TableHeaderCell>
                      <TableHeaderCell numeric>Extra</TableHeaderCell>
                      <TableHeaderCell numeric>Balance</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow v-for="row in pagedScheduleRows" :key="row.paymentNumber">
                      <TableCell>{{ row.paymentNumber }}</TableCell>
                      <TableCell>{{ rowDateLabel(row) }}</TableCell>
                      <TableCell numeric>{{ fmt(row.principal) }}</TableCell>
                      <TableCell numeric>{{ fmt(row.interest) }}</TableCell>
                      <TableCell numeric>{{ fmt(row.extra) }}</TableCell>
                      <TableCell numeric>{{ fmt(row.balance) }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Pagination
                  v-if="schedulePageCount > 1"
                  v-model:page="schedulePage"
                  :page-count="schedulePageCount"
                  class="lc__pagination"
                />
              </AccordionItem>
            </Accordion>
          </div>
        </OutputPanel>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.lc {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.lc__inputs {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}
.lc__field {
  flex: 1;
  min-width: 160px;
}
.lc__field--term {
  min-width: 220px;
}
.lc__term {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.lc__result {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.lc__chart {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 1rem;
}
.lc__pagination {
  margin-top: 0.75rem;
}
</style>
