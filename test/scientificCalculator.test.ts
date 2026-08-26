import { describe, it, expect } from 'vitest'
import { evaluate } from 'mathjs'
import {
  buildScope,
  classifyResult,
  evaluateExpression,
  formatNumber,
} from '@/utils/scientificCalculator'

describe('buildScope', () => {
  it('converts degrees to radians for trig functions in deg mode', () => {
    const scope = buildScope('deg', 0)
    expect(scope.sin as (x: number) => number).toBeTypeOf('function')
    expect((scope.sin as (x: number) => number)(90)).toBeCloseTo(1)
    expect((scope.cos as (x: number) => number)(180)).toBeCloseTo(-1)
  })

  it('converts inverse trig results back to degrees in deg mode', () => {
    const scope = buildScope('deg', 0)
    expect((scope.asin as (x: number) => number)(1)).toBeCloseTo(90)
  })

  it('passes trig functions through unchanged in rad mode', () => {
    const scope = buildScope('rad', 0)
    expect((scope.sin as (x: number) => number)(Math.PI / 2)).toBeCloseTo(1)
    expect((scope.asin as (x: number) => number)(1)).toBeCloseTo(Math.PI / 2)
  })

  it('carries ans into the scope', () => {
    expect(buildScope('rad', 42).ans).toBe(42)
  })
})

describe('formatNumber', () => {
  it('formats integers without a decimal point', () => {
    expect(formatNumber(4)).toBe('4')
  })

  it('trims floating point noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
  })

  it('normalizes negative zero to 0', () => {
    expect(formatNumber(-0)).toBe('0')
  })
})

describe('classifyResult', () => {
  it('classifies a finite number as ok', () => {
    expect(classifyResult(4)).toMatchObject({ status: 'ok', value: 4, formatted: '4' })
  })

  it('classifies Infinity as divide-by-zero', () => {
    expect(classifyResult(Infinity)).toMatchObject({
      status: 'divide-by-zero',
      errorMessage: 'Cannot divide by zero',
    })
    expect(classifyResult(-Infinity).status).toBe('divide-by-zero')
  })

  it('classifies NaN as undefined', () => {
    expect(classifyResult(NaN)).toMatchObject({
      status: 'undefined',
      errorMessage: 'Undefined result',
    })
  })

  it('classifies a complex number as complex', () => {
    const complex = evaluate('sqrt(-1)')
    expect(classifyResult(complex)).toMatchObject({
      status: 'complex',
      errorMessage: 'Result is not a real number',
    })
  })

  it('treats a complex number with zero imaginary part as real', () => {
    const complex = evaluate('sqrt(-1) * sqrt(-1)')
    expect(classifyResult(complex)).toMatchObject({ status: 'ok', value: -1 })
  })
})

describe('evaluateExpression', () => {
  it('returns empty status for blank input', () => {
    expect(evaluateExpression(evaluate, '', 'deg', 0).status).toBe('empty')
    expect(evaluateExpression(evaluate, '   ', 'deg', 0).status).toBe('empty')
  })

  it('returns incomplete status for malformed/partial expressions without throwing', () => {
    expect(evaluateExpression(evaluate, '3+', 'deg', 0).status).toBe('incomplete')
    expect(evaluateExpression(evaluate, '(1+2', 'deg', 0).status).toBe('incomplete')
  })

  it('evaluates basic arithmetic', () => {
    const r = evaluateExpression(evaluate, '2 + 2', 'deg', 0)
    expect(r).toMatchObject({ status: 'ok', value: 4, formatted: '4' })
  })

  it('evaluates trig using the degree-aware scope', () => {
    const deg = evaluateExpression(evaluate, 'sin(90)', 'deg', 0)
    expect(deg.value).toBeCloseTo(1)

    const rad = evaluateExpression(evaluate, 'sin(pi/2)', 'rad', 0)
    expect(rad.value).toBeCloseTo(1)
  })

  it('chains off ans', () => {
    const r = evaluateExpression(evaluate, 'ans * 2', 'deg', 5)
    expect(r).toMatchObject({ status: 'ok', value: 10 })
  })

  it('flags divide-by-zero', () => {
    const r = evaluateExpression(evaluate, '5 / 0', 'deg', 0)
    expect(r.status).toBe('divide-by-zero')
  })

  it('flags a complex result from sqrt of a negative number', () => {
    const r = evaluateExpression(evaluate, 'sqrt(-4)', 'deg', 0)
    expect(r.status).toBe('complex')
  })

  it('supports factorial, power, and log base 10', () => {
    expect(evaluateExpression(evaluate, '5!', 'deg', 0).value).toBe(120)
    expect(evaluateExpression(evaluate, '2^10', 'deg', 0).value).toBe(1024)
    expect(evaluateExpression(evaluate, 'log10(100)', 'deg', 0).value).toBeCloseTo(2)
    expect(evaluateExpression(evaluate, 'log(e)', 'deg', 0).value).toBeCloseTo(1)
  })
})
