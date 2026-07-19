import { describe, expect, it } from 'vitest'
import {
  PdfPageRangeError,
  parsePdfChunks,
  parsePdfPageGroups,
  parsePdfPageList,
} from '@/utils/pdfPageRange'

describe('parsePdfPageList', () => {
  it('parses single pages and ranges, sorted & de-duplicated', () => {
    expect(parsePdfPageList('1-2, 2, 5', 10)).toEqual([1, 2, 5])
    expect(parsePdfPageList('5, 3, 4', 10)).toEqual([3, 4, 5])
  })

  it('treats an open-ended range as running to the last page', () => {
    expect(parsePdfPageList('8-', 10)).toEqual([8, 9, 10])
  })

  it('returns an empty list for an empty spec', () => {
    expect(parsePdfPageList('', 10)).toEqual([])
    expect(parsePdfPageList('  ,  ', 10)).toEqual([])
  })

  it('rejects out-of-bounds and reversed ranges', () => {
    expect(() => parsePdfPageList('0', 10)).toThrow(PdfPageRangeError)
    expect(() => parsePdfPageList('11', 10)).toThrow(PdfPageRangeError)
    expect(() => parsePdfPageList('7-3', 10)).toThrow(PdfPageRangeError)
    expect(() => parsePdfPageList('1-99', 10)).toThrow(PdfPageRangeError)
  })

  it('rejects non-numeric junk', () => {
    expect(() => parsePdfPageList('abc', 10)).toThrow(PdfPageRangeError)
    expect(() => parsePdfPageList('1-2-3', 10)).toThrow(PdfPageRangeError)
  })
})

describe('parsePdfPageGroups', () => {
  it('emits one group per comma segment, preserving order', () => {
    expect(parsePdfPageGroups('1-2, 5, 7-8', 10)).toEqual([[1, 2], [5], [7, 8]])
  })

  it('de-duplicates within a segment', () => {
    expect(parsePdfPageGroups('1-2, 3-3', 10)).toEqual([[1, 2], [3]])
  })

  it('throws when nothing valid is given', () => {
    expect(() => parsePdfPageGroups('', 10)).toThrow(PdfPageRangeError)
  })
})

describe('parsePdfChunks', () => {
  it('splits into fixed-size chunks with a short final chunk', () => {
    expect(parsePdfChunks(5, 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(parsePdfChunks(4, 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
    expect(parsePdfChunks(3, 5)).toEqual([[1, 2, 3]])
  })

  it('rejects a non-positive chunk size', () => {
    expect(() => parsePdfChunks(5, 0)).toThrow(PdfPageRangeError)
  })
})
