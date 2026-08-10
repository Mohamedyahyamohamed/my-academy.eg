import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/services/supabase/config";

/**
 * Health / readiness endpoint.
 * - 200 healthy: process alive + DB reachable.
 * - 503 degraded: process alive but DB unreachable.
 * - Does NOT require auth. Never leaks secrets.
 * Used by: uptime monitoring, load balancers, deploy verification.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();
  const checks: Record<string, string> = { app: "ok" };

  // DB connectivity (readiness). RLS scopes results; we only care the query
  // resolves without error → Supabase is reachable.
  try {
    if (!isSupabaseConfigured()) {
      checks.db = "not-configured (dev mode)";
    } else {
      const { createServerSupabaseClient } = await import("@/lib/supabase/server");
      const client = createServerSupabaseClient();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const { error } = await client
          .from("academies")
          .select("id")
          .limit(1)
          .abortSignal(controller.signal);
        checks.db = error ? `error: ${error.message}` : "ok";
      } finally {
        clearTimeout(timeout);
      }
    }
  } catch (e) {
    checks.db = `unreachable: ${(e as Error)?.message ?? "unknown"}`;
  }

  const ok = Object.values(checks).every((v) => v === "ok" || v.startsWith("not-configured"));

  return NextResponse.json(
    {
      status: ok ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - started,
    },
    { status: ok ? 200 : 503 },
  );
}
