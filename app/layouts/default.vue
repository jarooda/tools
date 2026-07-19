<script setup lang="ts">
import { ref, computed } from 'vue'
import { AppShell, AppShellMenuButton } from '@/components/ui/app-shell'
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarGroup,
  SidebarItem,
} from '@/components/ui/sidebar'
import { CommandPalette } from '@/components/ui/command-palette'
import { Kbd } from '@/components/ui/kbd'
import { Toaster } from '@/components/ui/toast'
import { APP_NAME } from '@/lib/config'

const route = useRoute()
const { categoriesWithTools, toolRoute } = useToolRegistry()

const groups = categoriesWithTools().filter((g) => g.tools.length > 0)

function isActive(path: string) {
  return route.path === path
}

// ⌘K command palette — search across every registered tool.
const paletteOpen = ref(false)
const { tools } = useToolRegistry()
const paletteItems = computed(() =>
  tools.map((t) => ({
    id: t.id,
    label: t.title,
    hint: t.description,
    group: t.category,
    keywords: t.keywords,
  })),
)

function onSelect(item: { id?: string }) {
  const tool = tools.find((t) => t.id === item.id)
  if (tool) navigateTo(toolRoute(tool))
}
</script>

<template>
  <AppShell>
    <template #sidebar>
      <Sidebar>
        <SidebarHeader>
          <NuxtLink to="/" class="brand">{{ APP_NAME }}</NuxtLink>
        </SidebarHeader>
        <SidebarBody>
          <SidebarGroup v-for="group in groups" :key="group.slug" :label="group.title">
            <SidebarItem
              v-for="tool in group.tools"
              :key="tool.id"
              :label="tool.title"
              :active="isActive(toolRoute(tool))"
              @click="navigateTo(toolRoute(tool))"
            />
          </SidebarGroup>
        </SidebarBody>
      </Sidebar>
    </template>

    <template #header>
      <header class="topbar">
        <AppShellMenuButton />
        <NuxtLink to="/" class="topbar__brand">{{ APP_NAME }}</NuxtLink>
        <button type="button" class="topbar__search" @click="paletteOpen = true">
          <span>Search tools</span>
          <Kbd>⌘K</Kbd>
        </button>
      </header>
    </template>

    <main class="page">
      <slot />
    </main>

    <CommandPalette
      v-model:open="paletteOpen"
      :items="paletteItems"
      placeholder="Search tools…"
      @select="onSelect"
    />
    <Toaster />
  </AppShell>
</template>

<style scoped>
.brand {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-strong, inherit);
  text-decoration: none;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--border, #d9e0dd);
}
.topbar__brand {
  font-weight: 700;
  text-decoration: none;
  color: inherit;
}
.topbar__search {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border, #d9e0dd);
  border-radius: 0.5rem;
  background: transparent;
  color: var(--text-muted, #6f7d78);
  cursor: pointer;
  font-size: 0.875rem;
}
.topbar__search:hover {
  background: var(--surface-hover, #eef2f0);
}
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}
</style>
