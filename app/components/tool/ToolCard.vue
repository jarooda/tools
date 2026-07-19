<script setup lang="ts">
import { Card, CardBody } from '@/components/ui/card'
import ProcessingBadge from '@/components/tool/ProcessingBadge.vue'
import { toolRoute, type Tool } from '@/lib/tools/registry'

const props = defineProps<{ tool: Tool }>()
const to = toolRoute(props.tool)
const disabled = props.tool.status !== 'live'
</script>

<template>
  <component
    :is="disabled ? 'div' : 'NuxtLink'"
    :to="disabled ? undefined : to"
    class="tool-card"
    :class="{ 'tool-card--disabled': disabled }"
  >
    <Card elevation="raised" :interactive="!disabled">
      <CardBody>
        <div class="tool-card__top">
          <h3 class="tool-card__title">{{ tool.title }}</h3>
          <ProcessingBadge :tag="tool.tag" />
        </div>
        <p class="tool-card__desc">{{ tool.description }}</p>
        <span v-if="disabled" class="tool-card__soon">Coming soon</span>
      </CardBody>
    </Card>
  </component>
</template>

<style scoped>
.tool-card {
  text-decoration: none;
  color: inherit;
  display: block;
}
.tool-card--disabled {
  opacity: 0.6;
  cursor: default;
}
.tool-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}
.tool-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.tool-card__desc {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: var(--text-muted, #6f7d78);
}
.tool-card__soon {
  display: inline-block;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-muted, #6f7d78);
}
</style>
