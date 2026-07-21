/**
 * PDF helpers shared by every `/pdf/*` tool. Both engines are **lazy-loaded**
 * via dynamic `import()` so neither touches the base bundle — they only arrive
 * when a tool actually runs:
 *   • `pdf-lib`     — read/write PDF structure (merge, split, rotate, watermark…)
 *   • `pdfjs-dist`  — render pages to canvas + extract text (to-images, thumbs…)
 *
 * All work happens in the browser; files are never uploaded.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist'

export function usePdf() {
  /** Lazy-load pdf-lib (the editor engine). */
  async function loadPdfLib() {
    return await import('pdf-lib')
  }

  /**
   * Lazy-load the `@cantoo/pdf-lib` fork, which adds AES encryption/decryption
   * that stock pdf-lib lacks. Used only by Protect (3.8) and Unlock (3.9).
   */
  async function loadPdfCrypto() {
    return await import('@cantoo/pdf-lib')
  }

  /** Lazy-load pdf.js (the renderer engine), wiring its worker on first use. */
  async function loadPdfjs() {
    const pdfjs = await import('pdfjs-dist')
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = (
        await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      ).default
    }
    return pdfjs
  }

  /** Read a File/Blob into raw bytes for either engine. */
  async function readBytes(file: Blob): Promise<Uint8Array> {
    return new Uint8Array(await file.arrayBuffer())
  }

  /** Open a document with pdf.js (for rendering/text). Release it with `closeDoc`. */
  async function openForRender(file: Blob): Promise<PDFDocumentProxy> {
    const pdfjs = await loadPdfjs()
    const data = await readBytes(file)
    return await pdfjs.getDocument({ data }).promise
  }

  /**
   * Release a document opened with `openForRender`.
   *
   * ⚠️ pdf.js exposes `destroy()` on the **loading task**, not on the document
   * proxy — `doc.destroy()` throws "is not a function" and leaks the worker.
   * Always close through here.
   */
  async function closeDoc(doc: PDFDocumentProxy | null | undefined): Promise<void> {
    try {
      await doc?.loadingTask?.destroy()
    } catch {
      /* already torn down — nothing to release */
    }
  }

  /**
   * Render one page (1-based) of an already-open pdf.js document into a fresh
   * canvas at the given scale. Used for previews, thumbnails, and PDF→image.
   */
  async function renderPageToCanvas(
    doc: PDFDocumentProxy,
    pageNumber: number,
    scale = 1.5,
  ): Promise<HTMLCanvasElement> {
    const page = await doc.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    return canvas
  }

  function canvasToBlob(canvas: HTMLCanvasElement, mime = 'image/png', quality?: number) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed.'))),
        mime,
        quality,
      )
    })
  }

  return {
    loadPdfLib,
    loadPdfCrypto,
    loadPdfjs,
    readBytes,
    openForRender,
    closeDoc,
    renderPageToCanvas,
    canvasToBlob,
  }
}
