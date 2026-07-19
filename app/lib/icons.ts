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
  download: 'mdi:tray-arrow-down',
  reset: 'mdi:refresh',
  rotateLeft: 'mdi:rotate-left',
  rotateRight: 'mdi:rotate-right',
  flipHorizontal: 'mdi:flip-horizontal',
  flipVertical: 'mdi:flip-vertical',
  eyedropper: 'mdi:eyedropper-variant',
  /** Empty-state glyph for tools awaiting user input. */
  emptyInput: 'mdi:keyboard-outline',
  /** Empty-state glyph for tools awaiting an uploaded image/file. */
  emptyImage: 'mdi:image-plus-outline',
} as const

/**
 * Per-tool glyphs for the image category. Keyed by the registry tool `id`.
 * Kept here (not hard-coded in pages) so icons stay centralised and themeable.
 */
export const IMAGE_TOOL_ICON: Record<string, string> = {
  'image-watermark': 'mdi:watermark',
  'image-resize': 'mdi:resize',
  'image-convert': 'mdi:file-image-outline',
  'image-compress': 'mdi:zip-box-outline',
  'image-crop': 'mdi:crop',
  'image-rotate': 'mdi:rotate-right',
  'image-color-picker': 'mdi:eyedropper-variant',
  'image-base64': 'mdi:code-braces',
  'image-favicon': 'mdi:star-box-outline',
  'image-meme': 'mdi:format-text',
  'image-heic-to-jpg': 'mdi:image-sync-outline',
  'image-remove-bg': 'mdi:image-off-outline',
}

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
