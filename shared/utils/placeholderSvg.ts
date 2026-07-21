/**
 * Placeholder-image SVG builder — pure, DOM-free logic (unit-tested).
 * Produces a self-contained SVG string (solid background + centred label) that
 * the page can show inline, download, or rasterise to PNG via a canvas.
 */

export interface PlaceholderOptions {
  width: number
  height: number
  bg: string
  fg: string
  /** Custom label; defaults to the `W×H` dimensions when blank. */
  text?: string
  /** Font size in px; auto-derived from the smaller side when omitted. */
  fontSize?: number
  /**
   * CSS font-family stack. Must be a family the *viewer* already has: an SVG
   * loaded through `<img src>` cannot fetch external resources, so webfonts
   * never apply. Defaults to the system sans stack.
   */
  fontFamily?: string
}

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/** The label to render: the trimmed custom text, or `W×H` dimensions. */
export function placeholderLabel(width: number, height: number, text?: string): string {
  const t = text?.trim()
  return t ? t : `${width}×${height}`
}

/** Default font size — one-eighth of the smaller side, clamped to sane bounds. */
export function placeholderFontSize(width: number, height: number): number {
  return Math.max(12, Math.min(160, Math.round(Math.min(width, height) / 8)))
}

/** Build a complete placeholder-image SVG document string. */
export function placeholderSvg(opts: PlaceholderOptions): string {
  const w = Math.max(1, Math.round(opts.width))
  const h = Math.max(1, Math.round(opts.height))
  const label = placeholderLabel(w, h, opts.text)
  const fontSize = opts.fontSize ?? placeholderFontSize(w, h)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="100%" height="100%" fill="${escapeXml(opts.bg)}"/>`,
    `<text x="50%" y="50%" fill="${escapeXml(opts.fg)}"` +
      ` font-family="${escapeXml(opts.fontFamily ?? 'system-ui, sans-serif')}"` +
      ` font-size="${fontSize}" font-weight="600" text-anchor="middle"` +
      ` dominant-baseline="central">${escapeXml(label)}</text>`,
    `</svg>`,
  ].join('')
}
