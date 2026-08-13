import { test, expect } from "./helpers";

test.describe("Billing webhook security", () => {
  test("Stripe rejects a checkout payload without a verifiable signature", async ({ request }) => {
    const response = await request.post("/api/billing/stripe/webhook", {
      data: {
        id: "evt_forged_checkout",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_forged_checkout",
            payment_status: "paid",
            metadata: {
              academy_id: "academy-forged",
              plan_id: "enterprise",
            },
          },
        },
      },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Invalid webhook signature" });
  });

  test("Paymob rejects a forged HMAC even when billing metadata is supplied", async ({ request }) => {
    const response = await request.post("/api/billing/paymob/webhook?hmac=forged-signature", {
      data: {
        obj: {
          id: "forged-transaction",
          success: true,
          pending: false,
          is_refunded: false,
          is_voided: false,
          payment_key_claims: {
            extra: {
              academy_id: "academy-forged",
              plan_id: "enterprise",
            },
          },
        },
      },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Invalid webhook signature" });
  });

  test("Paymob rejects malformed JSON before it can reach billing activation", async ({ page }) => {
    await page.goto("/login");
    const result = await page.evaluate(async () => {
      const response = await fetch("/api/billing/paymob/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      });
      return { status: response.status, body: await response.json() };
    });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: "Invalid JSON payload" });
  });
});
