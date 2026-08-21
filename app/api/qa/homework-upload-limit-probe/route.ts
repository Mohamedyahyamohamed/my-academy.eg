import { NextResponse } from "next/server";
import { loadCurrentUser } from "@/services/session";
import { isWithinUploadLimit, MAX_HOMEWORK_UPLOAD_BYTES, MAX_HOMEWORK_UPLOAD_MB } from "@/lib/upload-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * QA-only metadata preflight for the real homework upload policy.
 *
 * This endpoint deliberately does not create a signed URL, write Storage, or
 * insert a files row. It exercises the same shared policy used by the real
 * Server Action so an authenticated Student can prove the rejection boundary
 * without uploading a 10 MiB+ object or changing production data.
 */
export async function POST(request: Request) {
  const user = await loadCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "Student session required" }, { status: 403 });

  let payload: { fileName?: unknown; fileSize?: unknown; contentType?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fileName = typeof payload.fileName === "string" ? payload.fileName : "";
  const fileSize = typeof payload.fileSize === "number" ? payload.fileSize : Number(payload.fileSize);
  const contentType = typeof payload.contentType === "string" ? payload.contentType : "";

  if (!fileName || !Number.isSafeInteger(fileSize)) {
    return NextResponse.json({ error: "fileName and an integer fileSize are required" }, { status: 400 });
  }

  if (!isWithinUploadLimit(fileSize, "homework")) {
    return NextResponse.json(
      {
        ok: false,
        rejected: true,
        error: `File size must be ${MAX_HOMEWORK_UPLOAD_MB} MB or less`,
        declaredBytes: fileSize,
        maxBytes: MAX_HOMEWORK_UPLOAD_BYTES,
        fileName,
        contentType,
        mutation: "none",
      },
      { status: 413 },
    );
  }

  return NextResponse.json({
    ok: true,
    rejected: false,
    declaredBytes: fileSize,
    maxBytes: MAX_HOMEWORK_UPLOAD_BYTES,
    fileName,
    contentType,
    mutation: "none",
  });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
}
