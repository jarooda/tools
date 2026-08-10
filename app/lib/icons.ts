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
  dev: 'mdi:code-tags',
  network: 'mdi:speedometer',
  datetime: 'mdi:calendar-clock',
}

/** App-chrome / action icons used across the shell and tool pages. */
export const UI_ICON = {
  search: 'mdi:magnify',
  private: 'mdi:shield-lock-outline',
  offline: 'mdi:cloud-off-outline',
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
  magic: 'mdi:auto-fix',
  add: 'mdi:plus',
  remove: 'mdi:close',
  trash: 'mdi:trash-can-outline',
  dragHandle: 'mdi:drag-vertical',
  arrowUp: 'mdi:arrow-up',
  arrowDown: 'mdi:arrow-down',
  filePdf: 'mdi:file-pdf-box',
  lock: 'mdi:lock-outline',
  lockOpen: 'mdi:lock-open-variant-outline',
  eye: 'mdi:eye-outline',
  eyeOff: 'mdi:eye-off-outline',
  fileWord: 'mdi:file-word-outline',
  play: 'mdi:play',
  pause: 'mdi:pause',
  stop: 'mdi:stop',
  volumeOff: 'mdi:volume-off',
  qrcode: 'mdi:qrcode',
  qrScan: 'mdi:qrcode-scan',
  camera: 'mdi:camera-outline',
  cameraOff: 'mdi:camera-off-outline',
  key: 'mdi:key-variant',
  dice: 'mdi:dice-multiple-outline',
  shuffle: 'mdi:shuffle-variant',
  palette: 'mdi:palette-swatch-outline',
  contrast: 'mdi:contrast-circle',
  gradient: 'mdi:gradient-horizontal',
  eyeCheck: 'mdi:eye-check-outline',
  video: 'mdi:video-outline',
  music: 'mdi:music-note-outline',
  scissors: 'mdi:content-cut',
  gif: 'mdi:file-gif-box',
  /** Empty-state glyph for tools awaiting user input. */
  emptyInput: 'mdi:keyboard-outline',
  /** Empty-state glyph for tools awaiting an uploaded image/file. */
  emptyImage: 'mdi:image-plus-outline',
  /** Empty-state glyph for tools awaiting an uploaded PDF/document. */
  emptyFile: 'mdi:file-upload-outline',
  /** Empty-state glyph for tools awaiting an uploaded audio/video file. */
  emptyMedia: 'mdi:video-plus-outline',
  typescript: 'mdi:language-typescript',
  dns: 'mdi:dns-outline',
  domain: 'mdi:web',
  portOpen: 'mdi:lan-connect',
  portClosed: 'mdi:lan-disconnect',
  portTimeout: 'mdi:lan-pending',
  httpHeaders: 'mdi:format-list-bulleted-type',
  siteUp: 'mdi:web-check',
  siteDown: 'mdi:web-off',
  browser: 'mdi:web',
  os: 'mdi:laptop',
  device: 'mdi:cellphone-link',
  engine: 'mdi:cog-outline',
  swapVertical: 'mdi:swap-vertical',
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

/**
 * Per-tool glyphs for the PDF category. Keyed by the registry tool `id`.
 */
export const PDF_TOOL_ICON: Record<string, string> = {
  'pdf-merge': 'mdi:call-merge',
  'pdf-split': 'mdi:call-split',
  'pdf-images-to-pdf': 'mdi:image-multiple-outline',
  'pdf-to-images': 'mdi:file-image-outline',
  'pdf-organize': 'mdi:file-document-multiple-outline',
  'pdf-rotate': 'mdi:rotate-right',
  'pdf-watermark': 'mdi:watermark',
  'pdf-protect': 'mdi:lock-outline',
  'pdf-unlock': 'mdi:lock-open-variant-outline',
  'pdf-extract-text': 'mdi:text-box-outline',
  'pdf-compress': 'mdi:zip-box-outline',
  'pdf-office-to-pdf': 'mdi:file-word-outline',
}

/**
 * Per-tool glyphs for the audio & video category. Keyed by the registry `id`.
 */
export const MEDIA_TOOL_ICON: Record<string, string> = {
  'media-convert': 'mdi:file-video-outline',
  'media-trim': 'mdi:content-cut',
  'media-extract-audio': 'mdi:music-note-outline',
  'media-gif': 'mdi:file-gif-box',
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
