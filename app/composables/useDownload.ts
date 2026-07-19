/**
 * Trigger a browser download for generated output (text or Blob).
 * Client-only: creates a temporary object URL and revokes it after use.
 */
export function useDownload() {
  function downloadBlob(blob: Blob, filename: string) {
    if (import.meta.server) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoke on the next tick so the download has started.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function downloadText(text: string, filename: string, mime = 'text/plain;charset=utf-8') {
    downloadBlob(new Blob([text], { type: mime }), filename)
  }

  return { downloadBlob, downloadText }
}
