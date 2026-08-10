<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Stat, StatGroup } from '@/components/ui/stat'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { calculateTipSplit } from '@/utils/tip'

definePageMeta({ layout: 'tool' })

const tool = getTool('math-tip-calculator')!

const TIP_OPTIONS = [
  { value: '15', label: '15%' },
  { value: '18', label: '18%' },
  { value: '20', label: '20%' },
  { value: '25', label: '25%' },
  { value: 'custom', label: 'Custom' },
]

const billAmount = ref<number | null>(null)
const tipPreset = ref('15')
const customTipPercent = ref<number | null>(null)
const peopleCount = ref<number | null>(1)
const roundUp = ref(false)

function setTipPreset(next: string) {
  tipPreset.value = next
}

const tipPercent = computed(() =>
  tipPreset.value === 'custom' ? (customTipPercent.value ?? 0) : Number(tipPreset.value),
)

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const isEmpty = computed(() => billAmount.value === null)

const result = computed(() => {
  if (isEmpty.value) return null
  return calculateTipSplit({
    billAmount: billAmount.value!,
    tipPercent: tipPercent.value,
    peopleCount: peopleCount.value ?? 1,
    roundUp: roundUp.value,
  })
})

const summaryText = computed(() => {
  if (!result.value) return ''
  return [
    `Bill: ${fmt(billAmount.value!)}`,
    `Tip (${fmt(tipPercent.value)}%): ${fmt(result.value.tipAmount)}`,
    `Total: ${fmt(result.value.totalAmount)}`,
    `Per person (${peopleCount.value ?? 1}): ${fmt(result.value.perPerson)}`,
  ].join('\n')
})

const { copy: copySummary, copied: summaryCopied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="tc">
      <div class="tc__inputs">
        <Field label="Bill amount" class="tc__field">
          <NumberInput v-model="billAmount" :min="0" :precision="2" />
        </Field>
        <Field label="Split between" class="tc__field">
          <NumberInput v-model="peopleCount" :min="1" :step="1" :precision="0" />
        </Field>
      </div>

      <Field label="Tip">
        <SegmentedControl
          :model-value="tipPreset"
          :options="TIP_OPTIONS"
          aria-label="Tip percentage"
          @update:model-value="setTipPreset"
        />
      </Field>

      <div v-if="tipPreset === 'custom'" class="tc__inputs">
        <Field label="Custom tip %" class="tc__field">
          <NumberInput v-model="customTipPercent" :min="0" :precision="2" suffix="%" />
        </Field>
      </div>

      <Switch
        v-model="roundUp"
        label="Round up per person"
        description="Rounds each share up to the nearest whole unit — handy when splitting cash."
      />

      <!--
        live="false": NumberInput commits per keystroke, not a ticking clock —
        same rationale as duration.vue.
      -->
      <OutputPanel
        label="Split"
        :empty="isEmpty"
        :live="false"
        empty-title="Enter a bill amount"
        empty-description="Enter a bill amount, tip, and number of people to see the split."
      >
        <template v-if="result" #actions>
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

        <div v-if="result" class="tc__result">
          <StatGroup :columns="3">
            <Stat label="Tip amount" :value="fmt(result.tipAmount)" />
            <Stat label="Total" :value="fmt(result.totalAmount)" />
            <Stat label="Per person" :value="fmt(result.perPerson)" />
          </StatGroup>

          <p v-if="roundUp && result.roundingDelta > 0" class="tc__hint">
            +{{ fmt(result.roundingDelta) }} total from rounding up.
          </p>
        </div>
      </OutputPanel>
    </div>
  </ToolPage>
</template>

<style scoped>
.tc {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.tc__inputs {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}
.tc__field {
  flex: 1;
  min-width: 160px;
}
.tc__result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.tc__hint {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: var(--leading-snug);
}
</style>
