<script setup lang="ts">
import ToolPage from '@/components/tool/ToolPage.vue'
import UnitConverter from '@/components/tool/UnitConverter.vue'
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
        <p v-if="value != null && isBelowAbsoluteZero(value, from)" class="temp__warn" role="alert">
          Below absolute zero (−273.15 °C) — physically impossible, but here's the math.
        </p>
      </template>
    </UnitConverter>
  </ToolPage>
</template>

<style scoped>
.temp__warn {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--warning-text);
}
</style>
