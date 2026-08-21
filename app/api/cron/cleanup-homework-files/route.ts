import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { cleanupOrphanHomeworkFilesForAllAcademies } from "@/services/homework-file-cleanup";

export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = nodeSupabaseClient();
  if (!client) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });

  try {
    const result = await cleanupOrphanHomeworkFilesForAllAcademies(client);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Homework file cleanup cron failed", error);
    return NextResponse.json({ error: "Cleanup job failed" }, { status: 500 });
  }
}
