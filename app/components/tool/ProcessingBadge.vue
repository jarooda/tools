<script setup lang="ts">
import { computed } from 'vue'
import { Tag } from '@/components/ui/tag'
import { Tooltip } from '@/components/ui/tooltip'
import { PROCESSING_META } from '@/lib/icons'
import type { ProcessingTag } from '@/lib/tools/registry'

const props = defineProps<{ tag: ProcessingTag }>()

const meta = computed(() => PROCESSING_META[props.tag])
</script>

<template>
  <Tooltip :content="meta.hint">
    <Tag :color="meta.color" style="cursor: help">
      <span class="processing-badge__dot" :style="{ background: meta.dotVar }" aria-hidden="true" />
      {{ meta.label }}
    </Tag>
  </Tooltip>
</template>

<style scoped>
.processing-badge__dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
</style>
