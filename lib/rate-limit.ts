/**
 * Simple in-memory rate limiter (per-process).
 * For production multi-instance, replace with Upstash/Redis.
 * Returns true if the request is ALLOWED, false if rate-limited.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Prune expired buckets every 60s.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (b.resetAt < now) buckets.delete(key);
    }
  }, 60_000).unref?.();
}

/**
 * Check rate limit for a key.
 * @param key Unique identifier (e.g. `login:user@email.com`)
 * @param maxRequests Max requests in the window.
 * @param windowMs Window in milliseconds.
 * @returns { allowed: boolean, remaining: number }
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  existing.count++;
  const allowed = existing.count <= maxRequests;
  return { allowed, remaining: Math.max(0, maxRequests - existing.count) };
}

/** Rate limit presets for common endpoints. */
export const LIMITS = {
  login: { max: 10, window: 60_000 },      // 10 attempts per minute
  signup: { max: 3, window: 300_000 },      // 3 per 5 minutes
  resetPassword: { max: 3, window: 300_000 },
  search: { max: 30, window: 60_000 },
  upload: { max: 10, window: 60_000 },
  checkin: { max: 20, window: 60_000 },
} as const;
