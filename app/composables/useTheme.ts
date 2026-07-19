import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'

/**
 * Light/dark theme, persisted to localStorage and applied as
 * `<html data-theme="…">` — the selector the JLDS token CSS keys off.
 * On a fresh visit we follow the OS preference (`initialValue: 'auto'`); an
 * explicit toggle persists 'light'/'dark'. A pre-paint inline script in
 * `nuxt.config.ts` resolves the same value before hydration so there's no flash.
 */
export function useTheme() {
  const mode = useColorMode({
    attribute: 'data-theme',
    modes: { light: 'light', dark: 'dark' },
    initialValue: 'auto',
    storageKey: 'toolkit-theme',
  })

  const isDark = computed(() => mode.value === 'dark')

  function toggle() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return { mode, isDark, toggle }
}
