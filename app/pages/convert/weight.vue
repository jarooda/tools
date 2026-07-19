<script setup lang="ts">
import ToolPage from '@/components/tool/ToolPage.vue'
import UnitConverter from '@/components/tool/UnitConverter.vue'
import { getTool } from '@/lib/tools/registry'
import { WEIGHT_UNITS } from '@/utils/weight'

definePageMeta({ layout: 'tool' })

const tool = getTool('weight')!
</script>

<template>
  <ToolPage :tool="tool">
    <UnitConverter
      :units="WEIGHT_UNITS"
      initial-unit="kg"
      value-label="Weight"
      empty-description="Enter a weight on the left to see it in every unit."
    />
  </ToolPage>
</template>
