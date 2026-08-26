<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Stat, StatGroup } from '@/components/ui/stat'
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
import {
  buildCompoundInterestSchedule,
  type CompoundInterestMonthRow,
  type CompoundingFrequency,
} from '@/utils/compoundInterest'

definePageMeta({ layout: 'tool' })

const tool = getTool('math-compound-interest-calculator')!

const SCHEDULE_PAGE_SIZE = 24

const FREQUENCY_OPTIONS = [
  { value: 'annually', label: 'Annually' },
  { value: 'semiannually', label: 'Semi-annually' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily', label: 'Daily' },
]

const principal = ref<number | null>(10_000)
const rate = ref<number | null>(5)
const frequency = ref<CompoundingFrequency>('monthly')
const years = ref<number | null>(10)
const monthlyContribution = ref<number | null>(100)

const isEmpty = computed(
  () => principal.value === null || rate.value === null || years.value === null || years.value <= 0,
)

const result = computed(() => {
  if (isEmpty.value) return null
  return buildCompoundInterestSchedule({
    principal: principal.value!,
    annualRatePct: rate.value!,
    compoundingFrequency: frequency.value,
    years: years.value!,
    monthlyContribution: monthlyContribution.value ?? 0,
  })
})

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(n: number): string {
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

interface CompoundInterestChartSeries {
  name: string
  data: ChartPoint[]
}

const chartSeries = computed<CompoundInterestChartSeries[]>(() => {
  if (!result.value) return []
  return [
    {
      name: 'Contributions',
      data: result.value.yearly.map((y) => ({ label: String(y.year), value: y.contributions })),
    },
    {
      name: 'Interest earned',
      data: result.value.yearly.map((y) => ({ label: String(y.year), value: y.interestEarned })),
    },
  ]
})

const schedulePage = ref(1)

watch(result, () => {
  schedulePage.value = 1
})

const scheduleRows = computed<CompoundInterestMonthRow[]>(() => result.value?.schedule ?? [])

const schedulePageCount = computed(() =>
  Math.max(1, Math.ceil(scheduleRows.value.length / SCHEDULE_PAGE_SIZE)),
)

const pagedScheduleRows = computed(() => {
  const start = (schedulePage.value - 1) * SCHEDULE_PAGE_SIZE
  return scheduleRows.value.slice(start, start + SCHEDULE_PAGE_SIZE)
})

const summaryText = computed(() => {
  if (!result.value) return ''
  return [
    `Final balance: ${fmt(result.value.finalBalance)}`,
    `Total contributions: ${fmt(result.value.totalContributions)}`,
    `Total interest earned: ${fmt(result.value.totalInterest)}`,
    `Effective annual yield (APY): ${fmtPct(result.value.effectiveAnnualRatePct)}`,
  ].join('\n')
})

const { copy: copySummary, copied: summaryCopied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="cic">
      <div class="cic__inputs">
        <Field label="Principal" class="cic__field">
          <NumberInput v-model="principal" :min="0" :precision="2" />
        </Field>
        <Field label="Annual interest rate" class="cic__field">
          <NumberInput v-model="rate" :min="0" :max="100" :precision="3" suffix="%" />
        </Field>
        <Field label="Compounding frequency" class="cic__field">
          <Select v-model="frequency" :options="FREQUENCY_OPTIONS" />
        </Field>
        <Field label="Time period (years)" class="cic__field">
          <NumberInput v-model="years" :min="1" :max="100" :precision="0" />
        </Field>
        <Field
          label="Monthly contribution"
          class="cic__field"
          optional
          hint="Optional. Added at the end of each month, after that month's interest is applied."
        >
          <NumberInput v-model="monthlyContribution" :min="0" :precision="2" />
        </Field>
      </div>

      <!--
        live="false": NumberInput commits per keystroke, not a ticking clock —
        same rationale as loan-calculator.vue.
      -->
      <OutputPanel
        label="Result"
        :empty="isEmpty"
        :live="false"
        empty-title="Enter deposit details"
        empty-description="Enter a principal, interest rate, and time period to project your balance."
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

        <div v-if="result" class="cic__result">
          <StatGroup>
            <Stat label="Final balance" :value="fmt(result.finalBalance)" />
            <Stat label="Total contributions" :value="fmt(result.totalContributions)" />
            <Stat label="Total interest earned" :value="fmt(result.totalInterest)" />
            <Stat
              label="Effective annual yield"
              :value="fmtPct(result.effectiveAnnualRatePct)"
              caption="APY at your compounding frequency"
            />
          </StatGroup>

          <div class="cic__chart" aria-hidden="true">
            <Chart type="bar" :stacked="true" :series="chartSeries" :value-format="fmt" />
          </div>

          <OutputPanel label="Yearly summary" :live="false">
            <Table density="compact">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Year</TableHeaderCell>
                  <TableHeaderCell numeric>Contributions</TableHeaderCell>
                  <TableHeaderCell numeric>Interest earned</TableHeaderCell>
                  <TableHeaderCell numeric>Ending balance</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow v-for="row in result.yearly" :key="row.year">
                  <TableCell>{{ row.year }}</TableCell>
                  <TableCell numeric>{{ fmt(row.contributions) }}</TableCell>
                  <TableCell numeric>{{ fmt(row.interestEarned) }}</TableCell>
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
                    <TableHeaderCell>Month</TableHeaderCell>
                    <TableHeaderCell numeric>Starting balance</TableHeaderCell>
                    <TableHeaderCell numeric>Interest earned</TableHeaderCell>
                    <TableHeaderCell numeric>Contribution</TableHeaderCell>
                    <TableHeaderCell numeric>Ending balance</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow v-for="row in pagedScheduleRows" :key="row.month">
                    <TableCell>{{ row.month }}</TableCell>
                    <TableCell numeric>{{ fmt(row.startingBalance) }}</TableCell>
                    <TableCell numeric>{{ fmt(row.interestEarned) }}</TableCell>
                    <TableCell numeric>{{ fmt(row.contribution) }}</TableCell>
                    <TableCell numeric>{{ fmt(row.endingBalance) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Pagination
                v-if="schedulePageCount > 1"
                v-model:page="schedulePage"
                :page-count="schedulePageCount"
                class="cic__pagination"
              />
            </AccordionItem>
          </Accordion>
        </div>
      </OutputPanel>
    </div>
  </ToolPage>
</template>

<style scoped>
.cic {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.cic__inputs {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}
.cic__field {
  flex: 1;
  min-width: 160px;
}
.cic__result {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.cic__chart {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 1rem;
}
.cic__pagination {
  margin-top: 0.75rem;
}
</style>
