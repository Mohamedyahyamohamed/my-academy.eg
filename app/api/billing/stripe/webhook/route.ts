import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { storeBillingEvent } from "@/services/billing";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { requestIpKey } from "@/lib/request-identity";

export const runtime = "nodejs";

type StripeObject = {
  id?: string;
  payment_status?: string;
  customer?: string | null;
  subscription?: string | null;
  current_period_end?: number | string | null;
  status?: string | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: number | string | null;
  metadata?: { academy_id?: string; plan_id?: string } | null;
};

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: StripeObject };
};

function verifyStripeSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const segments = header.split(",").map((value) => value.trim());
  const timestamp = segments.find((value) => value.startsWith("t="))?.slice(2);
  const signatures = segments.filter((value) => value.startsWith("v1=")).map((value) => value.slice(3));
  if (!timestamp || !signatures.length || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const signatureBuffer = Buffer.from(signature, "hex");
    return signatureBuffer.length === expectedBuffer.length && timingSafeEqual(signatureBuffer, expectedBuffer);
  });
}

function epochToIso(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(numeric)) {
    const date = new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function lifecycleStatus(value: string | null | undefined): "trialing" | "active" | "past_due" | "canceled" | "expired" | null {
  if (value === "trialing" || value === "active" || value === "past_due" || value === "canceled" || value === "expired") {
    return value;
  }
  if (value === "unpaid") return "past_due";
  return null;
}

function supportedEvent(type: string | undefined): boolean {
  return type === "checkout.session.completed"
    || type === "customer.subscription.updated"
    || type === "invoice.payment_failed"
    || type === "customer.subscription.deleted";
}

export async function POST(request: Request) {
  const inboundLimit = await rateLimit(requestIpKey(request, "stripe:webhook:ip"), LIMITS.webhook.max, LIMITS.webhook.window);
  if (!inboundLimit.allowed) {
    return NextResponse.json({ error: "Webhook rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!event.id || !supportedEvent(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const object = event.data?.object;
  if (!object) return NextResponse.json({ error: "Missing Stripe event object" }, { status: 400 });

  const academyId = object.metadata?.academy_id || null;
  const planId = object.metadata?.plan_id || null;
  const providerSubscriptionId = object.subscription || (event.type?.startsWith("customer.subscription.") ? object.id : null) || null;
  const providerCustomerId = object.customer || null;

  let subscriptionStatus: "trialing" | "active" | "past_due" | "canceled" | "expired" | undefined;
  let successful = true;

  if (event.type === "checkout.session.completed") {
    if (!academyId || !planId) return NextResponse.json({ error: "Missing checkout metadata" }, { status: 400 });
    successful = object.payment_status === "paid";
  } else if (event.type === "customer.subscription.updated") {
    const nextStatus = lifecycleStatus(object.status);
    if (!nextStatus || (!academyId && !providerSubscriptionId)) {
      return NextResponse.json({ received: true, ignored: true });
    }
    subscriptionStatus = nextStatus;
  } else if (event.type === "invoice.payment_failed") {
    subscriptionStatus = "past_due";
    if (!academyId && !providerSubscriptionId) {
      return NextResponse.json({ received: true, ignored: true });
    }
  } else if (event.type === "customer.subscription.deleted") {
    subscriptionStatus = "canceled";
    if (!academyId && !providerSubscriptionId) {
      return NextResponse.json({ received: true, ignored: true });
    }
  }

  const result = await storeBillingEvent({
    provider: "stripe",
    providerEventId: event.id,
    academyId,
    planId,
    payload: {
      event_type: event.type,
      stripe_object_id: object.id || null,
      payment_status: object.payment_status || null,
      current_period_end: object.current_period_end || null,
      subscription: providerSubscriptionId,
      status: object.status || null,
      cancel_at_period_end: object.cancel_at_period_end ?? null,
      canceled_at: object.canceled_at || null,
    },
    successful,
    providerCustomerId,
    providerSubscriptionId,
    subscriptionStatus,
    cancelAtPeriodEnd: object.cancel_at_period_end ?? undefined,
    canceledAt: epochToIso(object.canceled_at),
  });

  if (!result.ok) return NextResponse.json({ error: "Unable to record billing event" }, { status: 500 });
  return NextResponse.json({ received: true, already_processed: Boolean(result.alreadyProcessed) });
}
