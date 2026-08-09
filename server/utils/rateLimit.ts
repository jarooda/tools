/**
 * Simple in-memory, per-key sliding-window rate limiter. Mirrors the
 * "simple in-memory state" style used by `server/api/fx.get.ts` — no
 * external dependency, no Redis. Good enough for a single Node process;
 * resets on restart/redeploy, which is fine for the abuse-prevention use
 * case this serves (Network & Performance server routes).
 */
const hits = new Map<string, number[]>()

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  max: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Present only when `allowed` is false — ms until the oldest hit expires. */
  retryAfterMs?: number
}

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
  now = Date.now(),
): RateLimitResult {
  const windowStart = now - opts.windowMs
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= opts.max) {
    hits.set(key, timestamps)
    const oldest = timestamps[0]!
    return { allowed: false, retryAfterMs: oldest + opts.windowMs - now }
  }

  timestamps.push(now)
  hits.set(key, timestamps)
  return { allowed: true }
}
