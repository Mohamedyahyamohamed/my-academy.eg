import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

export const runtime = "nodejs";

const STATUS_RANK: Record<string, number> = {
  SKIPPED: 0,
  ACCEPTED: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: 5,
};

function verifiedSignature(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

/** Meta uses this GET request once to verify that the callback URL is controlled by MY Academy. */
export async function GET(request: NextRequest) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const fingerprint = (value: string | null | undefined) =>
    value ? createHash("sha256").update(value).digest("hex").slice(0, 12) : null;

  // Temporary safe diagnostic: never log the token itself, only lengths and fingerprints.
  console.warn("[whatsapp-webhook] verify_attempt", {
    mode,
    tokenLength: token?.length ?? 0,
    tokenFingerprint: fingerprint(token),
    expectedLength: verifyToken?.length ?? 0,
    expectedFingerprint: fingerprint(verifyToken),
    challengePresent: Boolean(challenge),
  });

  if (!verifyToken) {
    return new NextResponse("WhatsApp webhook is not configured", { status: 503 });
  }
  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Receives delivery statuses only. Incoming message text is deliberately ignored;
 * Meta may retry this endpoint, so updates are monotonic and idempotent.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifiedSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const client = nodeSupabaseClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: "Database is unavailable" }, { status: 503 });
  }

  const statuses = (payload?.entry ?? []).flatMap((entry: any) =>
    (entry?.changes ?? []).flatMap((change: any) => change?.value?.statuses ?? []),
  );

  for (const statusEvent of statuses) {
    const externalMessageId = statusEvent?.id;
    const nextStatus = String(statusEvent?.status || "").toUpperCase();
    if (!externalMessageId || !Object.hasOwn(STATUS_RANK, nextStatus)) continue;

    const { data: log } = await client
      .from("whatsapp_message_logs")
      .select("id,status")
      .eq("external_message_id", externalMessageId)
      .maybeSingle();
    if (!log || STATUS_RANK[nextStatus] < (STATUS_RANK[log.status] ?? 0)) continue;

    const timestamp = statusEvent?.timestamp ? new Date(Number(statusEvent.timestamp) * 1000).toISOString() : new Date().toISOString();
    const update: Record<string, string | null> = { status: nextStatus };
    if (nextStatus === "DELIVERED") update.delivered_at = timestamp;
    if (nextStatus === "READ") update.read_at = timestamp;
    if (nextStatus === "FAILED") {
      const code = statusEvent?.errors?.[0]?.code;
      update.failure_reason = code ? `Meta error code ${String(code)}` : "Meta reported delivery failure";
    }
    await client.from("whatsapp_message_logs").update(update).eq("id", log.id);
  }

  return NextResponse.json({ ok: true });
}
