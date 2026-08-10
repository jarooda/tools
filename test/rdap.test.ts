import { describe, it, expect } from 'vitest'
import { extractVcardFn } from '../server/utils/rdap'

describe('extractVcardFn', () => {
  it('extracts the fn value from a well-formed vcardArray', () => {
    const vcardArray = [
      'vcard',
      [
        ['version', {}, 'text', '4.0'],
        ['fn', {}, 'text', 'Example Registrar, Inc.'],
      ],
    ]
    expect(extractVcardFn(vcardArray)).toBe('Example Registrar, Inc.')
  })

  it('returns null when there is no fn entry', () => {
    const vcardArray = ['vcard', [['version', {}, 'text', '4.0']]]
    expect(extractVcardFn(vcardArray)).toBeNull()
  })

  it('returns null for malformed/non-array input', () => {
    expect(extractVcardFn(null)).toBeNull()
    expect(extractVcardFn(undefined)).toBeNull()
    expect(extractVcardFn('vcard')).toBeNull()
    expect(extractVcardFn({ vcard: [] })).toBeNull()
  })

  it('returns null for an empty array', () => {
    expect(extractVcardFn([])).toBeNull()
    expect(extractVcardFn(['vcard'])).toBeNull()
  })
})
