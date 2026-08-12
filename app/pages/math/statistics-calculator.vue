<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Stat, StatGroup } from '@/components/ui/stat'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { parseNumberList, computeStatistics } from '@/utils/statistics'

definePageMeta({ layout: 'tool' })

const tool = getTool('math-statistics-calculator')!

const MAX_LISTED_INVALID_TOKENS = 5

const raw = ref('')

const isEmpty = computed(() => raw.value.trim() === '')

const parsed = computed(() => parseNumberList(raw.value))

const hasError = computed(() => !isEmpty.value && parsed.value.values.length === 0)

const showInvalidWarning = computed(
  () => !isEmpty.value && parsed.value.invalidTokens.length > 0 && parsed.value.values.length > 0,
)

const invalidWarningText = computed(() => {
  const tokens = parsed.value.invalidTokens
  const shown = tokens.slice(0, MAX_LISTED_INVALID_TOKENS)
  const quoted = shown.map((t) => `"${t}"`).join(', ')
  const remaining = tokens.length - shown.length
  const tail = remaining > 0 ? `, +${remaining} more` : ''
  const noun = tokens.length === 1 ? 'value' : 'values'
  const verb = tokens.length === 1 ? "wasn't" : "weren't"
  return `Ignored ${tokens.length} ${noun} that ${verb} valid numbers: ${quoted}${tail}`
})

const stats = computed(() => (hasError.value ? null : computeStatistics(parsed.value.values)))

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

const modeValue = computed(() => {
  if (!stats.value) return '—'
  return stats.value.mode.length > 0 ? stats.value.mode.map((m) => fmt(m)).join(', ') : '—'
})

const modeCaption = computed(() =>
  stats.value && stats.value.mode.length === 0 ? 'No repeated value' : undefined,
)

const sampleGuardCaption = computed(() =>
  stats.value && stats.value.count < 2 ? 'Needs ≥2 values' : undefined,
)

const summaryText = computed(() => {
  const s = stats.value
  if (!s) return ''
  return [
    `Count: ${s.count.toLocaleString()}`,
    `Sum: ${fmt(s.sum)}`,
    `Mean: ${fmt(s.mean)}`,
    `Median: ${fmt(s.median)}`,
    `Mode: ${modeValue.value}`,
    `Min: ${fmt(s.min)}`,
    `Max: ${fmt(s.max)}`,
    `Range: ${fmt(s.range)}`,
    `Variance (population): ${fmt(s.varPopulation)}`,
    `Variance (sample): ${s.varSample === null ? '—' : fmt(s.varSample)}`,
    `Std deviation (population): ${fmt(s.stdevPopulation)}`,
    `Std deviation (sample): ${s.stdevSample === null ? '—' : fmt(s.stdevSample)}`,
    `Q1: ${fmt(s.q1)}`,
    `Q3: ${fmt(s.q3)}`,
    `IQR: ${fmt(s.iqr)}`,
  ].join('\n')
})

const { copy: copySummary, copied: summaryCopied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="stc">
      <Field
        label="Numbers"
        hint="Separate values with commas, spaces, or new lines"
        class="stc__field"
      >
        <Textarea
          v-model="raw"
          class="stc__area"
          placeholder="e.g. 12, 15, 9, 22&#10;15, 30, 18"
          auto-resize
          spellcheck="false"
        />
      </Field>

      <Alert v-if="showInvalidWarning" tone="warning">{{ invalidWarningText }}</Alert>

      <OutputPanel
        label="Result"
        :empty="isEmpty"
        :error="hasError ? 'No valid numbers found in the input.' : null"
        :live="false"
        empty-title="Enter a list of numbers"
        empty-description="Paste or type numbers separated by commas, spaces, or new lines."
      >
        <template v-if="stats" #actions>
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

        <div v-if="stats" class="stc__result">
          <OutputPanel label="Overview" :live="false">
            <StatGroup :columns="4">
              <Stat label="Count" :value="stats.count.toLocaleString()" />
              <Stat label="Sum" :value="fmt(stats.sum)" />
              <Stat label="Mean" :value="fmt(stats.mean)" />
              <Stat label="Median" :value="fmt(stats.median)" />
              <Stat label="Mode" :value="modeValue" :caption="modeCaption" />
              <Stat label="Min" :value="fmt(stats.min)" />
              <Stat label="Max" :value="fmt(stats.max)" />
              <Stat label="Range" :value="fmt(stats.range)" />
            </StatGroup>
          </OutputPanel>

          <OutputPanel label="Spread" :live="false">
            <StatGroup :columns="4">
              <Stat
                label="Variance (population)"
                :value="fmt(stats.varPopulation)"
                caption="σ² · ÷n"
              />
              <Stat
                label="Variance (sample)"
                :value="stats.varSample === null ? '—' : fmt(stats.varSample)"
                :caption="sampleGuardCaption"
              />
              <Stat label="Std deviation (population)" :value="fmt(stats.stdevPopulation)" />
              <Stat
                label="Std deviation (sample)"
                :value="stats.stdevSample === null ? '—' : fmt(stats.stdevSample)"
                :caption="sampleGuardCaption"
              />
            </StatGroup>
          </OutputPanel>

          <OutputPanel label="Quartiles" :live="false">
            <StatGroup :columns="3">
              <Stat label="Q1" :value="fmt(stats.q1)" />
              <Stat label="Q3" :value="fmt(stats.q3)" />
              <Stat label="IQR" :value="fmt(stats.iqr)" />
            </StatGroup>
          </OutputPanel>
        </div>
      </OutputPanel>
    </div>
  </ToolPage>
</template>

<style scoped>
.stc {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.stc__area {
  min-height: 140px;
}
.stc__result {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
</style>
