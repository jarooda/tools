<script setup lang="ts">
import { computed } from 'vue'
import { CommandPalette } from '@/components/ui/command-palette'

/**
 * The single app-wide ⌘K palette. Mounted once in `app.vue` so every page
 * (home, category, tool) can open it via `usePalette()`. Searches the registry.
 */
const { tools, toolRoute } = useToolRegistry()
const { open, setPalette } = usePalette()

const items = computed(() =>
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
  if (tool) {
    setPalette(false)
    navigateTo(toolRoute(tool))
  }
}
</script>

<template>
  <CommandPalette
    :open="open"
    :items="items"
    placeholder="Search tools…"
    @update:open="setPalette"
    @select="onSelect"
  />
</template>
