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

  return ctx.publicMessage ?? "حدث خطأ غير متوقع. حاول مرة أخرى أو راجع سجلات النظام.";
}

export function newRequestId(): string {
  return randomUUID();
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
