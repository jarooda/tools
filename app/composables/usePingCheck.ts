import { ref } from 'vue'

/**
 * Fires 5 sequential HTTP round-trip checks against `/api/network/ping` for
 * a user-supplied target, building up `samples` one at a time so the UI can
 * render a live-growing sparkline.
 */

export type PingCheckStatus = 'idle' | 'checking' | 'done' | 'error'
export type PingCheckErrorKind = 'invalid' | 'unreachable' | 'rate-limited' | 'blocked' | null

const SAMPLE_COUNT = 5

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

export function usePingCheck() {
  const target = ref('')
  const status = ref<PingCheckStatus>('idle')
  const samples = ref<number[]>([])
  const stats = ref<{ min: number; max: number; median: number; avg: number } | null>(null)
  const error = ref<string | null>(null)
  const errorKind = ref<PingCheckErrorKind>(null)

  async function check() {
    samples.value = []
    stats.value = null
    error.value = null
    errorKind.value = null
    status.value = 'checking'

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      let res: Response
      try {
        res = await fetch(`/api/network/ping?target=${encodeURIComponent(target.value)}`, {
          cache: 'no-store',
        })
      } catch {
        status.value = 'error'
        error.value =
          'Target did not respond — it may be unreachable or blocking automated requests.'
        errorKind.value = 'unreachable'
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        status.value = 'error'
        error.value = body?.error ?? 'Something went wrong — try again.'
        if (res.status === 429 || body?.kind === 'rate-limited') {
          errorKind.value = 'rate-limited'
        } else if (body?.kind === 'invalid') {
          errorKind.value = 'invalid'
        } else if (body?.kind === 'blocked') {
          errorKind.value = 'blocked'
        } else {
          errorKind.value = 'unreachable'
        }
        return
      }

      const data = (await res.json()) as { rttMs: number }
      samples.value = [...samples.value, Math.round(data.rttMs)]
    }

    const values = samples.value
    stats.value = {
      min: Math.round(Math.min(...values)),
      max: Math.round(Math.max(...values)),
      median: Math.round(median(values)),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    }
    status.value = 'done'
  }

  return { target, status, samples, stats, error, errorKind, check }
}
