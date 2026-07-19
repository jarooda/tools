/**
 * Shared open/closed state for the ⌘K command palette, so any component
 * (the header, the homepage hero, a sidebar item) can open the one palette
 * that the default layout mounts. Backed by Nuxt `useState` (SSR-safe singleton).
 */
export function usePalette() {
  const open = useState('command-palette-open', () => false)

  function openPalette() {
    open.value = true
  }
  function setPalette(next: boolean) {
    open.value = next
  }

  return { open, openPalette, setPalette }
}
