import { NextResponse } from "next/server";
import { storeBillingEvent, verifyPaymobHmac } from "@/services/billing";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { requestIpKey } from "@/lib/request-identity";

export const runtime = "nodejs";

type Json = Record<string, unknown>;

function record(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : typeof value === "number" ? String(value) : undefined;
}

export async function POST(request: Request) {
  const inboundLimit = await rateLimit(requestIpKey(request, "paymob:webhook:ip"), LIMITS.webhook.max, LIMITS.webhook.window);
  if (!inboundLimit.allowed) {
    return NextResponse.json({ error: "Webhook rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let payload: Json;
  try {
    payload = record(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const receivedHmac = new URL(request.url).searchParams.get("hmac") || stringValue(payload.hmac);
  if (!verifyPaymobHmac(payload, receivedHmac)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  // Transaction callbacks commonly wrap the transaction in `obj`; retaining the
  // fallback supports the current Paymob callback shapes without trusting any
  // data that has not passed HMAC verification.
  const transaction = record(payload.obj || payload);
  const claims = record(transaction.payment_key_claims);
  const extras = record(claims.extra || claims.extras || transaction.extras);
  const academyId = stringValue(extras.academy_id);
  const planId = stringValue(extras.plan_id);
  const transactionId = stringValue(transaction.id || transaction.transaction_id || payload.id);
  if (!academyId || !planId || !transactionId) {
    return NextResponse.json({ error: "Missing verified billing metadata" }, { status: 400 });
  }

  const result = await storeBillingEvent({
    provider: "paymob",
    providerEventId: `transaction:${transactionId}`,
    academyId,
    planId,
    payload: {
      transaction_id: transactionId,
      success: transaction.success === true,
      pending: transaction.pending === true,
      is_refunded: transaction.is_refunded === true,
      is_voided: transaction.is_voided === true,
      order_id: stringValue(record(transaction.order).id) || null,
      reference: stringValue(record(transaction.order).merchant_order_id) || null,
    },
    successful: transaction.success === true && transaction.pending !== true && transaction.is_refunded !== true && transaction.is_voided !== true,
    providerCustomerId: stringValue(record(transaction.order).id) || null,
  });

  if (!result.ok) return NextResponse.json({ error: "Unable to record payment" }, { status: 500 });
  return NextResponse.json({ received: true, already_processed: Boolean(result.alreadyProcessed) });
}
