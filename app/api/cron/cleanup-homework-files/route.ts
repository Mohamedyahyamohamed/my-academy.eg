import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { cleanupOrphanHomeworkFilesForAllAcademies } from "@/services/homework-file-cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    console.warn("CRON_UNAUTHORIZED", {
      method: request.method,
      hasScheduleHeader: Boolean(request.headers.get("x-vercel-cron-schedule")),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedule = request.headers.get("x-vercel-cron-schedule") || "unknown";
  console.info("CRON_START", { schedule });
  console.info("CRON_AUTHORIZED");

  const client = nodeSupabaseClient();
  if (!client) {
    console.error("CRON_CONFIG_ERROR");
    return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  }

  try {
    const result = await cleanupOrphanHomeworkFilesForAllAcademies(client);
    console.info("CRON_CANDIDATES", result.scanned);
    console.info("CRON_CLEANED", result.removed);
    console.info("CRON_ERRORS", result.failed);
    console.info("CRON_COMPLETE", {
      scanned: result.scanned,
      removed: result.removed,
      skippedLinked: result.skippedLinked,
      failed: result.failed,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    console.error("CRON_ERRORS", "unhandled");
    return NextResponse.json({ error: "Cleanup job failed" }, { status: 500 });
  }
}
