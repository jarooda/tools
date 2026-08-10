import { ref } from 'vue'
import { lookupDns, type DnsAnswer, type DnsRecordType } from '@/utils/dnsLookup'

export type DnsLookupStatus = 'idle' | 'loading' | 'done' | 'error'

export function useDnsLookup() {
  const hostname = ref('')
  const recordType = ref<DnsRecordType>('A')
  const status = ref<DnsLookupStatus>('idle')
  const answers = ref<DnsAnswer[]>([])
  const error = ref<string | null>(null)

  async function lookup() {
    status.value = 'loading'
    error.value = null

    const result = await lookupDns(hostname.value, recordType.value)

    answers.value = result.answers
    error.value = result.error
    status.value = result.error ? 'error' : 'done'
  }

  return { hostname, recordType, status, answers, error, lookup }
}
