import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseServiceRoleKey } from "@/services/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKUP_BUCKET = "backups";
const SOURCE_BUCKETS = ["content", "homework"];
// Tables exported to JSON for the daily portable snapshot (add as needed).
const DB_TABLES = [
  "academies", "profiles", "academy_memberships", "students", "groups",
  "group_students", "teachers", "parents", "lessons", "attendance",
  "payments", "transactions", "exams", "grades", "homework", "submissions",
  "notifications", "messages",
];

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const client = nodeSupabaseClient();
  if (!client) return NextResponse.json({ error: "Storage client unavailable" }, { status: 503 });

  const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const result: Record<string, any> = { stamp, storage: {}, db: {} };

  // 1) Storage → backups bucket (dated prefix)
  for (const bucket of SOURCE_BUCKETS) {
    let copied = 0;
    let cursor: string | undefined;
    let page = 0;
    do {
      const { data, error } = await client.storage.from(bucket).list(cursor, { limit: 500, offset: page * 500 });
      if (error) { result.storage[bucket] = { error: error.message }; break; }
      if (!data || data.length === 0) break;
      for (const item of data) {
        if (item.id === null) { cursor = item.name; continue; }
        const { data: blob, error: dlErr } = await client.storage.from(bucket).download(item.name);
        if (dlErr || !blob) continue;
        const dest = `${stamp}/${bucket}/${item.name}`;
        const { error: upErr } = await client.storage.from(BACKUP_BUCKET).upload(dest, blob, { upsert: true });
        if (!upErr) copied++;
      }
      page++; cursor = undefined;
    } while (true);
    result.storage[bucket] = { copied };
  }

  // 2) DB → JSON snapshot in backups bucket
  for (const table of DB_TABLES) {
    const { data, error } = await client.from(table).select("*");
    if (error) { (result.db as Record<string, unknown>)[table] = { error: error.message }; continue; }
    const dest = `${stamp}/db/${table}.json`;
    const { error: upErr } = await client.storage.from(BACKUP_BUCKET).upload(dest, JSON.stringify(data ?? []), { upsert: true, contentType: "application/json" });
    (result.db as Record<string, unknown>)[table] = { rows: (data as unknown[])?.length ?? 0, ok: !upErr };
  }

  return NextResponse.json({ ok: true, ...result });
}
