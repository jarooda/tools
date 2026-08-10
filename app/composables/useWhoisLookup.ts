import { ref } from 'vue'

export type WhoisLookupStatus = 'idle' | 'loading' | 'done' | 'error'
export type WhoisLookupErrorKind = 'invalid' | 'rate-limited' | 'network' | null

export function useWhoisLookup() {
  const domain = ref('')
  const status = ref<WhoisLookupStatus>('idle')
  const found = ref<boolean | null>(null)
  const registrar = ref<string | null>(null)
  const statuses = ref<string[]>([])
  const nameservers = ref<string[]>([])
  const events = ref<Array<{ action: string; date: string }>>([])
  const raw = ref<unknown>(null)
  const error = ref<string | null>(null)
  const errorKind = ref<WhoisLookupErrorKind>(null)

  async function lookup() {
    status.value = 'loading'
    found.value = null
    registrar.value = null
    statuses.value = []
    nameservers.value = []
    events.value = []
    raw.value = null
    error.value = null
    errorKind.value = null

    let res: Response
    try {
      res = await fetch(`/api/network/whois?domain=${encodeURIComponent(domain.value)}`, {
        cache: 'no-store',
      })
    } catch {
      status.value = 'error'
      error.value = 'Could not reach the WHOIS/RDAP service — try again in a moment.'
      errorKind.value = 'network'
      return
    }

    const body = await res.json().catch(() => null)

    if (!res.ok) {
      status.value = 'error'
      error.value = body?.error ?? 'Something went wrong — try again.'
      if (res.status === 429 || body?.kind === 'rate-limited') {
        errorKind.value = 'rate-limited'
      } else if (body?.kind === 'invalid') {
        errorKind.value = 'invalid'
      } else {
        errorKind.value = 'network'
      }
      return
    }

    if (!body?.found) {
      found.value = false
      status.value = 'done'
      return
    }

    found.value = true
    registrar.value = body.registrar ?? null
    statuses.value = body.statuses ?? []
    nameservers.value = body.nameservers ?? []
    events.value = body.events ?? []
    raw.value = body.raw ?? null
    status.value = 'done'
  }

  return {
    domain,
    status,
    found,
    registrar,
    statuses,
    nameservers,
    events,
    raw,
    error,
    errorKind,
    lookup,
  }
}
