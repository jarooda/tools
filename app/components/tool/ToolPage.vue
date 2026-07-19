<script setup lang="ts">
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardBody } from '@/components/ui/card'
import ProcessingBadge from '@/components/tool/ProcessingBadge.vue'
import { getCategory } from '@/lib/tools/categories'
import type { Tool } from '@/lib/tools/registry'

/**
 * Shared wrapper for every tool page: Page Header + processing Tag + Card,
 * with the tool's interactive UI passed as the default slot. Also wires SEO
 * from the registry entry so pages don't repeat it.
 */
const props = defineProps<{ tool: Tool }>()

useToolSeo(props.tool)

const category = getCategory(props.tool.category)
</script>

<template>
  <div class="tool-page">
    <PageHeader :title="tool.title" :description="tool.description" :eyebrow="category?.title">
      <template #actions>
        <ProcessingBadge :tag="tool.tag" />
      </template>
    </PageHeader>

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
