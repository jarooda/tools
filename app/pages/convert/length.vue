<script setup lang="ts">
import ToolPage from '@/components/tool/ToolPage.vue'
import UnitConverter from '@/components/tool/UnitConverter.vue'
import { getTool } from '@/lib/tools/registry'
import { LENGTH_UNITS, type LengthUnit } from '@/utils/length'
import type { LinearUnit } from '@/utils/linear'

definePageMeta({ layout: 'tool' })

const tool = getTool('length')!

// UnitConverter expects a `LinearUnit` shape (factor + optional group); length's
// own units use `metres` + `system` for its dedicated conversion module, so adapt.
const LENGTH_LINEAR_UNITS: LinearUnit<LengthUnit>[] = LENGTH_UNITS.map((u) => ({
  unit: u.unit,
  name: u.name,
  symbol: u.symbol,
  factor: u.metres,
  group: u.system === 'metric' ? 'Metric' : 'Imperial / US',
}))
</script>

<template>
  <ToolPage :tool="tool">
    <UnitConverter
      :units="LENGTH_LINEAR_UNITS"
      initial-unit="m"
      value-label="Length"
      empty-description="Enter a length on the left to see it in every unit."
    />
  </ToolPage>
</template>
