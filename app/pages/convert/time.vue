<script setup lang="ts">
import ToolPage from '@/components/tool/ToolPage.vue'
import UnitConverter from '@/components/tool/UnitConverter.vue'
import { getTool } from '@/lib/tools/registry'
import { TIME_UNITS } from '@/utils/time'

definePageMeta({ layout: 'tool' })

const tool = getTool('time')!
</script>

<template>
  <ToolPage :tool="tool">
    <UnitConverter
      :units="TIME_UNITS"
      initial-unit="h"
      value-label="Duration"
      empty-description="Enter a duration on the left to see it in every unit."
    />
  </ToolPage>
</template>
