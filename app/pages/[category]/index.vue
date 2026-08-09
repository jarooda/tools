<script setup lang="ts">
import ToolCard from '@/components/tool/ToolCard.vue'
import { EmptyState } from '@/components/ui/empty-state'
import { APP_NAME, SITE_URL } from '@/lib/config'
import { UI_ICON } from '@/lib/icons'

definePageMeta({ layout: 'tool' })

const route = useRoute()
const { getCategory, toolsInCategory } = useToolRegistry()

const slug = computed(() => String(route.params.category))
const category = computed(() => getCategory(slug.value))
const tools = computed(() => (category.value ? toolsInCategory(category.value.slug) : []))

// Unknown category → 404.
if (!category.value) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found' })
}

useSeoMeta({
  title: `${category.value!.title} — ${APP_NAME}`,
  description: category.value!.description,
  ogTitle: `${category.value!.title} — ${APP_NAME}`,
  ogDescription: category.value!.description,
})
useHead({
  link: [{ rel: 'canonical', href: `${SITE_URL}/${slug.value}` }],
})
</script>

<template>
  <div v-if="tools.length" class="category__grid">
    <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool" />
  </div>
  <EmptyState
    v-else
    title="No tools yet"
    description="This category doesn't have any tools live yet — check back soon."
  >
    <template #icon><Icon :name="UI_ICON.grid" size="24" /></template>
  </EmptyState>
</template>

<style scoped>
.category__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 14px;
}
</style>
