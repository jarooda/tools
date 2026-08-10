import { ref } from 'vue'
import { getDomain } from 'tldts'

export type WhoisLookupStatus = 'idle' | 'loading' | 'done' | 'error'
export type WhoisLookupErrorKind = 'invalid' | 'rate-limited' | 'network' | null

const IPV4_LITERAL = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV6_LITERAL = /^\[?[0-9a-fA-F:]*:[0-9a-fA-F:]*\]?$/

function isIpLiteral(hostname: string): boolean {
  return IPV4_LITERAL.test(hostname) || IPV6_LITERAL.test(hostname)
}

function toRegistrableDomain(hostname: string): string | null {
  if (!hostname || isIpLiteral(hostname)) return null
  const registrable = getDomain(hostname)
  return registrable && registrable !== hostname ? registrable : null
}

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
  const normalizedDomain = ref<string | null>(null)

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
    normalizedDomain.value = toRegistrableDomain(domain.value)

    const lookupDomain = normalizedDomain.value ?? domain.value

    let res: Response
    try {
      res = await fetch(`/api/network/whois?domain=${encodeURIComponent(lookupDomain)}`, {
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
    normalizedDomain,
    lookup,
  }
}
