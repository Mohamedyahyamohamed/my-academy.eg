# MYAcademy — Full Production Smoke Test Report

**Date:** 19 August 2026  
**Environment:** Production deployment at `my-academy-eg.vercel.app`  
**Scope:** Read-only and safe-negative production smoke testing, authenticated role boundaries, Academy B isolation evidence, health, localization, billing eligibility, QR/upload code paths, and parental-consent persistence.  
**Safety constraints:** No production records were intentionally created, edited, deleted, or imported during the smoke test. No real email or WhatsApp message was sent. No payment was completed.

> **Release decision: STILL BLOCKED.** The application is operational and several important controls pass, but physical QR attendance, runtime file-upload isolation, positive payment/webhook flow, provider sandbox delivery, exact Vercel public-key verification, and complete consent capture remain insufficiently evidenced for an unrestricted public launch.

## Executive summary

| Area | Result | Evidence | Interpretation |
|---|---|---|---|
| Local quality | **PASS** | `pnpm lint`, `pnpm build`, and Vitest completed successfully; **46 passed / 9 skipped** after the lesson-time regression tests. | No compile, lint, or current automated-test regression was found. |
| Public production routes | **PASS** | 9 public/application endpoints returned HTTP 200; intentional unknown route returned custom HTTP 404. | Public surface is reachable and the custom Arabic 404 is deployed. |
| Production health | **PASS** | `/api/health` returned 200 with `app`, `qr`, and `db` healthy. Ten sequential checks remained 200; internal latency ranged 112–509 ms. | The first slower measurement is consistent with initialization/network variance; this is not a load test or p95 guarantee. |
| Role boundaries | **PASS for tested route guards; partial workflow coverage** | Owner and Teacher read-only walkthroughs passed; Teacher→Parent redirected correctly; inherited six-account login matrix passed. | Student, Parent, and Assistant deeper workflows still need linked synthetic fixtures for complete closure. |
| Academy B isolation | **PARTIAL — runtime evidence exists for scoped Student/search, full matrix incomplete** | Academy B synthetic account loaded `/student`; `/groups` and `/students` redirected; scoped search returned empty for an Academy A-only term. | All sensitive tables and storage still require a complete A/B runtime matrix. |
| QR attendance | **BLOCKED** | UI and code checks pass; physical camera/write tests were not performed. | Real-device first scan, duplicate, wrong-group/time, offline, retry, and refresh behavior remain unproven. |
| File uploads | **BLOCKED for runtime closure** | Content and homework actions now share a **10MB product limit**, enforce signatures, association, quota, private paths, and signed URLs; no runtime upload/isolation test was performed. | Runtime valid/invalid/size/retry and cross-tenant storage evidence remain required. |
| Billing | **BLOCKED for end-to-end proof** | Teacher checkout attempt was safely rejected before payment because the workspace type was ineligible; Owner is intentionally redirected to platform. | An eligible Academy Admin/Owner workspace and Sandbox payment are required to prove webhook activation. |
| WhatsApp/email | **BLOCKED for positive delivery proof** | Unauthenticated test endpoint and unsigned webhooks were rejected; no message was sent. | Sandbox/stub delivery and webhook idempotency remain unproven. |
| Parental consent | **PARTIAL — server metadata fix committed locally** | Main student creation now derives `consent_at`, `consent_by`, and version `1.0` only from a true consent checkbox and authenticated actor; import/invite/direct-account paths explicitly leave consent null/false. | The policy/version and operator-facing acceptance/audit retrieval still need legal/product confirmation and deployed runtime evidence. |
| Exact Vercel/Supabase configuration | **MANUAL BLOCKER** | The exact Production value of `NEXT_PUBLIC_SUPABASE_ANON_KEY` was not exposed or changed. | Owner must confirm it is a publishable/anon key, not a service-role key; no secret should be pasted into chat. |

## Production HTTP results

The safe HTTP smoke script recorded the following results:

| Route | Status | Result |
|---|---:|---|
| `/` | 200 | Public landing page loaded |
| `/login` | 200 | Login page loaded |
| `/signup` | 200 | Signup page loaded |
| `/forgot-password` | 200 | Password recovery page loaded |
| `/pricing` | 200 | Pricing page loaded |
| `/support` | 200 | Support page loaded |
| `/privacy` | 200 | Privacy page loaded |
| `/terms` | 200 | Terms page loaded |
| `/api/health` | 200 | Health endpoint successful |
| Unknown route | 404 | Custom Arabic/RTL 404 rendered |
| `/robots.txt` | 200 | Robots route loaded |
| `/sitemap.xml` | 200 | Sitemap route loaded |

Protected negative checks also behaved safely. Unauthenticated search returned `401`; GET requests to POST-only protected/webhook routes returned `405` rather than performing an action. Separate browser checks showed unauthenticated POST attempts to push and WhatsApp test surfaces returned `401`, while unsigned Stripe and Paymob webhook attempts returned `400 Invalid webhook signature`. No message, payment, or successful write was produced by these negative checks.

## Authenticated role and route matrix

| Role/session | Route or operation | Result | Evidence |
|---|---|---|---|
| Platform Owner / `SUPER_ADMIN` | Platform dashboard and analytics | **PASS** | Owner browser evidence; dashboard and analytics rendered in Arabic/RTL. |
| Platform Owner / `SUPER_ADMIN` | Groups and students | **PASS** | Groups page displayed a QA group; students page displayed two QA students and filters. |
| Platform Owner / `SUPER_ADMIN` | Settings academy/users/materials/payments/security/roles | **PASS read-only** | All tabs rendered; no save, invite, password change, role change, or account creation was executed. |
| Platform Owner / `SUPER_ADMIN` | `/billing` | **Expected redirect** | Code intentionally redirects platform owners to `/platform`; this is not an end-to-end billing proof. |
| Teacher | `/teacher` | **PASS** | Dashboard rendered with groups, students, upcoming lessons, attendance, homework, grades, content, messages, and support links. |
| Teacher | `/groups`, `/attendance`, `/homework`, `/grades`, `/students`, `/messages`, `/teacher/content` | **PASS render-only** | Pages loaded; no mutation was performed. Lessons page rendered an empty state despite dashboard lesson indicators and needs separate data investigation. |
| Teacher | `/parent` | **PASS guard** | Redirected back to `/teacher`; no Parent data exposed. |
| Teacher | `/billing` | **Safely rejected / incomplete** | Basic Teacher plan selection returned `الخطة المحددة غير متاحة لنوع مساحة العمل الحالية`; no checkout page, card, payment, or subscription change occurred. |
| Student | `/student` | **PASS for Academy B fixture** | Synthetic Academy B student loaded; no groups displayed as expected for the minimal fixture. |
| Academy B Student | `/groups`, `/students` | **PASS guard** | Redirected to `/student`. |
| Academy B Student | `/api/search` for an Academy A-only synthetic term | **PASS scoped result** | Returned `{"results":[]}`; no cross-tenant result was exposed. |
| Parent | Login and full workflow | **Partial inherited PASS** | Six-account login and basic role boundaries passed; deeper linked-child workflows remain incomplete. |
| Assistant | Settings/user model | **PASS as limited Teacher** | UI explicitly labels Assistant as a limited Teacher scoped to selected groups; no separate persisted Assistant role exists. |

## Localization and time format

Language switching in the Teacher session changed the navigation and dashboard between Arabic and English without a new login or full browser reload. The final Teacher evidence recorded the dashboard switch as a pass, including English labels and AM/PM dates, followed by a successful return to Arabic. Owner settings, groups, students, analytics, and the custom 404 rendered in Arabic/RTL.

Complete route-by-route translation is not yet proven. Some demo group/day labels remained English in Arabic cards, and every form, dialog, toast, error, upload response, billing state, and schedule still requires a deliberate bilingual matrix. Central date/time helpers use 12-hour formatting, but this report does not claim exhaustive 12-hour coverage across all production records.

## QR attendance

The `/attendance` and `/attendance/scan` interfaces loaded successfully. The UI exposed group and lesson selection, quick scan for the current lesson, manual lesson choice, camera start, and an empty attendance history. Static and code review of `services/attendance.ts` found session/academy/group/lesson/enrollment checks and database-level duplicate protection through a unique lesson/student constraint.

The critical runtime evidence is still missing. No physical phone camera was used, no attendance row was intentionally written, and first scan, duplicate scan, wrong group/time, offline, retry, RTL, and refresh behavior were not verified. QR remains a launch blocker until a safe synthetic lesson and student are used on a real device.

## File upload and content association

The content upload action in `app/actions/content.ts` requires an authenticated Teacher/Admin role, blocks limited Assistants, rate-limits attempts, requires a course, optionally validates a lesson belonging to that course, checks file signatures and declared type, enforces the shared **10MB product cap**, checks tenant storage quota, prefixes storage paths with the academy ID, writes `content_files` with the same academy ID, and returns a one-hour signed URL. Failure during database recording or signed-URL creation triggers cleanup. Homework attachments use the same shared 10MB cap with a narrower type allowlist. Next.js retains a 12MB transport allowance for multipart overhead; this is not a user-facing file limit.

This is a strong code-level result but not runtime closure. No valid content file was uploaded, no invalid signature was submitted, no interrupted retry was tested, and no Academy A/B signed-download denial was recorded. The production upload blocker therefore remains open.

## Import behavior

The production import UI accepts CSV or pasted data and documents a 1000-row limit. The displayed required columns include `first_name,last_name,phone,grade,school,parent_name,parent_phone`. It does not accept native `.xlsx`; users must save Excel as CSV. The server action prevents duplicate rows by normalized name/phone and returns created, duplicate, and per-row error counts, but it is not one transaction: a mixed file may create earlier valid rows while later rows fail.

A 100+ row import was not run against production because it would intentionally add records. The safe next test is a disposable academy/fixture or a transaction-capable staging workflow.

The current implementation also corrected product copy across the student list/import pages and landing page: Excel files must be exported as CSV before import; native `.xlsx` parsing remains a post-launch enhancement unless explicitly prioritized.

## Billing and provider integrations

Payment code and webhook routes exist, including signature verification and subscription activation logic, but the full provider flow was not proven. The only checkout attempt in this smoke test used a Teacher workspace that the product correctly rejected as ineligible before creating a payment session. The Platform Owner is intentionally redirected away from `/billing`; an eligible Academy Admin or eligible academy workspace is required for a Sandbox checkout.

WhatsApp and email were not positively exercised. Safe negative requests rejected unauthenticated access and unsigned webhooks, and no real recipient was contacted. A provider Sandbox or stub must return a message ID, persist an accepted event, verify delivery/status webhook handling, and prove idempotent replay without using a real customer number.

## Parental-consent change made in this pass

The main authenticated student-creation action now passes the authenticated actor ID into the service. When the validated consent checkbox is `true`, the persisted student row derives `consent_at` from the server clock, `consent_by` from the authenticated profile ID, and `consent_version` as `1.0`. The client cannot provide or override these metadata values.

Bulk import, invite redemption, and direct confirmed test-account creation now explicitly write `consent_given: false` and null metadata rather than silently claiming consent. This is legally safer than fabricating an acceptance event, but those workflows still require a product decision: collect an explicit guardian acceptance before enrollment, or keep the student record pending until consent is captured. Existing rows are not retroactively stamped, and no production data was changed during this pass.

The code changes are locally linted, built, and tested. They are not claimed as deployed until committed and published through the normal deployment path.

## Quality verification

| Check | Result |
|---|---|
| `pnpm lint` | **PASS** |
| `pnpm build` | **PASS** |
| `pnpm vitest run` | **PASS: 44 passed; 9 skipped** |
| Skipped suite | Runtime cross-tenant route suite; safe Academy A/B fixture variables are absent |
| Production mutation safety | **PASS**; no intentional data mutation, payment completion, or real notification |

## Prioritized remaining gaps

### Critical

The critical blockers are physical-device QR attendance, full Academy A/B runtime isolation across records and private files, exact production Supabase/Vercel key confirmation, and a legally complete consent acceptance path. These must not be replaced by code inspection alone.

### High

High-priority gaps are eligible-workspace Sandbox payment plus webhook activation, WhatsApp Sandbox delivery and webhook idempotency, valid/invalid/large/retry upload runtime behavior, complete Arabic/English and 12-hour matrix, and a safe 100+ row import test outside production data.

### Medium and post-launch

Native XLSX import, a distinct persisted Assistant role, richer observability and load testing, CSP design, and data-rich lesson fixtures are reasonable follow-up work. The current `/lessons` empty state should be investigated against the dashboard lesson counts before customer onboarding.

## Closure checklist

| Owner action | Why it remains required | Evidence to return |
|---|---|---|
| Confirm Vercel Production URL points to Supabase project `fpcdaiyktnoiwaulbhcn` and the public key is publishable/anon, never service-role | This cannot be safely inferred from rendered pages | Screenshot or redacted confirmation showing only key type/prefix, never the secret |
| Confirm the accepted no-cost posture for leaked-password protection | The declined Supabase Pro limitation prevents claiming this control is enabled | Dashboard status or explicit accepted-limitation decision |
| Run eligible-workspace Stripe/Paymob Sandbox checkout | Owner/Teacher tests did not reach checkout | Redacted checkout result, webhook event ID/status, subscription state |
| Run WhatsApp Sandbox only | Positive delivery was intentionally not performed | Sandbox message ID and delivery webhook status; no real recipient |
| Run QR on a physical phone | Camera/offline behavior cannot be simulated reliably in the browser | First scan, duplicate, wrong group/time, offline/retry, refresh results |
| Run file upload in a disposable/synthetic scope | Runtime private-storage isolation remains unproven | File ID/path prefix, signed URL behavior, Academy B denial, cleanup result |
| Approve consent policy version and capture path | Metadata alone is not legal consent | Policy/version, actor, timestamp, subject, and audit retrieval evidence |

**Final status: STILL BLOCKED.** The correct next action is to close the runtime evidence gaps above, not to label the platform Ready based only on health, build, or route-render results.

## Evidence files

- [`public-http.tsv`](./runtime-checks-2026-08-19/public-http.tsv)
- [`api-http.tsv`](./runtime-checks-2026-08-19/api-http.tsv)
- [`health.json`](./runtime-checks-2026-08-19/health.json)
- [`browser-evidence.md`](./runtime-checks-2026-08-19/browser-evidence.md)
- [`teacher-evidence.md`](./runtime-checks-2026-08-19/teacher-evidence.md)
- [`local-tests.txt`](./runtime-checks-2026-08-19/local-tests.txt)
- [`closure-browser-evidence-2026-08-18.md`](./closure-browser-evidence-2026-08-18.md)


## Post-deployment verification

Commit `42174f4d8d13e49fcdce7cdc538838377a68f384` was pushed to `main` and Vercel deployment `dpl_GQY8qM9vBtiB4iNsyU4A9c9X1Qf2` reached **READY / Production**. Immediately after deployment, the following public checks passed: `/api/health` HTTP 200 with `app=ok`, `qr=ok`, `db=ok`, and `latency_ms=133`; the custom unknown route returned HTTP 404; `/robots.txt` and `/sitemap.xml` returned HTTP 200. No secret or environment variable was changed.

The consent metadata implementation is therefore deployed. This confirms deployment integrity, not legal closure: the consent checkbox, policy/version, direct-account/import behavior, and audit retrieval still require the product and compliance decisions described above.
