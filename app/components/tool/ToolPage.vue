<script setup lang="ts">
import { Card, CardBody } from '@/components/ui/card'
import type { Tool } from '@/lib/tools/registry'

/**
 * Content wrapper for a tool page: wires SEO from the registry entry and
 * frames the tool's interactive UI in a Card. The page heading (title,
 * breadcrumb, processing badge) is rendered by the `tool` layout's header,
 * derived from the route — so it isn't repeated here.
 */
const props = defineProps<{ tool: Tool }>()

useToolSeo(props.tool)
</script>

<template>
  <div class="tool-page">
    <Card elevation="raised">
      <CardBody>
        <slot />
      </CardBody>
    </Card>
  </div>
</template>

<style scoped>
.tool-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
