<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Stat, StatGroup } from '@/components/ui/stat'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { percentOf, whatPercent, percentChange, adjustByPercent } from '@/utils/percentage'

definePageMeta({ layout: 'tool' })

const tool = getTool('math-percentage-calculator')!

type Mode = 'of' | 'is-percent-of' | 'change' | 'adjust'
type Direction = 'increase' | 'decrease'

const MODE_OPTIONS = [
  { value: 'of', label: 'X% of Y' },
  { value: 'is-percent-of', label: 'X is % of Y' },
  { value: 'change', label: '% change' },
  { value: 'adjust', label: 'Increase/decrease' },
]

const DIRECTION_OPTIONS = [
  { value: 'increase', label: 'Increase' },
  { value: 'decrease', label: 'Decrease' },
]

const mode = ref<Mode>('of')

const ofPercent = ref<number | null>(null)
const ofValue = ref<number | null>(null)

const isPercentOfValue = ref<number | null>(null)
const isPercentOfTotal = ref<number | null>(null)

const changeFrom = ref<number | null>(null)
const changeTo = ref<number | null>(null)

const adjustValue = ref<number | null>(null)
const adjustPercent = ref<number | null>(null)
const adjustDirection = ref<Direction>('increase')

function setMode(next: string) {
  mode.value = next as Mode
}

function setDirection(next: string) {
  adjustDirection.value = next as Direction
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function signed(n: number): string {
  return n >= 0 ? `+${fmt(n)}` : fmt(n)
}

const ofEmpty = computed(() => ofPercent.value === null || ofValue.value === null)
const ofResult = computed(() => (ofEmpty.value ? 0 : percentOf(ofPercent.value!, ofValue.value!)))

const isPercentOfEmpty = computed(
  () => isPercentOfValue.value === null || isPercentOfTotal.value === null,
)
const isPercentOfResult = computed(() =>
  isPercentOfEmpty.value ? null : whatPercent(isPercentOfValue.value!, isPercentOfTotal.value!),
)
const isPercentOfError = computed(() => !isPercentOfEmpty.value && isPercentOfTotal.value === 0)

const changeEmpty = computed(() => changeFrom.value === null || changeTo.value === null)
const changeResult = computed(() =>
  changeEmpty.value ? null : percentChange(changeFrom.value!, changeTo.value!),
)
const changeError = computed(() => !changeEmpty.value && changeFrom.value === 0)

const adjustEmpty = computed(() => adjustValue.value === null || adjustPercent.value === null)
const adjustResult = computed(() =>
  adjustEmpty.value
    ? null
    : adjustByPercent(adjustValue.value!, adjustPercent.value!, adjustDirection.value),
)

const isEmpty = computed(() => {
  switch (mode.value) {
    case 'of':
      return ofEmpty.value
    case 'is-percent-of':
      return isPercentOfEmpty.value
    case 'change':
      return changeEmpty.value
    case 'adjust':
      return adjustEmpty.value
  }
  return false
})

const hasError = computed(() => {
  if (mode.value === 'is-percent-of') return isPercentOfError.value
  if (mode.value === 'change') return changeError.value
  return false
})

const errorMessage = computed(() => {
  if (mode.value === 'is-percent-of') {
    return 'Cannot divide by zero — enter a non-zero total.'
  }
  if (mode.value === 'change') {
    return "Cannot calculate percent change from zero — the starting value can't be zero."
  }
  return ''
})

const emptyTitle = computed(() => {
  switch (mode.value) {
    case 'of':
      return 'Enter both values'
    case 'is-percent-of':
      return 'Enter both values'
    case 'change':
      return 'Enter a start and end value'
    case 'adjust':
      return 'Enter a value and percent'
  }
  return ''
})

const emptyDescription = computed(() => {
  switch (mode.value) {
    case 'of':
      return 'Enter a percentage and a value to calculate the result.'
    case 'is-percent-of':
      return 'Enter a value and a total to see what percent the value is.'
    case 'change':
      return 'Enter a starting and ending value to calculate the percentage change.'
    case 'adjust':
      return 'Enter a value and a percent to increase or decrease it by.'
  }
  return ''
})

const summaryText = computed(() => {
  if (isEmpty.value || hasError.value) return ''
  switch (mode.value) {
    case 'of':
      return `${fmt(ofPercent.value!)}% of ${fmt(ofValue.value!)} = ${fmt(ofResult.value)}`
    case 'is-percent-of':
      return `${fmt(isPercentOfValue.value!)} is ${fmt(isPercentOfResult.value!)}% of ${fmt(isPercentOfTotal.value!)}`
    case 'change':
      if (!changeResult.value) return ''
      return [
        `Percent change: ${signed(changeResult.value.pct)}%`,
        `Absolute change: ${signed(changeResult.value.abs)}`,
      ].join('\n')
    case 'adjust':
      if (!adjustResult.value) return ''
      return [
        `Result: ${fmt(adjustResult.value.result)}`,
        `Change amount: ${signed(adjustResult.value.deltaAmount)}`,
      ].join('\n')
  }
  return ''
})

const { copy: copySummary, copied: summaryCopied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="pc">
      <SegmentedControl
        :model-value="mode"
        :options="MODE_OPTIONS"
        aria-label="Calculation mode"
        @update:model-value="setMode"
      />

      <div v-if="mode === 'of'" class="pc__inputs">
        <Field label="Percentage" class="pc__field">
          <NumberInput v-model="ofPercent" :precision="4" suffix="%" />
        </Field>
        <Field label="Value" class="pc__field">
          <NumberInput v-model="ofValue" :precision="4" />
        </Field>
      </div>

      <div v-else-if="mode === 'is-percent-of'" class="pc__inputs">
        <Field label="Value" class="pc__field">
          <NumberInput v-model="isPercentOfValue" :precision="4" />
        </Field>
        <Field label="Total" class="pc__field">
          <NumberInput v-model="isPercentOfTotal" :precision="4" />
        </Field>
      </div>

      <div v-else-if="mode === 'change'" class="pc__inputs">
        <Field label="From" class="pc__field">
          <NumberInput v-model="changeFrom" :precision="4" />
        </Field>
        <Field label="To" class="pc__field">
          <NumberInput v-model="changeTo" :precision="4" />
        </Field>
      </div>

      <div v-else class="pc__inputs">
        <Field label="Value" class="pc__field">
          <NumberInput v-model="adjustValue" :precision="4" />
        </Field>
        <Field label="Percent" class="pc__field">
          <NumberInput v-model="adjustPercent" :precision="4" :min="0" suffix="%" />
        </Field>
        <Field label="Direction" class="pc__field">
          <SegmentedControl
            :model-value="adjustDirection"
            :options="DIRECTION_OPTIONS"
            aria-label="Increase or decrease"
            @update:model-value="setDirection"
          />
        </Field>
      </div>

      <!--
        live="false": NumberInput commits per keystroke, not a ticking clock —
        same rationale as duration.vue.
      -->
      <OutputPanel
        label="Result"
        :empty="isEmpty"
        :error="hasError ? errorMessage : null"
        :live="false"
        :empty-title="emptyTitle"
        :empty-description="emptyDescription"
      >
        <template v-if="!isEmpty && !hasError" #actions>
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

        <Stat v-if="mode === 'of'" label="Result" :value="fmt(ofResult)" />

        <Stat
          v-else-if="mode === 'is-percent-of' && isPercentOfResult !== null"
          label="Percentage"
          :value="`${fmt(isPercentOfResult)}%`"
        />

        <StatGroup v-else-if="mode === 'change' && changeResult" :columns="2">
          <Stat
            label="Percent change"
            :value="`${fmt(Math.abs(changeResult.pct))}%`"
            :delta="`${signed(changeResult.pct)}%`"
          />
          <Stat label="Absolute change" :value="signed(changeResult.abs)" />
        </StatGroup>

        <StatGroup v-else-if="mode === 'adjust' && adjustResult" :columns="2">
          <Stat label="Result" :value="fmt(adjustResult.result)" />
          <Stat
            label="Change amount"
            :value="fmt(Math.abs(adjustResult.deltaAmount))"
            :delta="signed(adjustResult.deltaAmount)"
          />
        </StatGroup>
      </OutputPanel>
    </div>
  </ToolPage>
</template>

<style scoped>
.pc {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.pc__inputs {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}
.pc__field {
  flex: 1;
}
</style>
