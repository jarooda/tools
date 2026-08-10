import { ref } from 'vue'

export type UptimeCheckStatus = 'idle' | 'loading' | 'done' | 'error'
export type UptimeCheckErrorKind = 'invalid' | 'blocked' | 'rate-limited' | null

export function useUptimeCheck() {
  const url = ref('')
  const status = ref<UptimeCheckStatus>('idle')
  const up = ref<boolean | null>(null)
  const statusCode = ref<number | null>(null)
  const statusText = ref<string | null>(null)
  const responseMs = ref<number | null>(null)
  const error = ref<string | null>(null)
  const errorKind = ref<UptimeCheckErrorKind>(null)

  async function check() {
    status.value = 'loading'
    up.value = null
    statusCode.value = null
    statusText.value = null
    responseMs.value = null
    error.value = null
    errorKind.value = null

    let res: Response
    try {
      res = await fetch(`/api/network/uptime?url=${encodeURIComponent(url.value)}`, {
        cache: 'no-store',
      })
    } catch {
      status.value = 'error'
      error.value = 'Something went wrong — try again.'
      return
    }

    const body = await res.json().catch(() => null)

    if (!res.ok) {
      status.value = 'error'
      error.value = body?.error ?? 'Something went wrong — try again.'
      errorKind.value =
        res.status === 429 || body?.kind === 'rate-limited' ? 'rate-limited' : (body?.kind ?? null)
      return
    }

    up.value = Boolean(body.up)
    statusCode.value = body.statusCode ?? null
    statusText.value = body.statusText ?? null
    responseMs.value = body.responseMs ?? null
    status.value = 'done'
  }

  return { url, status, up, statusCode, statusText, responseMs, error, errorKind, check }
}
