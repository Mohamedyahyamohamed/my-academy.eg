import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { cleanupOrphanHomeworkFiles } from "@/services/homework-file-cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret, "utf8");
  const actual = Buffer.from(supplied, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

type InjectionPayload = {
  academyId?: unknown;
  fileId?: unknown;
};

/**
 * Synthetic-only failure injection for the cleanup invariant.
 *
 * This route never deletes Storage or DB rows. It selects one explicitly
 * marked fixture, then injects a thrown Storage error through the cleanup
 * service. The expected result is failed=1 and removed=0, proving that the
 * registry row remains available for retry. It is protected by CRON_SECRET
 * and rejects every non-synthetic file name.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    console.warn("CRON_FAILURE_INJECTION_UNAUTHORIZED", { method: request.method });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: InjectionPayload;
  try {
    payload = (await request.json()) as InjectionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const academyId = typeof payload.academyId === "string" ? payload.academyId : "";
  const fileId = typeof payload.fileId === "string" ? payload.fileId : "";
  if (!academyId || !fileId) {
    return NextResponse.json({ error: "academyId and fileId are required" }, { status: 400 });
  }

  const client = nodeSupabaseClient();
  if (!client) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });

  const { data: file, error: fileError } = await client
    .from("files")
    .select("id, name, url")
    .eq("id", fileId)
    .eq("academy_id", academyId)
    .maybeSingle();
  if (fileError || !file || typeof file.name !== "string" || !file.name.toUpperCase().startsWith("MYACADEMY_FAILURE_TEST_ONLY")) {
    return NextResponse.json({ error: "Only the marked synthetic fixture is allowed" }, { status: 404 });
  }

  const result = await cleanupOrphanHomeworkFiles(client, academyId, 0, {
    candidateFileId: fileId,
    storageRemove: async () => {
      throw new Error("SYNTHETIC_STORAGE_FAILURE");
    },
  });

  console.info("CRON_FAILURE_INJECTION_COMPLETE", {
    academyId,
    fileId,
    scanned: result.scanned,
    removed: result.removed,
    skippedLinked: result.skippedLinked,
    failed: result.failed,
  });
  return NextResponse.json({ ok: true, simulatedStorageFailure: true, ...result });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
}
