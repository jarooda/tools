import { ref } from 'vue'

/**
 * Orchestrates a full ping → download → upload speed test against the
 * `/api/speedtest/*` server routes. Nothing runs until `start()` is called
 * explicitly by the page — there is no auto-run and no `cancel()` (v1 scope).
 */

export type SpeedTestPhase = 'idle' | 'ping' | 'download' | 'upload' | 'done' | 'error'

const DOWNLOAD_BYTES = 8 * 1024 * 1024
const UPLOAD_BYTES = 4 * 1024 * 1024
const UPLOAD_CHUNK_BYTES = 64 * 1024

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

function mbps(bytes: number, seconds: number): number {
  if (seconds <= 0) return 0
  return (bytes * 8) / 1_000_000 / seconds
}

function randomBlob(totalBytes: number, chunkBytes: number): Blob {
  const parts: Uint8Array[] = []
  let remaining = totalBytes
  while (remaining > 0) {
    const size = Math.min(chunkBytes, remaining)
    const chunk = new Uint8Array(size)
    crypto.getRandomValues(chunk)
    parts.push(chunk)
    remaining -= size
  }
  return new Blob(parts)
}

export function useSpeedTest() {
  const phase = ref<SpeedTestPhase>('idle')
  const progress = ref(0)
  const ping = ref<number | null>(null)
  const downloadMbps = ref<number | null>(null)
  const uploadMbps = ref<number | null>(null)
  const error = ref<string | null>(null)
  const failedPhase = ref<SpeedTestPhase | null>(null)

  function failWith(err: unknown, phaseLabel: SpeedTestPhase) {
    failedPhase.value = phaseLabel
    phase.value = 'error'
    if (
      err &&
      typeof err === 'object' &&
      'status' in err &&
      (err as { status: number }).status === 429
    ) {
      error.value = 'Rate limited — try again in a few minutes.'
    } else {
      error.value = `Network error during the ${phaseLabel} test.`
    }
  }

  async function runPing() {
    phase.value = 'ping'
    progress.value = 0
    const samples: number[] = []
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now()
      const res = await fetch('/api/speedtest/ping', { cache: 'no-store' })
      if (res.status === 429) throw { status: 429 }
      if (!res.ok) throw new Error('ping failed')
      samples.push(performance.now() - t0)
      progress.value = (i + 1) / 5
    }
    ping.value = Math.round(median(samples))
  }

  async function runDownload() {
    phase.value = 'download'
    progress.value = 0
    downloadMbps.value = 0

    const res = await fetch('/api/speedtest/download', { cache: 'no-store' })
    if (res.status === 429) throw { status: 429 }
    if (!res.ok || !res.body) throw new Error('download failed')

    const reader = res.body.getReader()
    const start = performance.now()
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      const elapsed = (performance.now() - start) / 1000
      progress.value = Math.min(1, received / DOWNLOAD_BYTES)
      downloadMbps.value = mbps(received, elapsed)
    }
    const totalSeconds = (performance.now() - start) / 1000
    downloadMbps.value = mbps(received, totalSeconds)
  }

  function runUpload(): Promise<void> {
    phase.value = 'upload'
    progress.value = 0
    uploadMbps.value = 0

    const blob = randomBlob(UPLOAD_BYTES, UPLOAD_CHUNK_BYTES)
    const start = performance.now()

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/speedtest/upload')

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return
        progress.value = Math.min(1, evt.loaded / evt.total)
        const elapsed = (performance.now() - start) / 1000
        uploadMbps.value = mbps(evt.loaded, elapsed)
      }

      xhr.onload = () => {
        if (xhr.status === 429) {
          reject({ status: 429 })
          return
        }
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error('upload failed'))
          return
        }
        const totalSeconds = (performance.now() - start) / 1000
        uploadMbps.value = mbps(UPLOAD_BYTES, totalSeconds)
        progress.value = 1
        resolve()
      }
      xhr.onerror = () => reject(new Error('upload failed'))

      xhr.send(blob)
    })
  }

  async function start() {
    error.value = null
    failedPhase.value = null
    try {
      await runPing()
    } catch (err) {
      failWith(err, 'ping')
      return
    }

    try {
      await runDownload()
    } catch (err) {
      failWith(err, 'download')
      return
    }

    try {
      await runUpload()
    } catch (err) {
      failWith(err, 'upload')
      return
    }

    phase.value = 'done'
  }

  return { phase, progress, ping, downloadMbps, uploadMbps, error, failedPhase, start }
}
