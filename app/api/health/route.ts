import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAnonKey, getSupabaseUrl } from "@/services/supabase/config";
import { setRequestContext, getRequestId } from "@/services/request-context";
import { traceError, newRequestId } from "@/lib/error-trace";

/**
 * Health / readiness endpoint.
 * - 200 healthy: process alive + DB reachable.
 * - 503 degraded: process alive but a required dependency is unavailable.
 * - Never leaks credentials or provider internals.
 *
 * Every response carries a `request_id` (correlating with server-side error
 * logs) so a failed health check can be traced to its exact log line. A client
 * may send `x-request-id` to correlate its own telemetry.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DbStatus = "ok" | "not-configured" | "invalid-credentials" | "unavailable" | "query-failed";

function classifyDatabaseError(error: unknown): Exclude<DbStatus, "ok" | "not-configured"> {
  const candidate = error as { status?: number; code?: string; message?: string } | null;
  const status = candidate?.status;
  const message = (candidate?.message ?? "").toLowerCase();
  if (status === 401 || status === 403 || message.includes("invalid api key") || message.includes("invalid jwt") || message.includes("jwt expired")) {
    return "invalid-credentials";
  }
  if (message.includes("fetch failed") || message.includes("enotfound") || message.includes("timeout") || message.includes("aborted")) {
    return "unavailable";
  }
  return "query-failed";
}

export async function GET(req: NextRequest) {
  // Thread a stable request id (prefer client-supplied for correlation).
  const requestId = req.headers.get("x-request-id") || newRequestId();
  setRequestContext(null, { requestId, path: "/api/health" });

  const started = Date.now();
  const checks: Record<string, string> = {
    app: "ok",
    qr: process.env.QR_SESSION_SECRET && process.env.QR_SESSION_SECRET.length >= 32 ? "ok" : "unavailable",
  };

  try {
    if (!getSupabaseUrl() || !getSupabaseAnonKey() || !isSupabaseConfigured()) {
      checks.db = "not-configured";
    } else {
      const { createServerSupabaseClient } = await import("@/lib/supabase/server");
      const client = await createServerSupabaseClient();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const { error } = await client
          .from("academies")
          .select("id")
          .limit(1)
          .abortSignal(controller.signal);
        checks.db = error ? classifyDatabaseError(error) : "ok";
      } finally {
        clearTimeout(timeout);
      }
    }
  } catch (error) {
    // Log full context (request_id, path, error) — never echo it to the caller.
    traceError(error, { scope: "health:db-check", severity: "warning", detail: { dbStatus: "unavailable" } });
    checks.db = classifyDatabaseError(error);
  }

  const ok = checks.app === "ok" && checks.qr === "ok" && checks.db === "ok";
  return NextResponse.json(
    {
      status: ok ? "healthy" : "degraded",
      request_id: getRequestId() ?? requestId,
      path: "/api/health",
      checks,
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - started,
    },
    { status: ok ? 200 : 503 },
  );
}
