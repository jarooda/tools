<script setup lang="ts">
import { PageHeader } from '@/components/ui/page-header'
import ToolCard from '@/components/tool/ToolCard.vue'
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION, SITE_URL } from '@/lib/config'

const { categoriesWithTools } = useToolRegistry()
const groups = categoriesWithTools().filter((g) => g.tools.length > 0)

useSeoMeta({
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: APP_DESCRIPTION,
  ogTitle: `${APP_NAME} — ${APP_TAGLINE}`,
  ogDescription: APP_DESCRIPTION,
})
useHead({ link: [{ rel: 'canonical', href: SITE_URL }] })
</script>

<template>
  <div class="home">
    <PageHeader variant="plain" :title="APP_NAME" :description="APP_TAGLINE" />

    <section v-for="group in groups" :key="group.slug" class="home__section">
      <div class="home__section-head">
        <h2 class="home__section-title">
          <span aria-hidden="true">{{ group.icon }}</span>
          <NuxtLink :to="`/${group.slug}`">{{ group.title }}</NuxtLink>
        </h2>
        <p class="home__section-desc">{{ group.description }}</p>
      </div>
      <div class="home__grid">
        <ToolCard v-for="tool in group.tools" :key="tool.id" :tool="tool" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
.home__section-head {
  margin-bottom: 0.75rem;
}
.home__section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.25rem;
}
.home__section-title a {
  color: inherit;
  text-decoration: none;
}
.home__section-title a:hover {
  text-decoration: underline;
}
.home__section-desc {
  margin: 0.25rem 0 0;
  color: var(--text-muted, #6f7d78);
  font-size: 0.9rem;
}
.home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}
</style>
