/**
 * Pure format metadata + filename helpers for the image tools. DOM-free and
 * unit-tested. Whether the browser can actually *encode* a format is a runtime
 * concern handled by `useCanvasImage().canEncode()`.
 */

export interface ImageFormatMeta {
  mime: string
  ext: string
  label: string
  lossy: boolean
}

/** The output formats the converter/compressor can target. */
export const IMAGE_FORMATS = {
  png: { mime: 'image/png', ext: 'png', label: 'PNG', lossy: false },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPG', lossy: true },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WebP', lossy: true },
  avif: { mime: 'image/avif', ext: 'avif', label: 'AVIF', lossy: true },
} as const satisfies Record<string, ImageFormatMeta>

export type ImageFormat = keyof typeof IMAGE_FORMATS

/** Replace a filename's extension with the target format's (keeps the stem). */
export function outputFilename(originalName: string, format: ImageFormat): string {
  const stem = originalName.replace(/\.[^./\\]+$/, '') || 'image'
  return `${stem}.${IMAGE_FORMATS[format].ext}`
}

/** Best-guess output format from a source MIME type (defaults to PNG). */
export function formatFromMime(mime: string): ImageFormat {
  const hit = (Object.keys(IMAGE_FORMATS) as ImageFormat[]).find(
    (k) => IMAGE_FORMATS[k].mime === mime,
  )
  return hit ?? 'png'
}
