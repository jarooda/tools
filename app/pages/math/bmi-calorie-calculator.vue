<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Stat, StatGroup } from '@/components/ui/stat'
import { Tag } from '@/components/ui/tag'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import {
  lbToKg,
  ftInToCm,
  calculateBmi,
  bmiCategory,
  calculateBmr,
  calculateTdee,
  type UnitSystem,
  type Sex,
  type ActivityLevel,
  type BmiCategory,
} from '@/utils/bmiCalorie'

definePageMeta({ layout: 'tool' })

const tool = getTool('math-bmi-calorie-calculator')!

const KG_TO_LB = 1 / 0.45359237

function kgToLb(kg: number): number {
  return kg * KG_TO_LB
}

function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54
  const ft = Math.floor(totalInches / 12)
  const inches = totalInches - ft * 12
  return { ft, inches }
}

const UNIT_OPTIONS = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
]

const SEX_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
]

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { value: 'light', label: 'Light (exercise 1-3 days/week)' },
  { value: 'moderate', label: 'Moderate (exercise 3-5 days/week)' },
  { value: 'active', label: 'Active (exercise 6-7 days/week)' },
  { value: 'very-active', label: 'Very active (hard exercise, physical job)' },
]

const CATEGORY_TONE: Record<BmiCategory, 'info' | 'success' | 'warning' | 'danger'> = {
  underweight: 'info',
  normal: 'success',
  overweight: 'warning',
  obese: 'danger',
}

const units = ref<UnitSystem>('metric')
const weight = ref<number | null>(70)
const heightCm = ref<number | null>(175)
const heightFt = ref<number | null>(5)
const heightIn = ref<number | null>(9)
const age = ref<number | null>(30)
const sex = ref<Sex>('male')
const activity = ref<ActivityLevel>('moderate')

function setUnits(next: string) {
  const unit = next as UnitSystem
  if (unit === units.value) return

  if (unit === 'imperial') {
    if (weight.value != null) weight.value = Math.round(kgToLb(weight.value) * 10) / 10
    if (heightCm.value != null) {
      const { ft, inches } = cmToFtIn(heightCm.value)
      heightFt.value = ft
      heightIn.value = Math.round(inches * 10) / 10
    }
  } else {
    if (weight.value != null) weight.value = Math.round(lbToKg(weight.value) * 10) / 10
    if (heightFt.value != null && heightIn.value != null) {
      heightCm.value = Math.round(ftInToCm(heightFt.value, heightIn.value) * 10) / 10
    }
  }

  units.value = unit
}

function setSex(next: string) {
  sex.value = next as Sex
}

const weightKg = computed(() => {
  if (weight.value == null) return null
  return units.value === 'metric' ? weight.value : lbToKg(weight.value)
})

const heightInCm = computed(() => {
  if (units.value === 'metric') return heightCm.value
  if (heightFt.value == null || heightIn.value == null) return null
  return ftInToCm(heightFt.value, heightIn.value)
})

const isEmpty = computed(
  () => weightKg.value === null || heightInCm.value === null || age.value === null,
)

const hasError = computed(() => heightInCm.value !== null && heightInCm.value <= 0)

const bmi = computed(() => {
  if (isEmpty.value || hasError.value) return null
  return calculateBmi(weightKg.value!, heightInCm.value!)
})

const category = computed<BmiCategory | null>(() =>
  bmi.value !== null ? bmiCategory(bmi.value) : null,
)

const categoryLabel = computed(() => {
  if (!category.value) return ''
  return category.value.charAt(0).toUpperCase() + category.value.slice(1)
})

const bmr = computed(() => {
  if (isEmpty.value || hasError.value) return null
  return calculateBmr(weightKg.value!, heightInCm.value!, age.value!, sex.value)
})

const tdee = computed(() => {
  if (bmr.value === null) return null
  return calculateTdee(bmr.value, activity.value)
})

function kcal(n: number): string {
  return `${Math.round(n)} kcal/day`
}

const summaryText = computed(() => {
  if (bmi.value === null || bmr.value === null || tdee.value === null) return ''
  return [
    `BMI: ${bmi.value.toFixed(1)} (${categoryLabel.value})`,
    `BMR: ${kcal(bmr.value)}`,
    `TDEE (maintenance): ${kcal(tdee.value)}`,
    `Lose weight: ${kcal(tdee.value - 500)}`,
    `Maintain: ${kcal(tdee.value)}`,
    `Gain weight: ${kcal(tdee.value + 500)}`,
  ].join('\n')
})

const { copy: copySummary, copied: summaryCopied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="bcc">
      <div class="bcc__inputs">
        <Field label="Units" class="bcc__field">
          <SegmentedControl
            :model-value="units"
            :options="UNIT_OPTIONS"
            aria-label="Unit system"
            @update:model-value="setUnits"
          />
        </Field>

        <Field label="Weight" class="bcc__field">
          <NumberInput
            v-model="weight"
            :suffix="units === 'metric' ? 'kg' : 'lb'"
            :min="0"
            :precision="1"
          />
        </Field>

        <Field v-if="units === 'metric'" label="Height" class="bcc__field">
          <NumberInput v-model="heightCm" suffix="cm" :min="0" :precision="1" />
        </Field>
        <div v-else class="bcc__height-row">
          <Field label="Height (ft)" class="bcc__field">
            <NumberInput v-model="heightFt" suffix="ft" :min="0" :precision="0" />
          </Field>
          <Field label="Height (in)" class="bcc__field">
            <NumberInput v-model="heightIn" suffix="in" :min="0" :max="11" :precision="0" />
          </Field>
        </div>

        <Field label="Age" class="bcc__field">
          <NumberInput v-model="age" suffix="yrs" :min="1" :max="120" :step="1" :precision="0" />
        </Field>

        <Field label="Sex" class="bcc__field">
          <SegmentedControl
            :model-value="sex"
            :options="SEX_OPTIONS"
            aria-label="Sex (for BMR calculation)"
            @update:model-value="setSex"
          />
        </Field>

        <Field label="Activity level" class="bcc__field bcc__field--activity">
          <Select v-model="activity" :options="ACTIVITY_OPTIONS" />
        </Field>
      </div>

      <OutputPanel
        label="Result"
        :empty="isEmpty"
        :error="hasError ? 'Height must be greater than 0.' : null"
        :live="false"
        empty-title="Enter your details"
        empty-description="Enter weight, height, and age to calculate your BMI and calorie needs."
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

        <div v-if="bmi !== null && bmr !== null && tdee !== null" class="bcc__result">
          <div class="bcc__bmi-row">
            <Stat label="BMI" :value="bmi.toFixed(1)" />
            <Tag :color="CATEGORY_TONE[category!]">{{ categoryLabel }}</Tag>
          </div>

          <StatGroup :columns="2">
            <Stat label="BMR" :value="kcal(bmr)" />
            <Stat label="Maintenance (TDEE)" :value="kcal(tdee)" />
          </StatGroup>

          <StatGroup :columns="3">
            <Stat label="Lose weight" :value="kcal(tdee - 500)" caption="~0.5 kg/week" />
            <Stat label="Maintain" :value="kcal(tdee)" />
            <Stat label="Gain weight" :value="kcal(tdee + 500)" caption="~0.5 kg/week" />
          </StatGroup>
        </div>
      </OutputPanel>
    </div>
  </ToolPage>
</template>

<style scoped>
.bcc {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.bcc__inputs {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}
.bcc__field {
  flex: 1;
  min-width: 160px;
}
.bcc__field--activity {
  min-width: 260px;
}
.bcc__height-row {
  display: flex;
  gap: 0.75rem;
  flex: 1;
  min-width: 220px;
}
.bcc__result {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.bcc__bmi-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
