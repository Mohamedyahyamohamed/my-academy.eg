import { NextResponse } from "next/server";
import { loadCurrentUser } from "@/services/session";
import { getContentFile } from "@/services/content";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const user = await loadCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;
  if (!fileId) return NextResponse.json({ error: "File not found" }, { status: 404 });

  try {
    const file = await getContentFile(fileId, user);
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const client = nodeSupabaseClient();
    if (!client) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });

    const signed = await client.storage.from("content").createSignedUrl(file.storage_path, 60);
    if (signed.error || !signed.data?.signedUrl) {
      return NextResponse.json({ error: "File is unavailable" }, { status: 404 });
    }

    const upstream = await fetch(signed.data.signedUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "File is unavailable" }, { status: 404 });
    }

    const safeName = file.name.replace(/[\\"\r\n]/g, "_");
    const headers = new Headers({
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    });
    if (upstream.headers.get("content-length")) headers.set("Content-Length", upstream.headers.get("content-length")!);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("[content-download] denied or unavailable:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
