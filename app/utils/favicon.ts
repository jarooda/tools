/**
 * Favicon sizing metadata + a tiny ICO packer. DOM-free and unit-tested; the
 * page renders each PNG on a canvas and hands the bytes here to pack.
 *
 * The .ico is built by embedding PNG data directly in each icon entry, which
 * every current browser supports — no extra encoding library needed.
 */

export interface FaviconSize {
  size: number
  /** Base filename (without extension) + intended usage. */
  label: string
}

/** PNG outputs we generate for a modern favicon set. */
export const FAVICON_SIZES: FaviconSize[] = [
  { size: 16, label: 'favicon-16x16' },
  { size: 32, label: 'favicon-32x32' },
  { size: 48, label: 'favicon-48x48' },
  { size: 180, label: 'apple-touch-icon' },
  { size: 192, label: 'android-chrome-192x192' },
  { size: 512, label: 'android-chrome-512x512' },
]

/** Sizes bundled into the multi-resolution favicon.ico. */
export const ICO_SIZES = [16, 32, 48]

export interface IcoEntry {
  size: number
  png: Uint8Array
}

/** Pack one or more PNGs into a single multi-size ICO Blob. */
export function buildIco(entries: IcoEntry[]): Blob {
  const count = entries.length
  const headerSize = 6
  const dirSize = 16 * count
  let offset = headerSize + dirSize

  const header = new DataView(new ArrayBuffer(headerSize))
  header.setUint16(0, 0, true) // reserved
  header.setUint16(2, 1, true) // type: 1 = icon
  header.setUint16(4, count, true)

  const dir = new DataView(new ArrayBuffer(dirSize))
  entries.forEach((entry, i) => {
    const base = i * 16
    dir.setUint8(base, entry.size >= 256 ? 0 : entry.size) // width (0 = 256)
    dir.setUint8(base + 1, entry.size >= 256 ? 0 : entry.size) // height
    dir.setUint8(base + 2, 0) // palette count
    dir.setUint8(base + 3, 0) // reserved
    dir.setUint16(base + 4, 1, true) // colour planes
    dir.setUint16(base + 6, 32, true) // bits per pixel
    dir.setUint32(base + 8, entry.png.length, true) // bytes in resource
    dir.setUint32(base + 12, offset, true) // offset from file start
    offset += entry.png.length
  })

  const parts: BlobPart[] = [header.buffer, dir.buffer, ...entries.map((e) => e.png)]
  return new Blob(parts, { type: 'image/x-icon' })
}

/** The `<link>` / `<meta>` tags to reference a generated favicon set. */
export function faviconHtmlSnippet(): string {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="any" />',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
  ].join('\n')
}
