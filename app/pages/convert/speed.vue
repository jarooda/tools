<script setup lang="ts">
import ToolPage from '@/components/tool/ToolPage.vue'
import UnitConverter from '@/components/tool/UnitConverter.vue'
import { getTool } from '@/lib/tools/registry'
import { SPEED_UNITS } from '@/utils/speed'

definePageMeta({ layout: 'tool' })

const tool = getTool('speed')!
</script>

<template>
  <ToolPage :tool="tool">
    <UnitConverter
      :units="SPEED_UNITS"
      initial-unit="kmh"
      value-label="Speed"
      empty-description="Enter a speed on the left to see it in every unit."
    />
  </ToolPage>
</template>
