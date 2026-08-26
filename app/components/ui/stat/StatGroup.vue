<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Fixed column count. Omit for a responsive auto-fit grid. */
  columns?: number
}>()

const style = computed(() =>
  props.columns ? { '--stat-columns': String(props.columns) } : undefined,
)
</script>

<template>
  <div class="jl-stat-group" :style="style">
    <slot />
  </div>
</template>
