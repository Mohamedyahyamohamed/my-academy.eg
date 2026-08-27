import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAnonKey, getSupabaseUrl } from "@/services/supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { getObservabilitySnapshot } from "@/lib/error-trace";
import { loadCurrentUser } from "@/services/session";

/**
 * Internal monitoring dashboard data (platform owner only).
 * Combines the live dependency health (DB / Auth / Storage) with the
 * in-memory error & 429 observatory so production issues can be tracked daily
 * without leaving the app. Never exposes secrets or user PII.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseReady = Boolean(getSupabaseUrl() && getSupabaseAnonKey() && isSupabaseConfigured());
  const client = supabaseReady ? nodeSupabaseClient() : null;

  const checks: Record<string, string> = {
    app: "ok",
    qr: process.env.QR_SESSION_SECRET && process.env.QR_SESSION_SECRET.length >= 32 ? "ok" : "unavailable",
  };

  if (!client) {
    checks.db = "not-configured";
    checks.auth = "not-configured";
    checks.storage = "not-configured";
  } else {
    // DB
    try {
      const { error } = await client.from("academies").select("id").limit(1);
      checks.db = error ? "query-failed" : "ok";
    } catch {
      checks.db = "unavailable";
    }
    // Auth
    try {
      const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
      checks.auth = error ? "auth-error" : "ok";
    } catch {
      checks.auth = "auth-error";
    }
    // Storage
    try {
      const { data, error } = await client.storage.listBuckets();
      checks.storage = error ? "storage-error" : "ok";
      void data;
    } catch {
      checks.storage = "storage-error";
    }
  }

  const obs = getObservabilitySnapshot();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    checks,
    observability: obs,
  });
}
