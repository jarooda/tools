/**
 * Pure sampling/root-finding logic for the graph plotter, kept free of the
 * mathjs runtime import (only its types) so it can be unit-tested without
 * lazy-loading the actual library. The page component loads mathjs's
 * `compile` at runtime and passes the compiled evaluator in.
 */
import type { EvalFunction } from 'mathjs'

export interface GraphPoint {
  x: number
  /** `null` marks a domain gap (evaluation threw or wasn't a finite real) — breaks the polyline here. */
  y: number | null
}

/** One plotted function, ready for `GraphCanvas`. */
export interface GraphSeries {
  id: string
  /** CSS color, e.g. `var(--accent)`. */
  color: string
  points: GraphPoint[]
}

/** A single (x, y) marker drawn on the canvas — a found root or an "evaluate at x" point. */
export interface GraphMarker {
  x: number
  y: number
  color: string
}

/** A compiled `f(x)` expression, as returned by mathjs `compile(expr).evaluate({ x })`. */
export type CompiledFn = (x: number) => unknown

/** Build a `CompiledFn` from a mathjs `compile()` result. */
export function toCompiledFn(compiled: EvalFunction): CompiledFn {
  return (x: number) => compiled.evaluate({ x })
}

/** Coerce a raw mathjs evaluation result to a finite real number, or `null` if it isn't one. */
export function toFiniteReal(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (
    typeof raw === 'object' &&
    raw !== null &&
    're' in raw &&
    'im' in raw &&
    typeof (raw as { re: unknown }).re === 'number' &&
    typeof (raw as { im: unknown }).im === 'number'
  ) {
    const { re, im } = raw as { re: number; im: number }
    return im === 0 && Number.isFinite(re) ? re : null
  }
  const asNumber = Number(raw)
  return !Number.isNaN(asNumber) && Number.isFinite(asNumber) ? asNumber : null
}

/** Evaluate `fn` at a single x, swallowing throws/domain issues into `null`. */
export function evaluateAt(fn: CompiledFn, x: number): number | null {
  try {
    return toFiniteReal(fn(x))
  } catch {
    return null
  }
}

/**
 * Sample `fn` over `[xMin, xMax]` into `sampleCount` evenly-spaced points.
 * Points where evaluation throws or isn't a finite real number keep their x
 * with `y: null` (a domain gap, e.g. `1/x` at `x = 0`) rather than being
 * treated as an error — the caller should break the polyline at a `null` y
 * instead of connecting across it.
 */
export function samplePoints(
  fn: CompiledFn,
  xMin: number,
  xMax: number,
  sampleCount = 400,
): GraphPoint[] {
  if (xMax <= xMin || sampleCount < 2) return []
  const points: GraphPoint[] = []
  const step = (xMax - xMin) / (sampleCount - 1)
  for (let i = 0; i < sampleCount; i++) {
    const x = xMin + step * i
    points.push({ x, y: evaluateAt(fn, x) })
  }
  return points
}

/**
 * Refine a root known to lie in `[a, b]` (where `fn(a)` and `fn(b)` have
 * opposite signs) via bisection.
 */
function bisectRoot(fn: CompiledFn, a: number, b: number, iterations = 60): number | null {
  let lo = a
  let hi = b
  let fLo = evaluateAt(fn, lo)
  if (fLo === null) return null
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2
    const fMid = evaluateAt(fn, mid)
    if (fMid === null) return null
    if (fMid === 0 || hi - lo < 1e-12) return mid
    if (fMid < 0 === fLo < 0) {
      lo = mid
      fLo = fMid
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

/**
 * Scan `fn` over `[xMin, xMax]` for sign changes between evenly-sampled
 * points, then refine each crossing via bisection. Returns roots sorted
 * ascending, deduplicated within a small tolerance.
 */
export function findRoots(fn: CompiledFn, xMin: number, xMax: number, sampleCount = 800): number[] {
  if (xMax <= xMin || sampleCount < 2) return []
  const step = (xMax - xMin) / sampleCount
  const roots: number[] = []

  let prevX = xMin
  let prevY = evaluateAt(fn, prevX)

  for (let i = 1; i <= sampleCount; i++) {
    const x = xMin + step * i
    const y = evaluateAt(fn, x)

    if (prevY === 0 && prevX !== null) {
      roots.push(prevX)
    } else if (prevY !== null && y !== null && prevY < 0 !== y < 0) {
      const root = bisectRoot(fn, prevX, x)
      if (root !== null) roots.push(root)
    }

    prevX = x
    prevY = y
  }

  if (prevY === 0) roots.push(prevX)

  const deduped: number[] = []
  const tolerance = (xMax - xMin) * 1e-6
  for (const root of roots.sort((a, b) => a - b)) {
    if (deduped.length === 0 || root - deduped[deduped.length - 1]! > tolerance) {
      deduped.push(root)
    }
  }
  return deduped
}
