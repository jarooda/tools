<script setup lang="ts">
import ToolPage from '@/components/tool/ToolPage.vue'
import UnitConverter from '@/components/tool/UnitConverter.vue'
import { getTool } from '@/lib/tools/registry'
import { DATA_UNITS } from '@/utils/data-storage'

definePageMeta({ layout: 'tool' })

const tool = getTool('data-storage')!
</script>

<template>
  <ToolPage :tool="tool">
    <UnitConverter
      :units="DATA_UNITS"
      initial-unit="MB"
      value-label="Size"
      empty-description="Enter a size on the left to see it in every unit."
    />
  </ToolPage>
</template>
