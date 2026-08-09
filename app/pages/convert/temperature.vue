<script setup lang="ts">
import ToolPage from '@/components/tool/ToolPage.vue'
import UnitConverter from '@/components/tool/UnitConverter.vue'
import { Alert } from '@/components/ui/alert'
import { getTool } from '@/lib/tools/registry'
import {
  TEMPERATURE_UNITS,
  convertTemperature,
  isBelowAbsoluteZero,
  type TemperatureUnit,
} from '@/utils/temperature'
import type { LinearUnit } from '@/utils/linear'

definePageMeta({ layout: 'tool' })

const tool = getTool('temperature')!

// UnitConverter's default conversion is ratio-based (`factor`), but temperature
// has an offset (celsius ≠ 0 × kelvin), so pass the dedicated converter instead.
// `factor` is unused in that case but required by the shared unit shape.
const TEMPERATURE_LINEAR_UNITS: LinearUnit<TemperatureUnit>[] = TEMPERATURE_UNITS.map((u) => ({
  ...u,
  factor: 1,
}))

/** Format a converted value for display: trim to 2 decimals, drop trailing zeros. */
function format(n: number): string {
  return Number(n.toFixed(2)).toString().replace(/^-0$/, '0')
}
</script>

<template>
  <ToolPage :tool="tool">
    <UnitConverter
      :units="TEMPERATURE_LINEAR_UNITS"
      initial-unit="c"
      :initial-value="0"
      value-label="Temperature"
      empty-description="Enter a temperature on the left to see it in every unit."
      :convert="convertTemperature"
      :format-value="format"
    >
      <template #input-footer="{ value, from }">
        <Alert v-if="value != null && isBelowAbsoluteZero(value, from)" tone="warning">
          Below absolute zero (−273.15 °C) — physically impossible, but here's the math.
        </Alert>
      </template>
    </UnitConverter>
  </ToolPage>
</template>
