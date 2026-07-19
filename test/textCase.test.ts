import { describe, it, expect } from 'vitest'
import { convertCase, tokenizeWords } from '@/utils/textCase'

describe('tokenizeWords', () => {
  it('splits on separators and camelCase boundaries', () => {
    expect(tokenizeWords('helloWorld')).toEqual(['hello', 'World'])
    expect(tokenizeWords('foo_bar-baz qux')).toEqual(['foo', 'bar', 'baz', 'qux'])
    expect(tokenizeWords('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request'])
  })
})

describe('convertCase', () => {
  const src = 'hello world example'

  it('upper and lower', () => {
    expect(convertCase(src, 'upper')).toBe('HELLO WORLD EXAMPLE')
    expect(convertCase('HeLLo', 'lower')).toBe('hello')
  })

  it('title and sentence', () => {
    expect(convertCase(src, 'title')).toBe('Hello World Example')
    expect(convertCase('hello. bye there', 'sentence')).toBe('Hello. Bye there')
  })

  it('programmer cases', () => {
    expect(convertCase(src, 'camel')).toBe('helloWorldExample')
    expect(convertCase(src, 'pascal')).toBe('HelloWorldExample')
    expect(convertCase(src, 'snake')).toBe('hello_world_example')
    expect(convertCase(src, 'kebab')).toBe('hello-world-example')
    expect(convertCase(src, 'constant')).toBe('HELLO_WORLD_EXAMPLE')
    expect(convertCase(src, 'dot')).toBe('hello.world.example')
  })

  it('converts an existing identifier between styles', () => {
    expect(convertCase('myVariableName', 'kebab')).toBe('my-variable-name')
    expect(convertCase('my-variable-name', 'camel')).toBe('myVariableName')
  })

  it('alternating and inverse', () => {
    expect(convertCase('abcd', 'alternating')).toBe('aBcD')
    expect(convertCase('Hello', 'inverse')).toBe('hELLO')
  })
})
