import { createHmac, timingSafeEqual } from "crypto";
import type { SessionUser } from "@/types";

const VERSION = "v1";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 8;
const MIN_MAX_AGE_SECONDS = 60 * 15;
const MAX_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function configuredMaxAgeSeconds(): number {
  const raw = Number.parseInt(process.env.SESSION_MAX_AGE_SECONDS ?? "", 10);
  if (!Number.isFinite(raw)) return DEFAULT_MAX_AGE_SECONDS;
  return Math.min(Math.max(raw, MIN_MAX_AGE_SECONDS), MAX_MAX_AGE_SECONDS);
}

type SignedSessionPayload = SessionUser & {
  issued_at: number;
  expires_at: number;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;

  // Local demo remains usable without production credentials. Production must
  // explicitly provide SESSION_SECRET; see assertProductionSessionConfig().
  if (process.env.NODE_ENV !== "production") {
    return "local-development-only-session-secret-change-before-production";
  }
  return null;
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`${VERSION}.${payload}`).digest("base64url");
}

/** Create a tamper-evident, short-lived application session cookie. */
export function createSignedSession(user: SessionUser, now = Date.now()): string {
  const secret = sessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET must be configured in production.");
  }

  const payload: SignedSessionPayload = {
    ...user,
    issued_at: Math.floor(now / 1000),
    expires_at: Math.floor(now / 1000) + configuredMaxAgeSeconds(),
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${VERSION}.${encoded}.${signature(encoded, secret)}`;
}

/**
 * Validate the session signature and expiry before trusting identity, role or
 * academy_id values supplied by the browser. Returns null on any invalid value.
 */
export function readSignedSession(raw?: string): SessionUser | null {
  const secret = sessionSecret();
  if (!raw || !secret) return null;

  const [version, encoded, actualSignature, ...extra] = raw.split(".");
  if (version !== VERSION || !encoded || !actualSignature || extra.length > 0) return null;

  const expectedSignature = signature(encoded, secret);
  const actual = Buffer.from(actualSignature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SignedSessionPayload;
    if (
      !payload.id ||
      !payload.email ||
      !payload.role ||
      !payload.academy_id ||
      !payload.expires_at ||
      payload.expires_at < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    const { issued_at: _issuedAt, expires_at: _expiresAt, ...user } = payload;
    return user;
  } catch {
    return null;
  }
}

export function sessionMaxAgeSeconds(): number {
  return configuredMaxAgeSeconds();
}

/** Fail closed if a deployed app is missing the session signing secret. */
export function assertProductionSessionConfig(): void {
  if (process.env.NODE_ENV === "production" && !sessionSecret()) {
    throw new Error("SESSION_SECRET is required in production.");
  }
}
