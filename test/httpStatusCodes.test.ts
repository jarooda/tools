import { describe, expect, it } from 'vitest'
import { filterHttpStatusEntries, httpStatusEntries } from '@/utils/httpStatusCodes'

const ALL_CLASSES = ['1xx', '2xx', '3xx', '4xx', '5xx'] as const

describe('filterHttpStatusEntries', () => {
  it('returns all entries when search is empty and all classes selected', () => {
    const result = filterHttpStatusEntries(httpStatusEntries, '', [...ALL_CLASSES])
    expect(result).toHaveLength(httpStatusEntries.length)
  })

  it('matches by code', () => {
    const result = filterHttpStatusEntries(httpStatusEntries, '404', [...ALL_CLASSES])
    expect(result.map((e) => e.code)).toEqual([404])
  })

  it('matches by name', () => {
    const result = filterHttpStatusEntries(httpStatusEntries, 'teapot', [...ALL_CLASSES])
    expect(result.map((e) => e.code)).toEqual([418])
  })

  it('matches by keyword not present in name/description', () => {
    const result = filterHttpStatusEntries(httpStatusEntries, 'rate limit', [...ALL_CLASSES])
    expect(result.map((e) => e.code)).toEqual([429])
  })

  it('is case-insensitive', () => {
    const result = filterHttpStatusEntries(httpStatusEntries, 'NOT FOUND', [...ALL_CLASSES])
    expect(result.map((e) => e.code)).toEqual([404])
  })

  it('filters by selected classes', () => {
    const result = filterHttpStatusEntries(httpStatusEntries, '', ['5xx'])
    expect(result.every((e) => e.class === '5xx')).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns no entries when the class is not selected even if search matches', () => {
    const result = filterHttpStatusEntries(httpStatusEntries, '404', ['5xx'])
    expect(result).toHaveLength(0)
  })

  it('combines search and class filters', () => {
    const result = filterHttpStatusEntries(httpStatusEntries, 'gateway', ['5xx'])
    expect(result.map((e) => e.code).sort()).toEqual([502, 504])
  })
})
