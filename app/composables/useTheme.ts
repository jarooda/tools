import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'

/**
 * Light/dark theme, persisted to localStorage and applied as
 * `<html data-theme="…">` — the selector the JLDS token CSS keys off.
 * Light-first (JLDS default); dark is opt-in via the header toggle.
 */
export function useTheme() {
  const mode = useColorMode({
    attribute: 'data-theme',
    modes: { light: 'light', dark: 'dark' },
    initialValue: 'light',
    storageKey: 'toolkit-theme',
  })

  const isDark = computed(() => mode.value === 'dark')

  function toggle() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return { mode, isDark, toggle }
}
