import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { storeBillingEvent } from "@/services/billing";

export const runtime = "nodejs";

type StripeEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      payment_status?: string;
      customer?: string;
      subscription?: string;
      metadata?: { academy_id?: string; plan_id?: string };
    };
  };
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

export async function POST(request: Request) {
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

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const checkout = event.data?.object;
  const academyId = checkout?.metadata?.academy_id;
  const planId = checkout?.metadata?.plan_id;
  if (!event.id || !academyId || !planId) {
    return NextResponse.json({ error: "Missing checkout metadata" }, { status: 400 });
  }

  const result = await storeBillingEvent({
    provider: "stripe",
    providerEventId: event.id,
    academyId,
    planId,
    payload: { event_type: event.type, checkout_id: checkout?.id || null, payment_status: checkout?.payment_status || null },
    successful: checkout?.payment_status === "paid",
    providerCustomerId: checkout?.customer || null,
    providerSubscriptionId: checkout?.subscription || null,
  });

  if (!result.ok) return NextResponse.json({ error: "Unable to record payment" }, { status: 500 });
  return NextResponse.json({ received: true, already_processed: Boolean(result.alreadyProcessed) });
}
