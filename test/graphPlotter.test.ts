import { describe, it, expect } from 'vitest'
import { compile } from 'mathjs'
import {
  evaluateAt,
  findRoots,
  samplePoints,
  toCompiledFn,
  toFiniteReal,
} from '@/utils/graphPlotter'

function compileFn(expr: string) {
  return toCompiledFn(compile(expr))
}

describe('toFiniteReal', () => {
  it('passes through finite numbers', () => {
    expect(toFiniteReal(4)).toBe(4)
  })

  it('rejects NaN and infinite numbers', () => {
    expect(toFiniteReal(NaN)).toBeNull()
    expect(toFiniteReal(Infinity)).toBeNull()
  })

  it('extracts the real part of a purely real complex-like result', () => {
    expect(toFiniteReal({ re: 3, im: 0 })).toBe(3)
  })

  it('rejects a complex-like result with a nonzero imaginary part', () => {
    expect(toFiniteReal({ re: 3, im: 1 })).toBeNull()
  })
})

describe('evaluateAt', () => {
  it('evaluates a compiled expression at x', () => {
    const fn = compileFn('x^2 - 3*x + 2')
    expect(evaluateAt(fn, 0)).toBeCloseTo(2)
    expect(evaluateAt(fn, 1)).toBeCloseTo(0)
  })

  it('returns null for a domain gap like 1/x at x=0', () => {
    const fn = compileFn('1/x')
    expect(evaluateAt(fn, 0)).toBeNull()
  })

  it('returns null when the expression throws', () => {
    const fn = compileFn('sqrt(x)')
    expect(evaluateAt(fn, -1)).toBeNull()
  })
})

describe('samplePoints', () => {
  it('samples evenly across the range', () => {
    const fn = compileFn('x')
    const points = samplePoints(fn, 0, 10, 11)
    expect(points).toHaveLength(11)
    expect(points[0]).toEqual({ x: 0, y: 0 })
    expect(points[10]).toEqual({ x: 10, y: 10 })
  })

  it('marks domain-gap points with a null y instead of erroring', () => {
    const fn = compileFn('1/x')
    const points = samplePoints(fn, -2, 2, 5)
    expect(points).toHaveLength(5)
    const gap = points.find((p) => p.x === 0)
    expect(gap?.y).toBeNull()
    expect(points.filter((p) => p.y !== null).length).toBeGreaterThan(0)
  })

  it('returns an empty array for an invalid range', () => {
    const fn = compileFn('x')
    expect(samplePoints(fn, 5, 0)).toEqual([])
  })
})

describe('findRoots', () => {
  it('finds both roots of x^2 - 3x + 2 within -10..10', () => {
    const fn = compileFn('x^2 - 3*x + 2')
    const roots = findRoots(fn, -10, 10)
    expect(roots).toHaveLength(2)
    expect(roots[0]).toBeCloseTo(1, 5)
    expect(roots[1]).toBeCloseTo(2, 5)
  })

  it('finds no roots when the function never crosses zero in range', () => {
    const fn = compileFn('x^2 + 1')
    expect(findRoots(fn, -10, 10)).toEqual([])
  })

  it('finds a single root of a linear function', () => {
    const fn = compileFn('2*x - 4')
    const roots = findRoots(fn, -10, 10)
    expect(roots).toHaveLength(1)
    expect(roots[0]).toBeCloseTo(2, 5)
  })

  it('does not report roots outside the given range', () => {
    const fn = compileFn('x - 100')
    expect(findRoots(fn, -10, 10)).toEqual([])
  })
})
