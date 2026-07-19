/**
 * Canvas/image helpers shared by every `/image/*` tool. All work happens in the
 * browser — files are never uploaded. Keeps DOM/canvas concerns out of the pages
 * so they stay focused on UI, and centralises encoder feature-detection.
 */

/** A decoded image plus its natural dimensions and a preview object URL. */
export interface LoadedImage {
  el: HTMLImageElement
  width: number
  height: number
  /** Object URL for the original file — revoke via `revoke()` when done. */
  url: string
  file: File
  revoke: () => void
}

export function useCanvasImage() {
  /** Load a File into an `<img>`, resolving once it has real dimensions. */
  function loadImage(file: File): Promise<LoadedImage> {
    return new Promise((resolve, reject) => {
      if (import.meta.server) {
        reject(new Error('loadImage is client-only'))
        return
      }
      const url = URL.createObjectURL(file)
      const el = new Image()
      el.onload = () => {
        resolve({
          el,
          width: el.naturalWidth,
          height: el.naturalHeight,
          url,
          file,
          revoke: () => URL.revokeObjectURL(url),
        })
      }
      el.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Could not decode this image.'))
      }
      el.src = url
    })
  }

  /** Draw a source into a fresh canvas at the given size (defaults to natural). */
  function createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width))
    canvas.height = Math.max(1, Math.round(height))
    return canvas
  }

  /** Encode a canvas to a Blob. `quality` (0–1) applies to lossy formats only. */
  function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed.'))),
        mime,
        quality,
      )
    })
  }

  /**
   * Whether the browser can actually *encode* a MIME type — some (notably AVIF)
   * are decode-only, in which case `toDataURL` silently falls back to PNG.
   */
  function canEncode(mime: string): boolean {
    if (import.meta.server) return false
    const c = document.createElement('canvas')
    c.width = c.height = 1
    return c.toDataURL(mime).startsWith(`data:${mime}`)
  }

  return { loadImage, createCanvas, canvasToBlob, canEncode }
}
