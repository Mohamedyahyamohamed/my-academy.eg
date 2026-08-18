# MYAcademy — Functional Readiness Evidence

Date: 18 August 2026

## Payment gateway

The repository contains `app/actions/billing.ts` with `startBillingCheckoutAction`, and `services/billing.ts` with Stripe and Paymob hosted checkout creation. Stripe checkout uses `mode=subscription`, EGP recurring price data, success/cancel URLs, and metadata for `academy_id` and `plan_id`. Paymob creates an intention and stores a non-success billing event before redirecting.

The Stripe webhook at `app/api/billing/stripe/webhook/route.ts` verifies the `stripe-signature` HMAC, enforces a five-minute timestamp window, rate-limits inbound requests, accepts supported lifecycle events, and calls `storeBillingEvent` idempotently. The Paymob webhook exists separately and must be inspected for production proof.

Important limitation: code presence and webhook logic are not proof that a real customer can pay end-to-end. A functional Pass requires a configured provider, a real/sandbox checkout, a provider-delivered webhook, a subscription row updated automatically, and a duplicate-event replay result. No payment or production mutation was performed in this audit.

## WhatsApp

The application contains `services/whatsapp.ts`, `lib/whatsapp.ts`, a webhook route, QR linking, and notification calls from payment actions. The diagnostic send endpoint is gated by authenticated ADMIN plus `WHATSAPP_MODE=live` and `WHATSAPP_ALLOW_TEST_SEND=true`. No real WhatsApp message was sent. Code presence therefore does not establish that the provider is currently configured or that delivery/webhooks are operational.

## Source note

The pricing UI itself states that paid-plan activation depends on payment-provider and webhook configuration. The final functional verdict must distinguish implementation from runtime/provider evidence.

## Import students

`app/(app)/students/import/page.tsx` and `components/students/import-students.tsx` support CSV upload or paste, not native `.xlsx` parsing. The UI says Excel because it instructs the user to save Excel as CSV. The parser handles quoted fields and comma/semicolon delimiters. `importStudentsAction` accepts up to 1,000 rows, scopes reads/writes by `academy_id`, deduplicates by normalized first name/last name/phone, reports row errors, and imports optional parents. No 100+ row database import was executed against production; therefore end-to-end 100+ retention remains unproven.

## Health latency

Ten unauthenticated requests to `https://my-academy-eg.vercel.app/api/health` on 18 Aug 2026 all returned HTTP 200. Measured total times: average 1004.3 ms, minimum 459.3 ms, maximum 2613.9 ms. The connection time remained low while start-transfer time dominated, so the variance is consistent with serverless/runtime/database work and cold/warm behavior, but these ten samples are not enough to isolate database latency. It is not a hard failure, but it merits monitoring and a p95/p99 baseline before scale.

## 404

Before deployment, the production unknown route returned HTTP 404 with the default Next title `404: This page could not be found.` A custom Arabic-default, English-cookie-aware `app/not-found.tsx` was added locally. It still requires commit/deploy and a post-deploy production check before it can be marked Pass.

## Validation after local change

`pnpm lint`: passed. `pnpm build`: passed. `pnpm vitest run`: 44 passed, 9 skipped; 3 test files passed and `tests/cross-tenant-route.test.ts` remained skipped because runtime fixtures are absent. No production mutation or outbound message was performed.

## External implementation references

- SheetJS local file access: https://docs.sheetjs.com/docs/demos/local/file/ — browser code should read `File.arrayBuffer()` and pass the resulting `ArrayBuffer` to `XLSX.read`; `readFile` does not work in browsers. The official example uses `XLSX.utils.sheet_to_json` on a selected worksheet.
- SheetJS parsing options: https://docs.sheetjs.com/docs/api/parse-options/ — `read` accepts ArrayBuffer data; `sheetRows` can cap parsed rows; `sheets` can select a worksheet; `cellDates` and `raw` affect date/value handling.
- Meta WhatsApp Cloud API getting started: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started — official setup path for a Meta app with WhatsApp, API usage, messaging, test webhook, and production configuration.
- Meta webhook endpoint creation: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/ — Meta sends GET requests to verify the callback URL and verify token when configuring the webhook.
- Meta WhatsApp webhooks overview: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview — webhook requests carry JSON events from WhatsApp Business Platform.
