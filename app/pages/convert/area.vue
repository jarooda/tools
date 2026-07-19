<script setup lang="ts">
import ToolPage from '@/components/tool/ToolPage.vue'
import UnitConverter from '@/components/tool/UnitConverter.vue'
import { getTool } from '@/lib/tools/registry'
import { AREA_UNITS } from '@/utils/area'

definePageMeta({ layout: 'tool' })

const tool = getTool('area')!
</script>

<template>
  <ToolPage :tool="tool">
    <UnitConverter
      :units="AREA_UNITS"
      initial-unit="m2"
      value-label="Area"
      empty-description="Enter an area on the left to see it in every unit."
    />
  </ToolPage>
</template>
