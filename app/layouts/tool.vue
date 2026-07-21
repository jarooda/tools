<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppShell, AppShellMenuButton } from '@/components/ui/app-shell'
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarGroup,
  SidebarItem,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { IconButton } from '@/components/ui/icon-button'
import { Tooltip } from '@/components/ui/tooltip'
import ProcessingBadge from '@/components/tool/ProcessingBadge.vue'
import SiteFooter from '@/components/tool/SiteFooter.vue'
import { APP_NAME } from '@/lib/config'
import { UI_ICON } from '@/lib/icons'

/**
 * Tool detail layout — App Shell with a sidebar scoped to the current tool's
 * category (live tools only). The top header is the tool's own PageHeader
 * (breadcrumb + title + processing badge + theme toggle), derived from the
 * route so pages don't repeat it. Home/category use the sidebar-less `default`.
 */
const route = useRoute()
const { tools, getCategory, toolRoute } = useToolRegistry()
const { openPalette } = usePalette()
const { isDark, toggle: toggleTheme } = useTheme()

// Which tool are we on? Works for both static (`/convert/temperature`) and
// dynamic routes by reading the path segments.
const segments = computed(() => route.path.split('/').filter(Boolean))
const tool = computed(() =>
  tools.find((t) => t.category === segments.value[0] && t.slug === segments.value[1]),
)
const category = computed(() => (tool.value ? getCategory(tool.value.category) : undefined))

// Sidebar: the current category's LIVE tools only (coming-soon hidden).
const categoryTools = computed(() =>
  tool.value ? tools.filter((t) => t.category === tool.value!.category && t.status === 'live') : [],
)

const crumbs = computed(() => {
  if (!tool.value || !category.value) return []
  return [
    { label: 'All tools', href: '/' },
    { label: category.value.title, href: `/${category.value.slug}` },
    { label: tool.value.title },
  ]
})

function isActive(path: string) {
  return route.path === path
}

// Mobile drawer state is controlled here so navigating (tapping a sidebar item)
// closes the overlay. Any route change collapses the drawer.
const mobileNavOpen = ref(false)
watch(
  () => route.path,
  () => {
    mobileNavOpen.value = false
  },
)
</script>

<template>
  <AppShell v-model:mobile-open="mobileNavOpen">
    <template #sidebar>
      <Sidebar>
        <SidebarHeader>
          <Tooltip side="bottom" content="Back to all tools">
            <NuxtLink to="/" class="brand">
              <img
                class="brand__mark"
                src="/android-chrome-192x192.png"
                alt=""
                width="30"
                height="30"
                aria-hidden="true"
              />
              <span class="brand__name">{{ APP_NAME }}</span>
            </NuxtLink>
          </Tooltip>
        </SidebarHeader>
        <SidebarBody>
          <SidebarGroup label="Browse">
            <SidebarItem label="All tools" @click="navigateTo('/')">
              <template #icon><Icon :name="UI_ICON.home" size="18" /></template>
            </SidebarItem>
            <SidebarItem label="Search" badge="⌘K" @click="openPalette">
              <template #icon><Icon :name="UI_ICON.search" size="18" /></template>
            </SidebarItem>
          </SidebarGroup>
          <SidebarGroup v-if="category" :label="category.title">
            <SidebarItem
              v-for="t in categoryTools"
              :key="t.id"
              :label="t.title"
              :active="isActive(toolRoute(t))"
              @click="navigateTo(toolRoute(t))"
            >
              <template #icon><Icon :name="category.icon" size="18" /></template>
            </SidebarItem>
          </SidebarGroup>
        </SidebarBody>
        <SidebarFooter>
          <span class="sidebar-foot">
            <Icon :name="UI_ICON.private" size="15" />
            Runs locally · private
          </span>
        </SidebarFooter>
      </Sidebar>
    </template>

    <template #header>
      <PageHeader v-if="tool" variant="plain" :title="tool.title" :description="tool.description">
        <template #breadcrumb>
          <div class="tool-head__crumb">
            <AppShellMenuButton />
            <Breadcrumb :items="crumbs" />
          </div>
        </template>
        <template #icon>
          <span class="tool-head__icon" aria-hidden="true">
            <Icon :name="category?.icon || UI_ICON.grid" size="20" />
          </span>
        </template>
        <ProcessingBadge :tag="tool.tag" />
        <template #actions>
          <IconButton variant="ghost" aria-label="Toggle theme" @click="toggleTheme">
            <!-- Client-only glyph: the theme is read from localStorage / the OS
                 preference, so an SSR'd icon would mismatch on hydration. -->
            <ClientOnly>
              <Icon :name="isDark ? UI_ICON.themeLight : UI_ICON.themeDark" size="18" />
              <template #fallback><Icon :name="UI_ICON.themeDark" size="18" /></template>
            </ClientOnly>
          </IconButton>
        </template>
      </PageHeader>
    </template>

    <main class="page">
      <slot />
      <SiteFooter class="page__footer" />
    </main>
  </AppShell>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 650;
  font-size: 1.05rem;
  letter-spacing: -0.015em;
  color: var(--text-primary, inherit);
  text-decoration: none;
}
.brand__mark {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  /* The icon file ships its own white plate and padding, so no accent
     background or glyph colour here — those would sit behind an opaque image. */
  object-fit: contain;
}
.brand__name {
  line-height: 1;
}
.tool-head__crumb {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tool-head__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: var(--accent-subtle);
  color: var(--text-brand);
}
.sidebar-foot {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 4rem;
}
.page__footer {
  margin-top: var(--space-12, 3rem);
}
</style>
