import { ref } from 'vue'

/**
 * Attempts a raw TCP connection to a user-supplied host:port via
 * `/api/network/port-check`, restricted to a curated allowlist of common
 * ports.
 */

export type PortCheckStatus = 'idle' | 'checking' | 'done' | 'error'
export type PortCheckResult = 'open' | 'closed' | 'timeout'
export type PortCheckErrorKind = 'invalid' | 'blocked' | 'rate-limited' | 'network' | null

export interface PortCheckAddressResult {
  ip: string
  result: PortCheckResult
}

export function usePortCheck() {
  const host = ref('')
  const port = ref<number>(443)
  const status = ref<PortCheckStatus>('idle')
  const results = ref<PortCheckAddressResult[]>([])
  const error = ref<string | null>(null)
  const errorKind = ref<PortCheckErrorKind>(null)

  async function check() {
    results.value = []
    error.value = null
    errorKind.value = null
    status.value = 'checking'

    let res: Response
    try {
      res = await fetch(
        `/api/network/port-check?host=${encodeURIComponent(host.value)}&port=${port.value}`,
        { cache: 'no-store' },
      )
    } catch {
      status.value = 'error'
      error.value =
        'Could not reach that host — it may be unreachable or blocking automated requests.'
      errorKind.value = 'network'
      return
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      status.value = 'error'
      error.value = body?.error ?? 'Something went wrong — try again.'
      errorKind.value =
        res.status === 429 || body?.kind === 'rate-limited'
          ? 'rate-limited'
          : (body?.kind ?? 'network')
      return
    }

    const data = (await res.json()) as { results: PortCheckAddressResult[] }
    results.value = data.results
    status.value = 'done'
  }

  return { host, port, status, results, error, errorKind, check }
}
