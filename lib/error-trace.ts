/**
 * Structured error tracing for MY Academy.
 *
 * Every server request gets a stable `request_id` (injected in
 * services/request-context via setRequestContext). When an error is captured
 * we log the full diagnostic context — request_id, timestamp, path, role,
 * academy — but the message returned to the caller is intentionally generic
 * ("حدث خطأ غير متوقع") so we never leak stack traces, SQL, or data.
 *
 * Sensitive fields (passwords, tokens, card numbers, full session payloads)
 * are scrubbed before logging. See scrub() below.
 */
import { randomUUID } from "node:crypto";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export type ErrorTraceContext = {
  requestId: string;
  timestamp: string;
  path?: string;
  role?: string | null;
  academyId?: string | null;
  /** Free-form module tag, e.g. "attendance:record", "billing:webhook". */
  scope?: string;
};

// Scrubbing patterns — anything matching is replaced before logging.
const SENSITIVE_PATTERNS: Array<[RegExp, string]> = [
  [/(authorization|token|api[_-]?key|secret|password|session)/gi, "[$1]"],
  [/\b\d{13,19}\b/g, "[card-number]"], // likely card / long numeric secret
  [/(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g, "[jwt]"], // JWTs
];

function scrub(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    let out = value;
    for (const [re, repl] of SENSITIVE_PATTERNS) out = out.replace(re, repl);
    return out;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrub(value.message) as string,
      // stack omitted on purpose — it can leak code paths & env
    };
  }
  if (Array.isArray(value)) {
    return value.length > 50 ? `[array:${value.length}]` : value.map((v) => scrub(v, seen));
  }
  if (typeof value === "object") {
    if (seen.has(value as object)) return "[circular]";
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/pass|secret|token|key|card|cvv/i.test(k)) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = scrub(v, seen);
    }
    return out;
  }
  return value;
}

export function buildErrorTrace(ctx: Partial<ErrorTraceContext> & { requestId: string }): ErrorTraceContext {
  return {
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    path: ctx.path,
    role: ctx.role,
    academyId: ctx.academyId,
    scope: ctx.scope,
  };
}

/**
 * Capture an error with full server-side context and a generic public message.
 * Returns the safe message to surface to the user.
 */
export function captureError(
  error: unknown,
  ctx: {
    requestId: string;
    path?: string;
    role?: string | null;
    academyId?: string | null;
    scope?: string;
    severity?: ErrorSeverity;
    /** Extra structured detail safe to log (no PII/secrets). */
    detail?: Record<string, unknown>;
    /** Override the generic message for non-production-unsafe cases. */
    publicMessage?: string;
  },
): string {
  const severity = ctx.severity ?? "error";
  const trace: Record<string, unknown> = {
    severity,
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    path: ctx.path,
    role: ctx.role,
    academyId: ctx.academyId,
    scope: ctx.scope,
    error: scrub(error),
  };
  if (ctx.detail) trace.detail = scrub(ctx.detail);

  // Route by severity so logs can be grepped/filtered in production.
  const logLine = JSON.stringify(trace);
  switch (severity) {
    case "critical":
      console.error(`[CRIT] ${logLine}`);
      break;
    case "error":
      console.error(`[ERR] ${logLine}`);
      break;
    case "warning":
      console.warn(`[WARN] ${logLine}`);
      break;
    default:
      console.info(`[INFO] ${logLine}`);
  }

  // Persist to the in-memory observatory (surfaced on /platform/monitoring).
  try {
    recordError(error, {
      scope: ctx.scope,
      severity,
      requestId: ctx.requestId,
      role: ctx.role,
      path: ctx.path,
    });
  } catch {
    /* observer must never break the request path */
  }

  return ctx.publicMessage ?? "حدث خطأ غير متوقع. حاول مرة أخرى أو راجع سجلات النظام.";
}

export function newRequestId(): string {
  return randomUUID();
}

// ---------------------------------------------------------------------------
// In-memory error & rate-limit ring buffer (server lifetime).
// NOTE: in serverless (Vercel) this resets on cold start. For durable,
// production-grade retention, persist to Supabase or an external log sink;
// this buffer is the fast local observatory used by /platform/monitoring.
// ---------------------------------------------------------------------------
export type StoredError = {
  requestId: string;
  timestamp: string;
  path?: string;
  role?: string | null;
  scope?: string;
  severity: ErrorSeverity;
  message: string;
};

const MAX_STORED = 200;
const errorStore: StoredError[] = [];
let rateLimitedHits = 0;
let lastReset = Date.now();

export function recordError(
  error: unknown,
  opts?: {
    scope?: string;
    severity?: ErrorSeverity;
    requestId?: string;
    role?: string | null;
    path?: string;
  },
): void {
  let requestId: string | null = null;
  let role: string | null = null;
  let path: string | null = null;
  try {
    const rc = require("@/services/request-context") as typeof import("@/services/request-context");
    requestId = rc.getRequestId();
    role = rc.getRequestUser()?.role ?? null;
    path = rc.getRequestPath();
  } catch {
    /* ignore */
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : JSON.stringify(scrub(error));
  const severity = opts?.severity ?? "error";
  errorStore.push({
    requestId: opts?.requestId ?? requestId ?? newRequestId(),
    timestamp: new Date().toISOString(),
    path: opts?.path ?? path ?? undefined,
    role: opts?.role ?? role,
    scope: opts?.scope,
    severity,
    message: message.slice(0, 500),
  });
  if (errorStore.length > MAX_STORED) errorStore.splice(0, errorStore.length - MAX_STORED);
}

/** Called by the rate-limit middleware when a request is rejected with 429. */
export function recordRateLimited(): void {
  rateLimitedHits += 1;
}

export function getObservabilitySnapshot() {
  const uptimeMs = Date.now() - lastReset;
  const now = Date.now();
  const lastHour = errorStore.filter((e) => now - new Date(e.timestamp).getTime() < 3_600_000);
  const bySeverity = lastHour.reduce<Record<string, number>>((acc, e) => {
    acc[e.severity] = (acc[e.severity] ?? 0) + 1;
    return acc;
  }, {});
  return {
    uptime_ms: uptimeMs,
    total_errors_stored: errorStore.length,
    rate_limited_hits: rateLimitedHits,
    errors_last_hour: lastHour.length,
    by_severity: bySeverity,
    recent: errorStore.slice(-50).reverse(),
  };
}

/**
 * Convenience helper that captures an error using the *currently active*
 * request context (request_id, role, academy, path) without the caller having
 * to thread those values manually. Use inside route handlers / server actions:
 *
 *   try { ... } catch (e) {
 *     const safe = traceError(e, { scope: "attendance:record" });
 *     return NextResponse.json({ error: safe }, { status: 500 });
 *   }
 *
 * Returns the generic public message ("حدث خطأ غير متوقع ...").
 */
export function traceError(
  error: unknown,
  opts?: {
    scope?: string;
    severity?: ErrorSeverity;
    detail?: Record<string, unknown>;
    publicMessage?: string;
    requestId?: string;
    role?: string | null;
    academyId?: string | null;
    path?: string;
  },
): string {
  // Best-effort import of the request context so this helper works whether or
  // not the caller has the request-context barrel imported.
  let requestId: string | null = null;
  let role: string | null = null;
  let academyId: string | null = null;
  let path: string | null = null;
  try {
    // Lazy require avoids a hard dependency cycle at module load.
    const rc = require("@/services/request-context") as typeof import("@/services/request-context");
    requestId = rc.getRequestId();
    role = rc.getRequestUser()?.role ?? null;
    academyId = rc.getRequestAcademyId();
    path = rc.getRequestPath();
  } catch {
    /* context not available (e.g. outside a request) — fall through */
  }

  return captureError(error, {
    requestId: opts?.requestId ?? requestId ?? newRequestId(),
    path: opts?.path ?? path ?? undefined,
    role: opts?.role ?? role,
    academyId: opts?.academyId ?? academyId,
    scope: opts?.scope,
    severity: opts?.severity,
    detail: opts?.detail,
    publicMessage: opts?.publicMessage,
  });
}
