import { describe, it, expect } from 'vitest'
import { formatJson, minifyJson } from '@/utils/jsonFormat'

describe('formatJson', () => {
  it('pretty-prints with 2-space indent', () => {
    const r = formatJson('{"a":1,"b":[2,3]}')
    expect(r.error).toBeNull()
    expect(r.output).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}')
  })

  it('supports tab indentation', () => {
    const r = formatJson('{"a":1}', 'tab')
    expect(r.output).toBe('{\n\t"a": 1\n}')
  })

  it('is empty for empty input', () => {
    expect(formatJson('')).toEqual({ output: '', error: null })
  })

  it('reports an error message on invalid JSON', () => {
    const r = formatJson('{\n  "a": 1,\n  "b": ,\n}')
    expect(r.output).toBe('')
    expect(r.error).not.toBeNull()
    expect(r.error?.message).toBeTruthy()
  })

  it('derives line/column when the engine reports a position', () => {
    // "Unexpected non-whitespace character after JSON data at position N".
    const r = formatJson('{"a":1} trailing')
    expect(r.error).not.toBeNull()
    if (r.error?.line != null) {
      expect(r.error.line).toBeGreaterThanOrEqual(1)
      expect(r.error.column).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('minifyJson', () => {
  it('collapses to a single line', () => {
    const r = minifyJson('{\n  "a": 1,\n  "b": 2\n}')
    expect(r.output).toBe('{"a":1,"b":2}')
  })

  it('reports errors', () => {
    expect(minifyJson('{bad}').error).not.toBeNull()
  })
})
