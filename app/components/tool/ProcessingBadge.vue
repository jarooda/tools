<script setup lang="ts">
import { computed } from 'vue'
import { Tag } from '@/components/ui/tag'
import type { ProcessingTag } from '@/lib/tools/registry'

const props = defineProps<{ tag: ProcessingTag }>()

const meta = computed(() => {
  switch (props.tag) {
    case 'server':
      return { color: 'warning' as const, label: 'Server', icon: '🟡' }
    case 'hybrid':
      return { color: 'info' as const, label: 'Hybrid', icon: '🔵' }
    case 'client':
    default:
      return { color: 'success' as const, label: 'Runs in your browser', icon: '🟢' }
  }
})
</script>

<template>
  <Tag :color="meta.color" :title="`Processing: ${meta.label}`">
    <span aria-hidden="true">{{ meta.icon }}</span>
    {{ meta.label }}
  </Tag>
</template>
