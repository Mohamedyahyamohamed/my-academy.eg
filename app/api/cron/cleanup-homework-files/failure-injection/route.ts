import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { cleanupOrphanHomeworkFiles } from "@/services/homework-file-cleanup";
import { isHomeworkStoragePath } from "@/services/homework-files";

export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

/**
 * Temporary, fixture-only failure injection for the homework cleanup proof.
 *
 * This intentionally simulates a Storage failure for all candidates and then
 * verifies that the selected fixture registry row is still present. It does
 * not delete a DB row first: Storage deletion is an external side effect and
 * cannot participate in a Postgres transaction, so the safe invariant is to
 * retain the registry row when Storage fails.
 *
 * Remove this route after the owner has captured the production evidence.
 */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = nodeSupabaseClient();
  if (!client) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });

  let input: { academyId?: unknown; fileId?: unknown };
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const academyId = typeof input.academyId === "string" ? input.academyId : "";
  const fileId = typeof input.fileId === "string" ? input.fileId : "";
  if (!academyId || !fileId) {
    return NextResponse.json({ error: "academyId and fileId are required" }, { status: 400 });
  }

  const { data: files, error: fileError } = await client
    .from("files")
    .select("id, academy_id, url")
    .eq("academy_id", academyId)
    .eq("id", fileId)
    .limit(1);
  if (fileError) return NextResponse.json({ error: "Could not inspect fixture file" }, { status: 500 });

  const fixture = (files?.[0] ?? null) as { id?: string; academy_id?: string; url?: string } | null;
  if (!fixture || fixture.id !== fileId || fixture.academy_id !== academyId || !fixture.url || !isHomeworkStoragePath(fixture.url, academyId)) {
    return NextResponse.json({ error: "Only a valid failure-injection fixture is accepted" }, { status: 403 });
  }

  const pathSegments = fixture.url.split("/");
  const { data: homework, error: homeworkError } = await client
    .from("homework")
    .select("id, academy_id, title")
    .eq("id", pathSegments[1])
    .eq("academy_id", academyId)
    .limit(1);
  if (homeworkError) return NextResponse.json({ error: "Could not inspect fixture homework" }, { status: 500 });
  const fixtureHomework = (homework?.[0] ?? null) as { id?: string; academy_id?: string; title?: string } | null;
  if (!fixtureHomework || fixtureHomework.id !== pathSegments[1] || !fixtureHomework.title?.toLowerCase().includes("failure injection")) {
    return NextResponse.json({ error: "Only a homework titled Failure Injection may be tested" }, { status: 403 });
  }

  const { data: links, error: linkError } = await client
    .from("homework_submissions")
    .select("file_id")
    .eq("file_id", fileId)
    .limit(1);
  if (linkError) return NextResponse.json({ error: "Could not inspect fixture links" }, { status: 500 });
  if ((links ?? []).length > 0) {
    return NextResponse.json({ error: "Fixture must be unlinked before failure injection" }, { status: 409 });
  }

  const injectedStorageError = new Error("Injected Storage failure for BLOCKER 3 proof");
  const failureClient = {
    ...client,
    storage: {
      ...client.storage,
      from: (bucket: string) => bucket === "homework"
        ? { remove: async (_paths: string[]) => ({ error: injectedStorageError }) }
        : client.storage.from(bucket),
    },
  } as typeof client;

  const cleanup = await cleanupOrphanHomeworkFiles(failureClient, academyId, 0);
  const { data: remaining, error: verifyError } = await client
    .from("files")
    .select("id")
    .eq("academy_id", academyId)
    .eq("id", fileId)
    .limit(1);
  if (verifyError) return NextResponse.json({ error: "Could not verify registry retention" }, { status: 500 });

  const registryRetained = ((remaining ?? []) as Array<{ id: string }>).some((row) => row.id === fileId);
  return NextResponse.json({
    ok: registryRetained,
    simulatedStorageFailure: true,
    registryRetained,
    cleanup,
    invariant: "Storage failure retains the registry row; no DB deletion is attempted before the external Storage operation succeeds.",
  }, { status: registryRetained ? 200 : 500 });
}
