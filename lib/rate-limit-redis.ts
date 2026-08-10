/**
 * Rate limiting — supports both in-memory (dev) and Upstash Redis (production).
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory when not configured.
 *
 * To enable Redis rate limiting on Vercel:
 * 1. Create a free database at upstash.com
 * 2. Add env vars: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * 3. Run: npm install @upstash/redis @upstash/ratelimit
 */

// Check if Redis is configured.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS = Boolean(REDIS_URL && REDIS_TOKEN);

// Lazy-load Redis (only when configured).
let redisLimiter: any = null;
async function getRedisLimiter() {
  if (redisLimiter) return redisLimiter;
  try {
    // Dynamic require to avoid build-time module resolution when not installed.
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const { Redis } = require("@upstash/redis");
    const { Ratelimit } = require("@upstash/ratelimit");
    const redis = new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! });
    redisLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "myacademy:rl",
    });
    return redisLimiter;
  } catch {
    return null;
  }
}

// In-memory fallback.
interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) { if (b.resetAt < now) buckets.delete(key); }
  }, 60_000).unref?.();
}

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000,
): Promise<{ allowed: boolean; remaining: number }> {
  // Try Redis first (production).
  if (USE_REDIS) {
    const limiter = await getRedisLimiter();
    if (limiter) {
      try {
        const result = await limiter.limit(key);
        return { allowed: result.success, remaining: result.remaining };
      } catch {
        // Fall through to in-memory on Redis error.
      }
    }
  }

  // In-memory fallback.
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

export const LIMITS = {
  login: { max: 10, window: 60_000 },
  signup: { max: 3, window: 300_000 },
  resetPassword: { max: 3, window: 300_000 },
  search: { max: 30, window: 60_000 },
  upload: { max: 10, window: 60_000 },
  checkin: { max: 20, window: 60_000 },
} as const;
