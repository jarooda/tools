import { describe, it, expect } from 'vitest'
import { jsonToTypeScript, type JsonToTsOptions } from '@/utils/jsonToTs'

const defaults: JsonToTsOptions = {
  rootName: 'RootObject',
  declarationStyle: 'interface',
  semicolons: true,
  readonly: false,
  nullOptional: true,
}

function gen(input: string, overrides: Partial<JsonToTsOptions> = {}) {
  return jsonToTypeScript(input, { ...defaults, ...overrides })
}

describe('jsonToTypeScript', () => {
  it('returns empty output for empty input', () => {
    expect(gen('')).toEqual({ output: '', error: null })
    expect(gen('   ')).toEqual({ output: '', error: null })
  })

  it('reports invalid JSON', () => {
    const r = gen('{ not valid json')
    expect(r.output).toBe('')
    expect(r.error).not.toBeNull()
  })

  it('generates primitives on a root object', () => {
    const r = gen('{"name": "Ada", "age": 36, "active": true}')
    expect(r.error).toBeNull()
    expect(r.output).toContain('interface RootObject {')
    expect(r.output).toContain('name: string;')
    expect(r.output).toContain('age: number;')
    expect(r.output).toContain('active: boolean;')
  })

  it('generates a nested interface named from the property key', () => {
    const r = gen('{"shipping_address": {"city": "NYC", "zip": "10001"}}')
    expect(r.error).toBeNull()
    expect(r.output).toContain('shipping_address: ShippingAddress;')
    expect(r.output).toContain('interface ShippingAddress {')
    expect(r.output).toContain('city: string;')
  })

  it('generates arrays of primitives', () => {
    const r = gen('{"tags": ["a", "b"]}')
    expect(r.error).toBeNull()
    expect(r.output).toContain('tags: string[];')
  })

  it('generates mixed-primitive arrays as a parenthesized union', () => {
    const r = gen('{"values": [1, "a"]}')
    expect(r.error).toBeNull()
    expect(r.output).toMatch(/values: \((string \| number|number \| string)\)\[\];/)
  })

  it('merges keys across array-of-object elements and marks missing keys optional', () => {
    const r = gen('{"items": [{"id": 1, "name": "a"}, {"id": 2}]}')
    expect(r.error).toBeNull()
    expect(r.output).toContain('items: Item[];')
    expect(r.output).toContain('interface Item {')
    expect(r.output).toContain('id: number;')
    expect(r.output).toContain('name?: string;')
  })

  it('produces unknown[] for an empty array', () => {
    const r = gen('{"list": []}')
    expect(r.error).toBeNull()
    expect(r.output).toContain('list: unknown[];')
  })

  it('dedups structurally identical shapes into a single interface', () => {
    const r = gen('{"a": {"x": 1, "y": "s"}, "b": {"x": 2, "y": "t"}}')
    expect(r.error).toBeNull()
    const matches = r.output.match(/interface A \{/g) ?? []
    expect(matches).toHaveLength(1)
    expect(r.output).toContain('a: A;')
    expect(r.output).toContain('b: A;')
    expect(r.output).not.toContain('interface B {')
  })

  it('suffixes colliding names for structurally different shapes', () => {
    const r = gen('{"item": {"x": 1}, "items": [{"x": "s"}]}')
    expect(r.error).toBeNull()
    expect(r.output).toContain('interface Item {')
    expect(r.output).toContain('interface Item2 {')
    expect(r.output).toContain('item: Item;')
    expect(r.output).toContain('items: Item2[];')
  })

  it('marks null-only fields optional and unknown when the toggle is on', () => {
    const r = gen('{"note": null}', { nullOptional: true })
    expect(r.error).toBeNull()
    expect(r.output).toContain('note?: unknown;')
  })

  it('keeps null-only fields required unknown when the toggle is off', () => {
    const r = gen('{"note": null}', { nullOptional: false })
    expect(r.error).toBeNull()
    expect(r.output).toContain('note: unknown;')
    expect(r.output).not.toContain('note?:')
  })

  it('turns a nullable field optional with the union stripped when the toggle is on', () => {
    const r = gen('{"items": [{"note": "hi"}, {"note": null}]}', { nullOptional: true })
    expect(r.error).toBeNull()
    expect(r.output).toContain('note?: string;')
  })

  it('keeps `| null` on a nullable field when the toggle is off', () => {
    const r = gen('{"items": [{"note": "hi"}, {"note": null}]}', { nullOptional: false })
    expect(r.error).toBeNull()
    expect(r.output).toContain('note: string | null;')
  })

  it('uses type-alias output for the "type" declaration style', () => {
    const r = gen('{"name": "Ada"}', { declarationStyle: 'type' })
    expect(r.error).toBeNull()
    expect(r.output).toContain('type RootObject = {')
    expect(r.output).not.toContain('interface RootObject')
  })

  it('omits semicolons when the toggle is off', () => {
    const r = gen('{"name": "Ada"}', { semicolons: false })
    expect(r.error).toBeNull()
    expect(r.output).toContain('name: string\n')
    expect(r.output).not.toContain('string;')
  })

  it('prefixes properties with readonly when the toggle is on', () => {
    const r = gen('{"name": "Ada"}', { readonly: true })
    expect(r.error).toBeNull()
    expect(r.output).toContain('readonly name: string;')
  })

  it('falls back to a valid root name for invalid identifiers', () => {
    const r = gen('{"name": "Ada"}', { rootName: '1 not valid!' })
    expect(r.error).toBeNull()
    expect(r.output).toContain('interface RootObject {')
  })

  it('generates a sensible declaration for an empty object', () => {
    const r = gen('{}')
    expect(r.error).toBeNull()
    expect(r.output).toBe('interface RootObject {}')
  })

  it('generates a type alias for a bare primitive', () => {
    const r = gen('"just a string"')
    expect(r.error).toBeNull()
    expect(r.output).toBe('type RootObject = string;')
  })

  it('generates a type alias for a bare null', () => {
    const r = gen('null')
    expect(r.error).toBeNull()
    expect(r.output).toBe('type RootObject = null;')
  })

  it('handles a root array of objects without name collisions', () => {
    const r = gen('[{"id": 1}, {"id": 2}]')
    expect(r.error).toBeNull()
    expect(r.output).toContain('type RootObject = RootObject2[];')
    expect(r.output).toContain('interface RootObject2 {')
    expect(r.output).toContain('id: number;')
  })
})
