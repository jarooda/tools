import { describe, it, expect } from 'vitest'
import { buildHeaderList } from '../server/utils/httpHeaders'

function makeResponse(entries: Array<[string, string]>): Response {
  const headers = new Headers()
  for (const [name, value] of entries) headers.append(name, value)
  return new Response(null, { headers })
}

describe('buildHeaderList', () => {
  it('returns one row per header in order for ordinary headers', () => {
    const response = makeResponse([
      ['content-type', 'text/html'],
      ['x-frame-options', 'DENY'],
    ])

    expect(buildHeaderList(response)).toEqual([
      { name: 'content-type', value: 'text/html' },
      { name: 'x-frame-options', value: 'DENY' },
    ])
  })

  it('emits a separate row per set-cookie value instead of comma-joining', () => {
    const response = makeResponse([
      ['content-type', 'text/html'],
      ['set-cookie', 'a=1; Path=/'],
      ['set-cookie', 'b=2; Path=/; HttpOnly'],
    ])

    const rows = buildHeaderList(response)

    expect(rows).toEqual([
      { name: 'content-type', value: 'text/html' },
      { name: 'set-cookie', value: 'a=1; Path=/' },
      { name: 'set-cookie', value: 'b=2; Path=/; HttpOnly' },
    ])
  })

  it('handles a single set-cookie header without a comma artifact', () => {
    const response = makeResponse([['set-cookie', 'session=abc; Secure']])

    expect(buildHeaderList(response)).toEqual([
      { name: 'set-cookie', value: 'session=abc; Secure' },
    ])
  })

  it('returns an empty array when there are no headers', () => {
    const response = makeResponse([])
    expect(buildHeaderList(response)).toEqual([])
  })
})
