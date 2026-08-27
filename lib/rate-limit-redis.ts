/**
 * Rate limiting — supports both in-memory (dev) and Upstash Redis (production).
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory when not configured.
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS = Boolean(REDIS_URL && REDIS_TOKEN);

type RedisLimiter = { limit: (key: string) => Promise<{ success: boolean; remaining: number }> };
const redisLimiters = new Map<string, RedisLimiter>();

function windowDescription(windowMs: number): string {
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  return `${seconds} s`;
}

async function getRedisLimiter(maxRequests: number, windowMs: number): Promise<RedisLimiter | null> {
  const configKey = `${maxRequests}:${windowMs}`;
  const cached = redisLimiters.get(configKey);
  if (cached) return cached;
  try {
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");
    type Duration = Parameters<typeof Ratelimit.slidingWindow>[1];
    const redis = new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, windowDescription(windowMs) as Duration),
      prefix: `myacademy:rl:${configKey}`,
    }) as RedisLimiter;
    redisLimiters.set(configKey, limiter);
    return limiter;
  } catch {
    return null;
  }
}

interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 60_000).unref?.();
}

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000,
): Promise<{ allowed: boolean; remaining: number }> {
  if (USE_REDIS) {
    const limiter = await getRedisLimiter(maxRequests, windowMs);
    if (limiter) {
      try {
        const result = await limiter.limit(key);
        return { allowed: result.success, remaining: result.remaining };
      } catch {
        // Fall through to the local limiter if the Redis provider is unavailable.
      }
    }
  }

  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, maxRequests - 1) };
  }
  existing.count++;
  const allowed = existing.count <= maxRequests;
  if (!allowed) {
    try {
      // Surface 429 rejections on the internal monitoring dashboard.
      require("@/lib/error-trace").recordRateLimited();
    } catch {
      /* observer must never break the request path */
    }
  }
  return { allowed, remaining: Math.max(0, maxRequests - existing.count) };
}

export const LIMITS = {
  login: { max: 10, window: 60_000 },
  signup: { max: 3, window: 300_000 },
  resetPassword: { max: 3, window: 300_000 },
  search: { max: 30, window: 60_000 },
  upload: { max: 10, window: 60_000 },
  checkin: { max: 20, window: 60_000 },
  qr: { max: 30, window: 60_000 },
  webhook: { max: 120, window: 60_000 },
} as const;
