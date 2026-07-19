<script setup lang="ts">
import { PageHeader } from '@/components/ui/page-header'
import ToolCard from '@/components/tool/ToolCard.vue'
import { APP_NAME, SITE_URL } from '@/lib/config'

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
  <div v-if="category" class="category">
    <PageHeader
      variant="plain"
      :eyebrow="category.icon"
      :title="category.title"
      :description="category.description"
    />
    <div class="category__grid">
      <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool" />
    </div>
  </div>
</template>

<style scoped>
.category {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.category__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}
</style>
