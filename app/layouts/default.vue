<script setup lang="ts">
import HeaderActions from '@/components/tool/HeaderActions.vue'
import SiteFooter from '@/components/tool/SiteFooter.vue'
import { APP_NAME } from '@/lib/config'
import { UI_ICON } from '@/lib/icons'

/**
 * Marketing / browse layout — a plain sticky top header, no sidebar.
 * Used by the homepage and category listing pages. Tool detail pages use
 * the `tool` layout (App Shell with a sidebar).
 */
</script>

<template>
  <div class="site">
    <header class="site__header">
      <NuxtLink to="/" class="brand">
        <span class="brand__mark" aria-hidden="true">
          <Icon :name="UI_ICON.brand" size="18" />
        </span>
        <span class="brand__name">{{ APP_NAME }}</span>
      </NuxtLink>
      <nav class="site__nav">
        <!-- <NuxtLink to="/about" class="site__nav-link">About</NuxtLink> -->
      </nav>
      <div class="site__actions">
        <HeaderActions />
      </div>
    </header>

    <main class="site__main">
      <slot />
      <SiteFooter class="site__footer" />
    </main>
  </div>
</template>

<style scoped>
.site {
  min-height: 100vh;
  background: var(--bg-app);
  color: var(--text-primary);
}
.site__header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: var(--space-4, 1rem);
  height: 60px;
  padding: 0 var(--space-6, 1.5rem);
  background: color-mix(in srgb, var(--bg-app) 82%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-subtle);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 650;
  font-size: 16px;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  text-decoration: none;
}
.brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: var(--accent);
  color: var(--text-on-brand);
}
.site__nav {
  display: flex;
  gap: 2px;
  margin-left: var(--space-4, 1rem);
}
.site__nav-link {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
}
.site__nav-link:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}
.site__actions {
  margin-left: auto;
}
.site__main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-8, 2rem) var(--space-6, 1.5rem) var(--space-16, 4rem);
}
.site__footer {
  margin-top: var(--space-12, 3rem);
}
@media (max-width: 640px) {
  .site__nav {
    display: none;
  }
}
</style>
