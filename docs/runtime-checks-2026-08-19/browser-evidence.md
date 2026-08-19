# أدلة التصفح — 19 أغسطس 2026

## صفحة 404

الرابط المختبر: https://my-academy-eg.vercel.app/this-route-does-not-exist-20260819

النتيجة: HTTP 404 مع صفحة مخصصة بالعربية، تحتوي على العنوان `الصفحة غير موجودة`، وصفًا يوضح أن الرابط قديم أو أن الصفحة نُقلت، ورابط `العودة للرئيسية`. الفحص البصري أظهر اتجاه RTL وتصميم MY Academy، وليس صفحة Next.js الافتراضية باللغة الإنجليزية.

## قياس `/api/health` المتتالي

في 10 طلبات متتالية بتاريخ 2026-08-19، عادت كل الاستجابات HTTP 200 مع `status=healthy` و`app/qr/db=ok`. زمن health الداخلي (`latency_ms`) تراوح بين 112 و509 ms؛ أول قياس كان 509 ms ثم استقرت القياسات التالية تقريبًا بين 112 و146 ms. زمن HTTP الكلي تراوح بين 0.394 و0.924 ثانية. النمط يتوافق مع تهيئة/استيقاظ أولي أو تذبذب شبكة أكثر من كونه فشلًا وظيفيًا، لكنه ليس قياسًا كافيًا وحده لتحديد p95 تحت حمل حقيقي.

## POST سلبي آمن بدون جلسة

`/api/push/subscribe` و`/api/push/send` و`/api/whatsapp/test` أعادت 401 Unauthorized. Webhooks Stripe وPaymob أعادا 400 Invalid webhook signature. لم يُرسل أي إشعار ولم تُنشأ معاملة أو كتابة ناجحة.

## Platform Owner — subscriptions route

URL tested: `https://my-academy-eg.vercel.app/platform/subscriptions?full-smoke=20260819`

The authenticated Platform Owner session loaded the custom Arabic 404 page (`404`, `الصفحة غير موجودة`) rather than a subscriptions page. This is a **functional route defect or incorrect route assumption**. The Owner dashboard itself exposes a sidebar item labeled `الاشتراكات`, so the actual href should be inspected and tested; no data was changed.

Source: production browser session on 2026-08-19.

## Owner billing navigation

Clicking the visible Owner sidebar item `الاشتراكات` changed the browser URL to `https://my-academy-eg.vercel.app/billing`, but the rendered content remained the Platform Owner dashboard rather than a dedicated billing/subscriptions screen. This is a **functional navigation/content mismatch** to fix or explicitly document. No plan was selected and no checkout session was created in this Owner check.

## Owner read-only checks

- `/audit?full-smoke=20260819-owner`: **Pass**; dedicated audit page loaded in Arabic, provided a search field, and showed an empty-state message without runtime error.
- `/support?full-smoke=20260819-owner`: **Pass**; public Arabic support page loaded with login/help guidance and a protected “open ticket” route. No ticket was submitted.

The Owner sidebar item `الاشتراكات` still navigates to `/billing` while rendering the platform dashboard, recorded above as a navigation/content mismatch.

## Billing interpretation correction

Code review of `app/(app)/billing/page.tsx` confirms the Owner result is intentional: `SUPER_ADMIN` is redirected to `/platform`, and a Teacher inside an Academy workspace is redirected to `/teacher`. The billing page is for an eligible academy/independent-teacher workspace, so the earlier Owner navigation result is **not** evidence of a billing defect. Checkout E2E still requires an eligible workspace and Sandbox credentials.

## Owner groups check

`https://my-academy-eg.vercel.app/groups?full-smoke=20260819-owner` loaded successfully in Arabic/RTL. It displayed the `مجموعة جديدة` control and one visible QA group card (`MYAcademy QA Group 01`) with course, zero students, Saturday schedule rendered in Arabic 12-hour format, assigned teacher, and monthly price. No create/edit action was performed.

## Owner students check

`/students?full-smoke=20260819-owner` loaded successfully in Arabic/RTL. The page displayed `استيراد من Excel`, student-account and parent-account actions, search, status/group filters, two active QA students, and pagination showing 1–2 of 2. No add/edit/archive/import action was performed.

## Owner import UI check

`/students/import?full-smoke=20260819-owner-invalid` loaded successfully. The UI says CSV or paste only, instructs Excel users to save as CSV, shows a 1000-student per-operation limit, required columns, a template download control, file input, paste area, and import button. No valid data was imported.

## Negative import upload

An intentionally invalid `.txt` fixture was selected in the CSV input. The browser accepted the file into the client-side input and showed its text in the paste area; the import action was not submitted. This is **not** a pass for server-side rejection yet; the UI uses a permissive file input and requires a controlled submit or code-level validation to prove rejection.

## Owner analytics check

`/analytics?full-smoke=20260819-owner` loaded successfully in Arabic/RTL. It displayed 2 total students, 1 active group, 0% attendance, zero active subscriptions/payment conversions, and no grades/material data; one revenue-ranking group appeared with zero collected revenue. This is a successful render, while the zero values reflect the current QA fixture state.

## Owner settings check

`/settings?full-smoke=20260819-owner` loaded successfully in Arabic/RTL. Read-only inspection showed tabs for academy, users, materials, payments, security, and roles, with academy fields and a save button visible. No field was changed and no save action was executed.

## Owner payment-settings check

The Owner settings payment tab loaded successfully and displayed accepted methods: cash, card, bank transfer, electronic wallet, and other. No method was changed and no save action was executed. This is academy payment-method configuration, not proof of Stripe/Paymob checkout activation.

## Owner security and roles tabs

The security tab rendered a password-change form with an 8-character minimum and a warning that common or leaked passwords may be rejected. No password was entered and no change was submitted.

The roles tab rendered the documented role boundaries for Manager, Teacher, Parent, and Student. It states that authorization is enforced server-side and PostgreSQL RLS protects every table. The test account previously identified as Assistant remains represented as a limited Teacher; no separate Assistant role was exposed in this UI.

## Owner users tab

The users tab loaded successfully and showed existing pending memberships, a control to add an academy member, and separate forms for creating a confirmed test account and a limited assistant. The assistant form explicitly scopes access to selected groups and labels the effective role as Teacher. No invitation was sent, no account was created, and no pending invitation was cancelled.

Deployment dpl_GQY8qM9vBtiB4iNsyU4A9c9X1Qf2 READY for commit 42174f4d8d13e49fcdce7cdc538838377a68f384 at 2026-08-19.
Post-deploy public checks: /api/health=200; custom 404=404; robots=200; sitemap=200.
