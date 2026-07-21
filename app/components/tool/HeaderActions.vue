<script setup lang="ts">
import { IconButton } from '@/components/ui/icon-button'
import { Kbd } from '@/components/ui/kbd'
import { UI_ICON } from '@/lib/icons'

/** Right-hand header cluster shared by both layouts: ⌘K search, privacy pill, theme toggle. */
const { openPalette } = usePalette()
const { isDark, toggle: toggleTheme } = useTheme()
</script>

<template>
  <div class="header-actions">
    <button type="button" class="header-actions__search" @click="openPalette">
      <Icon :name="UI_ICON.search" size="15" />
      <span class="header-actions__search-label">Search tools</span>
      <Kbd>⌘K</Kbd>
    </button>
    <span class="header-actions__private">
      <Icon :name="UI_ICON.private" size="13" />
      100% private
    </span>
    <IconButton variant="ghost" aria-label="Toggle theme" @click="toggleTheme">
      <!-- The active theme comes from localStorage / the OS preference, which the
           server can't know — render the glyph client-side only so it never
           hydration-mismatches. The button itself stays SSR'd for stable layout. -->
      <ClientOnly>
        <Icon :name="isDark ? UI_ICON.themeLight : UI_ICON.themeDark" size="18" />
        <template #fallback><Icon :name="UI_ICON.themeDark" size="18" /></template>
      </ClientOnly>
    </IconButton>
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-actions__search {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 36px;
  padding: 0 10px 0 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--surface-card);
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 13px;
}
.header-actions__search:hover {
  border-color: var(--border-strong);
}
.header-actions__private {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--success-subtle);
  color: var(--success-text);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
@media (max-width: 640px) {
  .header-actions__private {
    display: none;
  }
  .header-actions__search-label {
    display: none;
  }
}
</style>
