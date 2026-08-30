import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAnonKey, getSupabaseUrl } from "@/services/supabase/config";
import { setRequestContext, getRequestId } from "@/services/request-context";
import { traceError, newRequestId } from "@/lib/error-trace";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

/**
 * Health / readiness endpoint.
 * - 200 healthy: process alive + all required dependencies reachable.
 * - 503 degraded: process alive but a required dependency is unavailable.
 * - Never leaks credentials or provider internals.
 *
 * Checks: app, database, auth, storage. A client may send `x-request-id` to
 * correlate its own telemetry; every response carries a `request_id` so a
 * failed health check can be traced to its exact server-side log line.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DbStatus = "ok" | "not-configured" | "invalid-credentials" | "unavailable" | "query-failed";
type ComponentStatus = "ok" | "degraded" | "not-configured" | "unavailable" | "invalid-credentials" | "query-failed" | "auth-error" | "storage-error";

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

const STORAGE_BUCKETS = ["content", "homework"];

async function withTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  // Thread a stable request id (prefer client-supplied for correlation).
  const requestId = req.headers.get("x-request-id") || newRequestId();
  setRequestContext(null, { requestId, path: "/api/health" });

  const started = Date.now();
  const checks: Record<string, ComponentStatus> = {
    app: "ok",
    qr: process.env.QR_SESSION_SECRET && process.env.QR_SESSION_SECRET.length >= 32 ? "ok" : "unavailable",
  };

  const supabaseReady = Boolean(getSupabaseUrl() && getSupabaseAnonKey() && isSupabaseConfigured());
  const client = supabaseReady ? nodeSupabaseClient() : null;

  // Database
  if (!client) {
    checks.db = "not-configured";
  } else {
    try {
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
    } catch (error) {
      traceError(error, { scope: "health:db-check", severity: "warning", detail: { dbStatus: "unavailable" } });
      checks.db = classifyDatabaseError(error);
    }
  }

  // Auth
  if (!client) {
    checks.auth = "not-configured";
  } else {
    try {
        const { data, error } = await withTimeout<any>(client.auth.admin.listUsers({ page: 1, perPage: 1 }));
        if (error) {
          checks.auth = error.message?.toLowerCase().includes("api key") || error.status === 401 || error.status === 403 ? "invalid-credentials" : "auth-error";
        } else {
          checks.auth = "ok";
        }
    } catch (error) {
      traceError(error, { scope: "health:auth-check", severity: "warning" });
      const message = (error as { message?: string })?.message?.toLowerCase() ?? "";
      checks.auth = message.includes("api key") || message.includes("invalid jwt") ? "invalid-credentials" : "auth-error";
    }
  }

  // Storage
  if (!client) {
    checks.storage = "not-configured";
  } else {
    try {
        const { data, error } = await withTimeout<any>(client.storage.listBuckets());
        if (error) {
          checks.storage = error.message?.toLowerCase().includes("api key") || error.status === 401 || error.status === 403 ? "invalid-credentials" : "storage-error";
        } else {
          const names = new Set((data ?? []).map((b: { name: string }) => b.name));
          const missing = STORAGE_BUCKETS.filter((b: string) => !names.has(b));
          checks.storage = missing.length ? "degraded" : "ok";
        }
    } catch (error) {
      traceError(error, { scope: "health:storage-check", severity: "warning" });
      const message = (error as { message?: string })?.message?.toLowerCase() ?? "";
      checks.storage = message.includes("api key") || message.includes("invalid jwt") ? "invalid-credentials" : "storage-error";
    }
  }

  const required = ["app", "db", "auth", "storage"] as const;
  const ok = required.every((k) => checks[k] === "ok") && checks.qr === "ok";
  const degraded = required.every((k) => checks[k] !== "unavailable" && checks[k] !== "invalid-credentials");

  return NextResponse.json(
    {
      status: ok ? "healthy" : degraded ? "degraded" : "down",
      request_id: getRequestId() ?? requestId,
      path: "/api/health",
      checks,
      last_check: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - started,
    },
    { status: ok ? 200 : ok === false && degraded ? 200 : 503 },
  );
}
