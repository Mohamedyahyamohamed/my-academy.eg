/**
 * Structured logging — no secrets, useful for production debugging.
 * In production, wire this to Sentry/console/external logging.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message?: string;
  academyId?: string;
  userId?: string;
  role?: string;
  action?: string;
  entityId?: string;
  duration?: number;
  errorId?: string;
  [key: string]: any;
}

const SENSITIVE_KEYS = ["password", "token", "secret", "key", "authorization", "cookie"];

function sanitize(data: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
      clean[k] = "[REDACTED]";
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export function log(entry: LogEntry): void {
  const sanitized = sanitize(entry);
  const timestamp = new Date().toISOString();
  // In production, send to Sentry/Datadog/etc.
  // For now, structured console output.
  if (entry.level === "error") {
    console.error(JSON.stringify({ timestamp, ...sanitized }));
  } else if (entry.level === "warn") {
    console.warn(JSON.stringify({ timestamp, ...sanitized }));
  } else {
    console.log(JSON.stringify({ timestamp, ...sanitized }));
  }
}

export function logError(message: string, error: unknown, context?: Record<string, any>): void {
  const err = error as Error;
  log({
    level: "error",
    message,
    errorId: crypto.randomUUID(),
    errorMessage: err?.message,
    errorStack: err?.stack?.split("\n").slice(0, 3).join(" | "),
    ...context,
  });
}

export function logAction(action: string, context?: Record<string, any>): void {
  log({ level: "info", action, ...context });
}
