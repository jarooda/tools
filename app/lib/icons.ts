/**
 * Central icon registry — the single source of truth for every icon name.
 *
 * We render icons with the `@nuxt/icon` module (`<Icon :name="…" />`) using the
 * Material Design Icons set (`mdi:*`), bundled locally. Never hard-code an
 * `mdi:*` string in a component — reference one of the constants below so the
 * whole app stays visually consistent and icons are trivial to re-theme.
 */
import type { CategorySlug } from './tools/categories'
import type { ProcessingTag } from './tools/registry'

/** Per-category glyph, e.g. the PDF category uses `mdi:file-pdf-box`. */
export const CATEGORY_ICON: Record<CategorySlug, string> = {
  convert: 'mdi:swap-horizontal',
  image: 'mdi:image-outline',
  pdf: 'mdi:file-pdf-box',
  text: 'mdi:format-text',
  encode: 'mdi:code-braces',
  generate: 'mdi:auto-fix',
  color: 'mdi:palette-outline',
  media: 'mdi:play-circle-outline',
}

/** App-chrome / action icons used across the shell and tool pages. */
export const UI_ICON = {
  brand: 'mdi:toolbox-outline',
  search: 'mdi:magnify',
  private: 'mdi:shield-lock-outline',
  themeLight: 'mdi:white-balance-sunny',
  themeDark: 'mdi:weather-night',
  home: 'mdi:home-outline',
  grid: 'mdi:view-grid-outline',
  arrowRight: 'mdi:arrow-right',
  chevronRight: 'mdi:chevron-right',
  copy: 'mdi:content-copy',
  check: 'mdi:check',
  menu: 'mdi:menu',
  /** Empty-state glyph for tools awaiting user input. */
  emptyInput: 'mdi:keyboard-outline',
} as const

/** JLDS Tag/Badge colour tokens. */
type StatusColor = 'success' | 'info' | 'warning'

/**
 * Where a tool does its processing, with the label, JLDS colour, and the CSS
 * dot colour used in the homepage legend. Keyed by the registry `tag`.
 */
export const PROCESSING_META: Record<
  ProcessingTag,
  { label: string; color: StatusColor; dotVar: string; hint: string }
> = {
  client: {
    label: 'Client',
    color: 'success',
    dotVar: 'var(--success)',
    hint: 'Runs entirely in your browser',
  },
  hybrid: {
    label: 'Hybrid',
    color: 'info',
    dotVar: 'var(--info)',
    hint: 'WASM in-browser with a server fallback',
  },
  server: {
    label: 'Server',
    color: 'warning',
    dotVar: 'var(--warning)',
    hint: 'Needs a server round-trip',
  },
}
