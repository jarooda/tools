<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolCard from '@/components/tool/ToolCard.vue'
import { APP_NAME, APP_DESCRIPTION, SITE_URL } from '@/lib/config'
import { PROCESSING_META, UI_ICON } from '@/lib/icons'

const { categoriesWithTools, tools } = useToolRegistry()
const { openPalette } = usePalette()

const totalCount = tools.length

// Only categories that actually have tools registered.
const populated = computed(() => categoriesWithTools().filter((g) => g.tools.length > 0))

// Client-side category filter chips ("All" + one per populated category).
const activeCat = ref<string>('all')
const chips = computed(() => [
  { id: 'all', label: 'All', count: totalCount },
  ...populated.value.map((g) => ({ id: g.slug, label: g.title, count: g.tools.length })),
])
const visibleCategories = computed(() =>
  activeCat.value === 'all'
    ? populated.value
    : populated.value.filter((g) => g.slug === activeCat.value),
)

const legend = [PROCESSING_META.client, PROCESSING_META.hybrid, PROCESSING_META.server]

useSeoMeta({
  title: `${APP_NAME} — Every small tool you need, in one place`,
  description: APP_DESCRIPTION,
  ogTitle: `${APP_NAME} — Every small tool you need, in one place`,
  ogDescription: APP_DESCRIPTION,
})
useHead({ link: [{ rel: 'canonical', href: SITE_URL }] })
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <span class="hero__eyebrow">Fast · Free · Runs in your browser</span>
      <h1 class="hero__title">Every small tool you need, in one place.</h1>
      <p class="hero__subtitle">
        Convert, compress, encode and generate — {{ totalCount }} utilities that work entirely on
        your device. No uploads, no accounts, no waiting.
      </p>
      <button type="button" class="hero__search" @click="openPalette">
        <span class="hero__search-label">
          <Icon :name="UI_ICON.search" size="18" />
          Search {{ totalCount }} tools…
        </span>
        <span class="hero__kbd">⌘K</span>
      </button>
      <div class="hero__legend">
        <span v-for="item in legend" :key="item.label" class="hero__legend-item">
          <span class="hero__legend-dot" :style="{ background: item.dotVar }" aria-hidden="true" />
          {{ item.label }} · {{ item.hint }}
        </span>
      </div>
    </section>

    <!-- Category filter chips -->
    <div class="home__chips">
      <button
        v-for="chip in chips"
        :key="chip.id"
        type="button"
        class="chip"
        :class="{ 'chip--active': activeCat === chip.id }"
        @click="activeCat = chip.id"
      >
        {{ chip.label }}
        <span class="chip__count">{{ chip.count }}</span>
      </button>
    </div>

    <!-- Category sections -->
    <section v-for="group in visibleCategories" :key="group.slug" class="home__section">
      <div class="home__section-head">
        <span class="home__section-icon" aria-hidden="true">
          <Icon :name="group.icon" size="19" />
        </span>
        <h2 class="home__section-title">
          <NuxtLink :to="`/${group.slug}`">{{ group.title }}</NuxtLink>
        </h2>
        <span class="home__section-count">{{ group.tools.length }} tools</span>
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
}

/* Hero */
.hero {
  text-align: center;
  padding: var(--space-10, 2.5rem) 0 var(--space-8, 2rem);
}
.hero__eyebrow {
  display: inline-block;
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-brand);
}
.hero__title {
  margin: 0 0 14px;
  font-size: clamp(30px, 6vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.03em;
  font-weight: 680;
  text-wrap: balance;
}
.hero__subtitle {
  max-width: 560px;
  margin: 0 auto var(--space-6, 1.5rem);
  font-size: 17px;
  line-height: 1.5;
  color: var(--text-secondary);
  text-wrap: pretty;
}
.hero__search {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: min(380px, 100%);
  height: 52px;
  padding: 0 8px 0 20px;
  border-radius: 14px;
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-sm);
  color: var(--text-tertiary);
  font-size: 15.5px;
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-standard);
}
.hero__search:hover {
  border-color: var(--border-strong);
}
.hero__search-label {
  display: inline-flex;
  align-items: center;
  gap: 11px;
}
.hero__kbd {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 8px;
  background: var(--surface-sunken);
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  color: var(--text-secondary);
}
.hero__legend {
  display: flex;
  justify-content: center;
  gap: 22px;
  margin-top: var(--space-6, 1.5rem);
  flex-wrap: wrap;
}
.hero__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--text-secondary);
}
.hero__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Chips */
.home__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: var(--space-2, 0.5rem) 0 var(--space-8, 2rem);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 15px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 550;
  cursor: pointer;
  background: var(--surface-card);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  transition: all var(--duration-fast) var(--ease-standard);
}
.chip:hover {
  border-color: var(--border-strong);
}
.chip--active {
  background: var(--accent);
  color: var(--text-on-brand);
  border-color: var(--accent);
}
.chip__count {
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

/* Sections */
.home__section {
  margin-bottom: var(--space-12, 3rem);
}
.home__section-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: var(--space-5, 1.25rem);
}
.home__section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--accent-subtle);
  color: var(--text-brand);
}
.home__section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 640;
  letter-spacing: -0.015em;
}
.home__section-title a {
  color: inherit;
  text-decoration: none;
}
.home__section-title a:hover {
  text-decoration: underline;
}
.home__section-count {
  font-size: 13px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
.home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 14px;
}
</style>
