import { describe, it, expect } from 'vitest'
import { parseCsv, csvToJson, jsonToCsv } from '@/utils/csvJson'

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles quoted fields with commas and newlines', () => {
    expect(parseCsv('name,note\n"Doe, John","line1\nline2"')).toEqual([
      ['name', 'note'],
      ['Doe, John', 'line1\nline2'],
    ])
  })

  it('handles escaped quotes', () => {
    expect(parseCsv('a\n"She said ""hi"""')).toEqual([['a'], ['She said "hi"']])
  })
})

describe('csvToJson', () => {
  it('uses the first row as keys', () => {
    const json = csvToJson('name,age\nAlice,30\nBob,25')
    expect(JSON.parse(json)).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('returns arrays when header is off', () => {
    const json = csvToJson('1,2\n3,4', { header: false })
    expect(JSON.parse(json)).toEqual([
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('supports a custom delimiter', () => {
    const json = csvToJson('a;b\n1;2', { delimiter: ';' })
    expect(JSON.parse(json)).toEqual([{ a: '1', b: '2' }])
  })
})

describe('jsonToCsv', () => {
  it('converts an array of objects, unioning keys', () => {
    const csv = jsonToCsv('[{"a":1,"b":2},{"a":3,"c":4}]')
    expect(csv).toBe('a,b,c\n1,2,\n3,,4')
  })

  it('quotes cells that need it', () => {
    const csv = jsonToCsv('[{"x":"a,b"},{"x":"say \\"hi\\""}]')
    expect(csv).toBe('x\n"a,b"\n"say ""hi"""')
  })

  it('round-trips with csvToJson', () => {
    const original = '[{"name":"Alice","age":"30"},{"name":"Bob","age":"25"}]'
    const csv = jsonToCsv(original)
    expect(csvToJson(csv)).toBe(JSON.stringify(JSON.parse(original), null, 2))
  })

  it('throws on non-array JSON', () => {
    expect(() => jsonToCsv('{"a":1}')).toThrow()
    expect(() => jsonToCsv('not json')).toThrow()
  })
})
