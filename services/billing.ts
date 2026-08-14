import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { getWorkspaceType, PLANS, resolvePlanIdForWorkspace, setPlan, type Plan, type WorkspaceType } from "@/services/saas";
import { sendSubscriptionSuspensionEmail } from "@/lib/email";
import { isPlatformOwnerEmail } from "@/lib/auth";

export type BillingProvider = "stripe" | "paymob";

type CheckoutActor = {
  academyId: string;
  email: string;
  fullName?: string | null;
};

export type CheckoutResult =
  | { ok: true; url: string; provider: BillingProvider }
  | { ok: false; error: string };

type SubscriptionLifecycle = "trialing" | "active" | "past_due" | "canceled" | "expired";

type VerifiedPayment = {
  provider: BillingProvider;
  providerEventId: string;
  academyId?: string | null;
  planId?: string | null;
  payload: Record<string, unknown>;
  successful: boolean;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  subscriptionStatus?: SubscriptionLifecycle;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
};

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function providerPeriodEnd(payload: Record<string, unknown>): string | null {
  const candidates = [
    valueAtPath(payload, "current_period_end"),
    valueAtPath(payload, "subscription.current_period_end"),
    valueAtPath(payload, "data.object.current_period_end"),
    valueAtPath(payload, "period_end"),
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      const date = new Date(candidate > 10_000_000_000 ? candidate : candidate * 1000);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    if (typeof candidate === "string" && candidate.trim()) {
      const date = new Date(candidate);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }
  return null;
}

function getPaidPlan(planId: string, workspaceType?: WorkspaceType): Plan | null {
  const resolvedPlanId = workspaceType ? resolvePlanIdForWorkspace(planId, workspaceType) : planId;
  const plan = resolvedPlanId ? PLANS[resolvedPlanId] : null;
  return plan && plan.price > 0 ? plan : null;
}

function appBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value || !/^https:\/\//i.test(value)) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an HTTPS URL before payments can be enabled.");
  }
  return value.replace(/\/$/, "");
}

function parseName(fullName?: string | null) {
  const names = (fullName || "مدير الأكاديمية").trim().split(/\s+/);
  return { firstName: names[0] || "Academy", lastName: names.slice(1).join(" ") || "Admin" };
}

async function createStripeCheckout(actor: CheckoutActor, plan: Plan): Promise<CheckoutResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "بوابة الدفع غير مهيأة بعد. أضف بيانات Stripe أو Paymob أولاً." };

  const baseUrl = appBaseUrl();
  const payload = new URLSearchParams({
            mode: "subscription",

    success_url: `${baseUrl}/billing?payment=success&provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/billing?payment=cancelled`,
    customer_email: actor.email,
    "line_items[0][price_data][currency]": "egp",
    "line_items[0][price_data][unit_amount]": String(Math.round(plan.price * 100)),
    "line_items[0][price_data][product_data][name]": `MY Academy — ${plan.name} (شهري)`,
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][quantity]": "1",
    "metadata[academy_id]": actor.academyId,
    "metadata[plan_id]": plan.id,
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null) as { url?: string; error?: { message?: string } } | null;
  if (!response.ok || !data?.url) {
    console.error("Stripe checkout creation failed", response.status, data?.error?.message);
    return { ok: false, error: "تعذّر بدء جلسة الدفع. راجع إعدادات Stripe ثم أعد المحاولة." };
  }

  return { ok: true, url: data.url, provider: "stripe" };
}

function renderPaymobCheckoutUrl(template: string, clientSecret: string): string | null {
  if (!template.startsWith("https://") || !template.includes("{client_secret}")) return null;
  return template
    .replaceAll("{client_secret}", encodeURIComponent(clientSecret))
    .replaceAll("{public_key}", encodeURIComponent(process.env.PAYMOB_PUBLIC_KEY || ""));
}

async function createPaymobCheckout(actor: CheckoutActor, plan: Plan): Promise<CheckoutResult> {
  const secretKey = process.env.PAYMOB_SECRET_KEY;
  const paymentMethods = process.env.PAYMOB_PAYMENT_METHODS?.split(",").map((value) => value.trim()).filter(Boolean);
  const checkoutTemplate = process.env.PAYMOB_CHECKOUT_URL_TEMPLATE;
  const billingPhone = process.env.PAYMOB_BILLING_PHONE?.trim();

  if (!secretKey || !paymentMethods?.length || !checkoutTemplate || !billingPhone) {
    return {
      ok: false,
      error: "بوابة Paymob غير مكتملة الإعداد. يلزم المفتاح السري ووسائل الدفع ورابط Checkout ورقم الفوترة قبل تفعيلها.",
    };
  }

  const baseUrl = appBaseUrl();
  const reference = `myacademy_${randomUUID()}`;
  const { firstName, lastName } = parseName(actor.fullName);
  const paymentMethodValues = paymentMethods.map((value) => (/^\d+$/.test(value) ? Number(value) : value));
  const payload = {
    amount: Math.round(plan.price * 100),
    currency: "EGP",
    payment_methods: paymentMethodValues,
    items: [{ name: `MY Academy — ${plan.name}`, amount: Math.round(plan.price * 100), description: "اشتراك شهري", quantity: 1 }],
    billing_data: {
      apartment: "N/A",
      first_name: firstName,
      last_name: lastName,
      street: "N/A",
      building: "N/A",
      phone_number: billingPhone,
      city: process.env.PAYMOB_BILLING_CITY || "Cairo",
      country: "EG",
      email: actor.email,
      floor: "N/A",
      state: process.env.PAYMOB_BILLING_CITY || "Cairo",
    },
    extras: { academy_id: actor.academyId, plan_id: plan.id, reference },
    special_reference: reference,
    expiration: 3600,
    notification_url: `${baseUrl}/api/billing/paymob/webhook`,
    redirection_url: `${baseUrl}/billing?payment=return&provider=paymob`,
  };

  const response = await fetch("https://accept.paymob.com/v1/intention/", {
    method: "POST",
    headers: { Authorization: `Token ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null) as { id?: string; client_secret?: string; detail?: string; message?: string } | null;
  const checkoutUrl = data?.client_secret ? renderPaymobCheckoutUrl(checkoutTemplate, data.client_secret) : null;
  if (!response.ok || !data?.id || !checkoutUrl) {
    console.error("Paymob intention creation failed", response.status, data?.detail || data?.message);
    return { ok: false, error: "تعذّر بدء عملية Paymob. راجع بيانات التكامل في الإعدادات ثم أعد المحاولة." };
  }

  // This record is an audit trail, not proof of a successful payment. Activation
  // occurs exclusively through the independently verified callback below.
  await storeBillingEvent({
    provider: "paymob",
    providerEventId: `intention:${data.id}`,
    academyId: actor.academyId,
    planId: plan.id,
    payload: { reference, intention_id: data.id },
    successful: false,
  });

  return { ok: true, url: checkoutUrl, provider: "paymob" };
}

/** Start a hosted checkout. A paid plan is never activated by this method. */
export async function createCheckout(actor: CheckoutActor, planId: string): Promise<CheckoutResult> {
  if (isPlatformOwnerEmail(actor.email)) {
    return { ok: false, error: "مالك المنصة لا يحتاج إلى خطة عميل أو اشتراك خاص به." };
  }
  const workspaceType = getWorkspaceType(actor.academyId);
  const resolvedPlanId = resolvePlanIdForWorkspace(planId, workspaceType);
  const plan = resolvedPlanId ? getPaidPlan(resolvedPlanId, workspaceType) : null;
  if (!plan) return { ok: false, error: "الخطة المحددة غير متاحة لنوع مساحة العمل الحالية." };

  try {
    if (process.env.STRIPE_SECRET_KEY) return await createStripeCheckout(actor, plan);
    if (process.env.PAYMOB_SECRET_KEY) return await createPaymobCheckout(actor, plan);
    return { ok: false, error: "لم تُربط بوابة دفع بعد. أضف إعدادات Paymob أو Stripe لتفعيل الترقية." };
  } catch (error) {
    console.error("Billing checkout setup error", error);
    return { ok: false, error: "تعذّر تجهيز الدفع بصورة آمنة. راجع متغيرات البيئة المطلوبة." };
  }
}

/** Persist a verified provider event and update the current subscription idempotently. */
export async function storeBillingEvent(event: VerifiedPayment): Promise<{ ok: boolean; alreadyProcessed?: boolean }> {
  const client = nodeSupabaseClient();
  if (!client || !isSupabaseConfigured()) {
    if (event.successful && event.academyId && event.planId) setPlan(event.academyId, event.planId);
    return { ok: true };
  }

  let currentQuery = client
    .from("subscriptions")
    .select("academy_id,plan_id,status,current_period_end,cancel_at_period_end,canceled_at,provider_customer_id,provider_subscription_id")
    .limit(1);
  if (event.academyId) currentQuery = currentQuery.eq("academy_id", event.academyId);
  else if (event.providerSubscriptionId) currentQuery = currentQuery.eq("provider_subscription_id", event.providerSubscriptionId);
  const currentResult = await currentQuery.maybeSingle();
  const current = currentResult.data as {
    academy_id?: string | null;
    plan_id?: string | null;
    status?: SubscriptionLifecycle | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean | null;
    canceled_at?: string | null;
    provider_customer_id?: string | null;
    provider_subscription_id?: string | null;
  } | null;
  const academyId = event.academyId || current?.academy_id || null;
  const planId = event.planId || current?.plan_id || null;

  const existing = await client
    .from("billing_events")
    .select("id,status")
    .eq("provider", event.provider)
    .eq("provider_event_id", event.providerEventId)
    .maybeSingle();
  if (existing.data?.status === "processed") return { ok: true, alreadyProcessed: true };

  const eventRecord = {
    provider: event.provider,
    provider_event_id: event.providerEventId,
    academy_id: academyId,
    plan_id: planId,
    status: event.successful ? "received" : "ignored",
    payload: event.payload,
    processed_at: event.successful ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!existing.data) {
    const inserted = await client.from("billing_events").insert(eventRecord);
    if (inserted.error && inserted.error.code !== "23505") {
      console.error("Unable to store billing event", inserted.error.message);
      return { ok: false };
    }
  }

  if (!event.successful) return { ok: true };
  if (!academyId || !planId) {
    await client.from("billing_events")
      .update({ status: "failed", failure_reason: "Unable to map event to an academy subscription", updated_at: new Date().toISOString() })
      .eq("provider", event.provider)
      .eq("provider_event_id", event.providerEventId);
    return { ok: false };
  }

  const workspaceType = academyId ? getWorkspaceType(academyId) : undefined;
  const plan = workspaceType && planId ? getPaidPlan(planId, workspaceType) : planId ? getPaidPlan(planId) : null;
  if (!plan) {
    await client.from("billing_events")
      .update({ status: "failed", failure_reason: "Unknown paid plan", updated_at: new Date().toISOString() })
      .eq("provider", event.provider)
      .eq("provider_event_id", event.providerEventId);
    return { ok: false };
  }

  const providerEnd = providerPeriodEnd(event.payload);
  const currentPeriodEnd = providerEnd ?? current?.current_period_end ?? new Date(Date.now() + MONTH_MS).toISOString();
  const status = event.subscriptionStatus ?? "active";
  const subscription = await client.from("subscriptions").upsert({
    academy_id: academyId,
    plan_id: plan.id,
    status,
    provider: event.provider,
    provider_customer_id: event.providerCustomerId || current?.provider_customer_id || null,
    provider_subscription_id: event.providerSubscriptionId || current?.provider_subscription_id || null,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: event.cancelAtPeriodEnd ?? current?.cancel_at_period_end ?? false,
    canceled_at: event.canceledAt ?? current?.canceled_at ?? null,
    metadata: {
      last_provider_event_id: event.providerEventId,
      period_end_source: providerEnd ? "provider" : current?.current_period_end ? "existing_subscription" : "fallback_30_days",
      lifecycle_status: status,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "academy_id" });

  if (subscription.error) {
    console.error("Unable to update subscription", subscription.error.message);
    await client.from("billing_events")
      .update({ status: "failed", failure_reason: subscription.error.message, updated_at: new Date().toISOString() })
      .eq("provider", event.provider)
      .eq("provider_event_id", event.providerEventId);
    return { ok: false };
  }

  await client.from("billing_events")
    .update({ status: "processed", processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("provider", event.provider)
    .eq("provider_event_id", event.providerEventId);

  const suspensionStatus = status === "past_due" || status === "expired" || status === "canceled" ? status : null;
  const wasSuspended = current?.status === "past_due" || current?.status === "expired" || current?.status === "canceled";
  const enteredSuspendedState = Boolean(suspensionStatus) && !wasSuspended;
  if (enteredSuspendedState && suspensionStatus) {
    try {
      const [{ data: academy }, { data: admins }] = await Promise.all([
        client.from("academies").select("name").eq("id", academyId).maybeSingle(),
        client.from("profiles").select("email,role").eq("academy_id", academyId).in("role", ["ADMIN", "TEACHER"]).eq("is_active", true).limit(50),
      ]);
      const profiles = (admins ?? []) as Array<{ email?: string | null; role?: string }>;
      const adminProfiles = profiles.filter((profile) => profile.role === "ADMIN");
      const recipientProfiles = adminProfiles.length ? adminProfiles : profiles.filter((profile) => profile.role === "TEACHER").slice(0, 1);
      const recipients = recipientProfiles
        .map((profile) => profile.email?.trim())
        .filter((email): email is string => Boolean(email));
      for (const email of recipients) {
        await sendSubscriptionSuspensionEmail({
          email,
          academyName: academy?.name || "MY Academy",
          status: suspensionStatus as "past_due" | "expired" | "canceled",
          language: "ar",
        });
      }
    } catch (error) {
      console.error("[billing] subscription suspension email failed:", (error as Error).message);
    }
  }

  return { ok: true };
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function valueAtPath(value: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    return current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined;
  }, value);
}

/** Verify Paymob HMAC according to the exact, dashboard-provided field order. */
export function verifyPaymobHmac(payload: Record<string, unknown>, receivedHmac: string | null | undefined): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  const fieldOrder = process.env.PAYMOB_HMAC_FIELD_ORDER?.split(",").map((value) => value.trim()).filter(Boolean);
  if (!secret || !fieldOrder?.length || !receivedHmac || !/^[a-f0-9]{128}$/i.test(receivedHmac)) return false;

  const canonical = fieldOrder.map((path) => asString(valueAtPath(payload, path))).join("");
  const expected = createHmac("sha512", secret).update(canonical, "utf8").digest("hex");
  const actualBuffer = Buffer.from(receivedHmac.toLowerCase(), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
