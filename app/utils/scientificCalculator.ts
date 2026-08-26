/**
 * Pure evaluation/formatting logic for the scientific calculator, kept free
 * of the mathjs runtime import (only its types) so it can be unit-tested
 * without lazy-loading the actual library. The page component loads
 * mathjs's `evaluate` at runtime and passes it in.
 */
import type { evaluate as MathjsEvaluate } from 'mathjs'

export type AngleUnit = 'deg' | 'rad'

export type EvaluateStatus =
  'empty' | 'ok' | 'incomplete' | 'divide-by-zero' | 'complex' | 'undefined'

export interface EvaluateOutcome {
  status: EvaluateStatus
  /** Numeric value, only set when `status === 'ok'`. */
  value: number | null
  /** Human-readable formatted value, only set when `status === 'ok'`. */
  formatted: string | null
  /** User-facing message for domain errors (divide-by-zero/complex/undefined). */
  errorMessage: string | null
}

const toRadians = (deg: number) => (deg * Math.PI) / 180
const toDegrees = (rad: number) => (rad * 180) / Math.PI

/**
 * Build the mathjs evaluation scope for the given angle unit. In `deg` mode,
 * trig functions convert their input from degrees to radians before calling
 * the native implementation, and inverse trig functions convert their result
 * back to degrees. In `rad` mode everything passes through unchanged.
 * `ans` carries the last committed result so expressions like `ans * 2` work.
 */
export function buildScope(angleUnit: AngleUnit, ans: number): Record<string, unknown> {
  if (angleUnit === 'deg') {
    return {
      ans,
      sin: (x: number) => Math.sin(toRadians(x)),
      cos: (x: number) => Math.cos(toRadians(x)),
      tan: (x: number) => Math.tan(toRadians(x)),
      asin: (x: number) => toDegrees(Math.asin(x)),
      acos: (x: number) => toDegrees(Math.acos(x)),
      atan: (x: number) => toDegrees(Math.atan(x)),
    }
  }
  return {
    ans,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
  }
}

/** Format a finite real number for display: trims float noise, no exponent for typical magnitudes. */
export function formatNumber(n: number): string {
  const value = Object.is(n, -0) ? 0 : n
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return value.toString()
  return Number(value.toPrecision(12)).toString()
}

function isComplexLike(raw: unknown): raw is { re: number; im: number } {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'im' in raw &&
    're' in raw &&
    typeof (raw as { im: unknown }).im === 'number' &&
    typeof (raw as { re: unknown }).re === 'number'
  )
}

/** Classify a raw mathjs evaluation result into a display-ready outcome. */
export function classifyResult(raw: unknown): EvaluateOutcome {
  if (typeof raw === 'boolean') {
    const value = raw ? 1 : 0
    return { status: 'ok', value, formatted: formatNumber(value), errorMessage: null }
  }

  if (typeof raw === 'number') {
    if (Number.isNaN(raw)) {
      return { status: 'undefined', value: null, formatted: null, errorMessage: 'Undefined result' }
    }
    if (!Number.isFinite(raw)) {
      return {
        status: 'divide-by-zero',
        value: null,
        formatted: null,
        errorMessage: 'Cannot divide by zero',
      }
    }
    return { status: 'ok', value: raw, formatted: formatNumber(raw), errorMessage: null }
  }

  if (isComplexLike(raw)) {
    // A real result mathjs still represents as Complex (e.g. from a Complex
    // intermediate that resolved to a zero imaginary part) should read as real.
    if (raw.im === 0) {
      return { status: 'ok', value: raw.re, formatted: formatNumber(raw.re), errorMessage: null }
    }
    return {
      status: 'complex',
      value: null,
      formatted: null,
      errorMessage: 'Result is not a real number',
    }
  }

  const asNumber = Number(raw)
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
    return { status: 'ok', value: asNumber, formatted: formatNumber(asNumber), errorMessage: null }
  }

  return { status: 'undefined', value: null, formatted: null, errorMessage: 'Undefined result' }
}

/**
 * Evaluate an expression against the DEG/RAD-aware scope and classify the
 * result. `evaluateFn` is mathjs's `evaluate`, lazy-loaded by the caller.
 * Throws from `evaluateFn` (incomplete/malformed expressions, expected while
 * the user is still typing) are swallowed into an `incomplete` status.
 */
export function evaluateExpression(
  evaluateFn: typeof MathjsEvaluate,
  expression: string,
  angleUnit: AngleUnit,
  ans: number,
): EvaluateOutcome {
  if (expression.trim() === '') {
    return { status: 'empty', value: null, formatted: null, errorMessage: null }
  }
  try {
    const raw = evaluateFn(expression, buildScope(angleUnit, ans))
    return classifyResult(raw)
  } catch {
    return { status: 'incomplete', value: null, formatted: null, errorMessage: null }
  }
}
