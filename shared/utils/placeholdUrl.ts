/**
 * URL grammar for the `/placehold/*` image service — pure, DOM-free logic
 * (unit-tested in `test/`). Shared by the Nitro route that serves the image and
 * by the Placeholder tool page that builds shareable URLs.
 *
 *   /placehold/{size}[/{bg}[/{fg}]]?text=…&font=…
 *
 * `size` is `600x400` or `600` (square); colours are hex without `#` (3/4/6/8
 * digits) or one of the named basics below. Anything unrecognised falls back to
 * a default rather than failing, so an `<img>` still renders.
 *
 * Names are prefixed `placehold…`/`PLACEHOLD_…` so they stay unique across the
 * auto-imported `shared/utils` + `app/utils` namespace.
 */

export const PLACEHOLD_MAX_DIM = 4000
export const PLACEHOLD_MAX_TEXT = 100
export const PLACEHOLD_DEFAULT_BG = '#e2e8f0'
export const PLACEHOLD_DEFAULT_FG = '#475569'

/**
 * Font stacks the service can honour. Deliberately generic: SVG rendered inside
 * an `<img>` can't load webfonts, so only families already on the viewer's
 * machine will apply.
 */
export const PLACEHOLD_FONTS = {
  sans: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  serif: 'Georgia, Cambria, Times New Roman, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const

export type PlaceholdFont = keyof typeof PLACEHOLD_FONTS

/** The 16 HTML basic colours, plus `orange` and the common British/CMY aliases. */
export const PLACEHOLD_COLORS: Record<string, string> = {
  black: '#000000',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
  white: '#ffffff',
  maroon: '#800000',
  red: '#ff0000',
  purple: '#800080',
  fuchsia: '#ff00ff',
  magenta: '#ff00ff',
  green: '#008000',
  lime: '#00ff00',
  olive: '#808000',
  yellow: '#ffff00',
  navy: '#000080',
  blue: '#0000ff',
  teal: '#008080',
  aqua: '#00ffff',
  cyan: '#00ffff',
  orange: '#ffa500',
}

export interface PlaceholdParams {
  width: number
  height: number
  /** Normalised `#rrggbb` (or `#rrggbbaa`). */
  bg: string
  fg: string
  /** Custom label; blank means the generator falls back to `W×H`. */
  text: string
  font: PlaceholdFont
}

const clampDim = (n: number) => Math.max(1, Math.min(PLACEHOLD_MAX_DIM, Math.round(n)))

/**
 * `"600x400"` / `"600X400"` / `"600"` → dimensions, clamped to 1–`PLACEHOLD_MAX_DIM`.
 * Returns `null` when the segment isn't a usable size, so callers can 400.
 */
export function parsePlaceholdSize(segment: string): { width: number; height: number } | null {
  const m = /^(\d+)(?:[xX](\d+))?$/.exec(segment.trim())
  if (!m) return null
  const width = Number(m[1])
  const height = m[2] === undefined ? width : Number(m[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return null
  return { width: clampDim(width), height: clampDim(height) }
}

/**
 * A named basic colour or bare hex (`fff`, `ffff`, `ffffff`, `ffffffff`) →
 * `#rrggbb`/`#rrggbbaa`. Returns `null` when unrecognised.
 */
export function parsePlaceholdColor(segment: string): string | null {
  const raw = segment.trim().replace(/^#/, '').toLowerCase()
  if (!raw) return null
  const named = PLACEHOLD_COLORS[raw]
  if (named) return named
  if (!/^[0-9a-f]+$/.test(raw)) return null
  if (raw.length === 3 || raw.length === 4) {
    return '#' + [...raw].map((c) => c + c).join('')
  }
  if (raw.length === 6 || raw.length === 8) return '#' + raw
  return null
}

/** Coerce a query value (which may repeat) to a single string. */
function firstValue(v: unknown): string {
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : ''
  return typeof v === 'string' ? v : ''
}

function parseFont(value: string): PlaceholdFont {
  const key = value.trim().toLowerCase()
  return key in PLACEHOLD_FONTS ? (key as PlaceholdFont) : 'sans'
}

/**
 * Parse a full request into render params. `segments` is the path after
 * `/placehold/`. Returns `null` only when the size is unusable — every other
 * malformed part degrades to its default so the image still renders.
 */
export function parsePlaceholdRequest(
  segments: string[],
  query: Record<string, unknown> = {},
): PlaceholdParams | null {
  const [sizeSeg, bgSeg, fgSeg] = segments
  if (!sizeSeg) return null
  const size = parsePlaceholdSize(sizeSeg)
  if (!size) return null

  // `label` is accepted as an alias of `text` — it's what the tool UI calls it.
  const rawText = firstValue(query.text) || firstValue(query.label)

  return {
    ...size,
    bg: (bgSeg && parsePlaceholdColor(bgSeg)) || PLACEHOLD_DEFAULT_BG,
    fg: (fgSeg && parsePlaceholdColor(fgSeg)) || PLACEHOLD_DEFAULT_FG,
    text: rawText.slice(0, PLACEHOLD_MAX_TEXT),
    font: parseFont(firstValue(query.font)),
  }
}

/**
 * Build the shortest URL path that reproduces `params` — defaults are omitted,
 * but a non-default `fg` still needs its `bg` segment to hold the position.
 */
export function buildPlaceholdPath(params: PlaceholdParams): string {
  const { width, height, bg, fg, text, font } = params
  const size = width === height ? `${width}` : `${width}x${height}`
  const hex = (c: string) => c.replace(/^#/, '').toLowerCase()

  const parts = ['/placehold', size]
  const fgCustom = hex(fg) !== hex(PLACEHOLD_DEFAULT_FG)
  const bgCustom = hex(bg) !== hex(PLACEHOLD_DEFAULT_BG)
  if (bgCustom || fgCustom) parts.push(hex(bg))
  if (fgCustom) parts.push(hex(fg))

  const search = new URLSearchParams()
  const label = text.trim()
  if (label) search.set('text', label.slice(0, PLACEHOLD_MAX_TEXT))
  if (font !== 'sans') search.set('font', font)

  const qs = search.toString()
  return parts.join('/') + (qs ? `?${qs}` : '')
}
