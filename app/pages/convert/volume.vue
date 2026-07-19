<script setup lang="ts">
import ToolPage from '@/components/tool/ToolPage.vue'
import UnitConverter from '@/components/tool/UnitConverter.vue'
import { getTool } from '@/lib/tools/registry'
import { VOLUME_UNITS } from '@/utils/volume'

definePageMeta({ layout: 'tool' })

const tool = getTool('volume')!
</script>

<template>
  <ToolPage :tool="tool">
    <UnitConverter
      :units="VOLUME_UNITS"
      initial-unit="l"
      value-label="Volume"
      empty-description="Enter a volume on the left to see it in every unit."
    />
  </ToolPage>
</template>
