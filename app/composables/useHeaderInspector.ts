import { ref } from 'vue'

export type HeaderInspectorStatus = 'idle' | 'loading' | 'done' | 'error'
export type HeaderInspectorErrorKind = 'invalid' | 'blocked' | 'rate-limited' | 'network' | null

export function useHeaderInspector() {
  const url = ref('')
  const status = ref<HeaderInspectorStatus>('idle')
  const statusCode = ref<number | null>(null)
  const statusText = ref<string | null>(null)
  const headers = ref<Array<{ name: string; value: string }>>([])
  const redirected = ref(false)
  const finalUrl = ref<string | null>(null)
  const error = ref<string | null>(null)
  const errorKind = ref<HeaderInspectorErrorKind>(null)

  async function inspect() {
    status.value = 'loading'
    statusCode.value = null
    statusText.value = null
    headers.value = []
    redirected.value = false
    finalUrl.value = null
    error.value = null
    errorKind.value = null

    let res: Response
    try {
      res = await fetch(`/api/network/headers?url=${encodeURIComponent(url.value)}`, {
        cache: 'no-store',
      })
    } catch {
      status.value = 'error'
      error.value =
        'Could not reach that host — it may be unreachable or blocking automated requests.'
      errorKind.value = 'network'
      return
    }

    const body = await res.json().catch(() => null)

    if (!res.ok) {
      status.value = 'error'
      error.value = body?.error ?? 'Something went wrong — try again.'
      errorKind.value =
        res.status === 429 || body?.kind === 'rate-limited'
          ? 'rate-limited'
          : (body?.kind ?? 'network')
      return
    }

    statusCode.value = body.statusCode
    statusText.value = body.statusText
    headers.value = body.headers ?? []
    redirected.value = Boolean(body.redirected)
    finalUrl.value = body.finalUrl ?? null
    status.value = 'done'
  }

  return {
    url,
    status,
    statusCode,
    statusText,
    headers,
    redirected,
    finalUrl,
    error,
    errorKind,
    inspect,
  }
}
