# MYAcademy — Final Production Readiness Report

**Date:** 18 August 2026  
**Scope:** Production-readiness audit of the Next.js/Supabase/Vercel multi-tenant SaaS, with emphasis on the eight minimal launch blockers, RLS/authentication, tenant isolation, QR attendance, uploads, localization, and operational configuration.  
**Author:** Manus AI

> **Decision: NOT READY for an unrestricted public launch.** The application is buildable, the current production deployment was previously observed as healthy, and several role and security controls are in place. However, four blockers still lack conclusive runtime evidence, two require dashboard or provider confirmation, and the parental-consent audit trail is not complete enough to mark legal compliance as closed.

## Executive status

| Area | Status | Evidence and interpretation |
|---|---|---|
| Build and static quality | **PASS** | `pnpm lint` and `pnpm build` completed with exit status 0 on 18 August 2026. |
| Automated business/integration tests | **PASS with coverage limits** | Vitest: 44 passed, 9 skipped, 3 files passed and 1 file skipped. The skipped suite is the runtime cross-tenant route suite because safe Academy A/B fixtures were not supplied. |
| Production health | **PASS on inherited evidence** | `GET /api/health` previously returned HTTP 200 with `app`, `qr`, and `db` all `ok`. This was not re-run against production in this pass. |
| Production deployment | **PASS on inherited evidence** | The inherited audit recorded deployment `dpl_HJ2J4atDkPh3QgknzRk1KUqauRsA`, commit `ee25263`, state `READY`. |
| Launch decision | **STILL BLOCKED** | Runtime tenant isolation, physical-device QR, upload behavior, provider configuration, and consent evidence remain incomplete. |

## Minimal launch-blocker checklist

| # | Blocker | Status | What the engineering audit established | Required closure evidence |
|---:|---|---|---|---|
| 1 | Authenticated role matrix for Owner/Admin, Teacher, Assistant, Parent, and Student | **PARTIAL — Still Blocked** | Production smoke tests passed for Owner, Teacher, Parent, and Student sampled routes. The Assistant account is represented as a restricted Teacher assignment, and deeper Student/Parent workflows were blocked by unlinked demo records. | Test every role with linked synthetic records, verify allowed and denied routes, and save screenshots or HTTP results for each role. |
| 2 | Academy A versus Academy B tenant isolation | **STILL BLOCKED — Critical** | RLS was observed enabled on sampled sensitive tables, and private auth helpers had no `PUBLIC` or `anon` execute grants. The runtime route suite intentionally skipped because the six Academy A/B fixture variables were absent. In-memory tests are not sufficient proof of authenticated Supabase isolation. | Create two synthetic academies and run the existing route suite with runtime-only credentials and IDs. Academy A must receive 404/empty results for Academy B records while Academy B can access its own records. Repeat for groups, students, attendance, notes, grades, homework, payments, messages, and content files. |
| 3 | QR attendance on a real phone | **STILL BLOCKED — Critical** | Code-level checks cover lesson, group, academy, enrollment, caller identity, and duplicate protection. The database has a unique `(lesson_id, student_id)` index, so concurrent duplicates are guarded at the database layer. A physical first scan, duplicate, wrong group/time, refresh, offline, and RTL flow was not completed. | On a physical phone, record a first scan, repeat it, try a wrong-group/time QR, refresh, and test network loss/retry. Capture the user-visible result and attendance row count without sending messages. |
| 4 | File upload and lesson association | **CODE PASS / RUNTIME BLOCKED** | Lesson-content upload validates role, assistant restrictions, course/lesson association, allowed file signatures/extensions, tenant-prefixed storage paths, quota, and a 500MB cap. Homework attachments intentionally remain capped at 10MB. Real large-file, invalid-type, retry, signed-download, and cross-tenant tests were not completed. | Use synthetic files only: valid PDF/link, invalid extension/signature, near-limit file, retry after interruption, lesson association, and Academy A download attempt against Academy B content. Confirm no real notification is sent. |
| 5 | Arabic/English, RTL/LTR, and 12-hour time | **PARTIAL — Still Blocked** | The language switch changed navigation and direction without a visible reload in a Student session. Central date/time helpers use `hour12: true`. Page-body translation coverage and every form, toast, dialog, error, and schedule remain unverified. | Run the language matrix on login, dashboard, groups, lessons, attendance, upload, billing, forms, dialogs, and errors. Confirm direction changes without reload and all rendered times use 12-hour formatting in both languages. |
| 6 | Email/WhatsApp invitations and webhooks without accidental live delivery | **STILL BLOCKED** | Provider routes exist, but the inherited audit recorded Resend test failures caused by domain/testing restrictions. No real WhatsApp or Email message was sent during this audit. Delivery, signature verification, retry/idempotency, and provider sandbox behavior remain unproven. | Use provider sandbox/test destinations only, or stub the outbound client. Verify webhook signature rejection, accepted event persistence, idempotent replay, and error visibility. Do not use a production recipient. |
| 7 | Supabase leaked-password protection and exact Vercel public key | **STILL BLOCKED — Manual configuration** | Supabase Security Advisor previously reported `auth_leaked_password_protection` disabled. The project contains both a legacy anon key and a modern publishable key; the exact Vercel Production value was not exposed or changed by this audit. | In Supabase Dashboard, enable leaked-password protection. In the correct Vercel project/team, confirm `NEXT_PUBLIC_SUPABASE_URL` targets project `fpcdaiyktnoiwaulbhcn` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` contains only the public publishable/anon credential, never a service-role key. Redeploy and recheck `/api/health` and login. |
| 8 | Parental consent and policy acceptance audit trail | **STILL BLOCKED — Compliance** | Student creation requires `consent_given === true` in the schema and persists `consent_version: "v1"`, but the create path does not populate a durable `consent_at` or `consent_by` acceptance record. Existing generic audit logging is not evidence that the actual parent acceptance event is recorded with actor, version, timestamp, and subject. | Define the policy text/version with qualified legal review, add an immutable acceptance record containing student/parent, policy version, timestamp, actor, and source, then test denial when missing and audit retrieval by academy. |

## Security and tenant-isolation review

The inherited production inspection reported `relrowsecurity = true` for sampled tables including academies, memberships, attendance, billing events, files, grades, groups, homework, lessons, messages, notes, payments, and students. The same inspection found internal `auth_*` helpers in the private schema with `EXECUTE` retained for `authenticated` and no direct `PUBLIC` or `anon` grants. This is a strong configuration signal, but it is not a substitute for a real authenticated Academy A/B test because application-owner/service-role paths can bypass ordinary RLS behavior.

The route-level isolation harness is appropriately designed to avoid false passes: it is skipped unless both academy credentials and Academy B record IDs are supplied. Its intended assertions cover students, groups, search, export, authentication, and Academy B ownership. It should be extended or executed against safe synthetic records for attendance, notes, grades, homework, payments, messages, and files before launch.

The current Assistant model is a **restricted Teacher assignment**, not a separate persisted role. That is acceptable only if the product decision is explicit and every sensitive action is guarded server-side. The audit found server-side restrictions for student import and grade/homework management, and a restricted sidebar. If reporting or policy requires a distinct Assistant role, that is a post-launch schema/product change rather than something to silently infer during launch.

## QR attendance and upload findings

Attendance code paths validate the lesson, group, academy, enrollment, and identity of the caller before writing. The unique database index protects the same student's duplicate attendance for the same lesson even under concurrent requests. The unresolved risk is not an obvious missing authorization check; it is the absence of real-device evidence for camera permissions, wrong-time messaging, offline behavior, retry semantics, and refresh consistency.

Content upload code is substantially hardened. The action requires an authorized role, blocks limited assistants, rate-limits uploads, requires course association, supports optional lesson association, validates file type/signature, enforces tenant-prefixed storage paths and quota, and returns a short-lived signed URL. The 500MB limit applies to teacher lesson content; homework submissions remain 10MB. The launch blocker remains runtime verification, especially cross-tenant signed-download denial and interrupted-upload recovery.

## Localization and SEO work completed in this pass

The root metadata now includes a production `metadataBase`, canonical URL, localized description, Open Graph fields, Twitter summary metadata, and explicit robots directives. New App Router routes were added for `/robots.txt` and `/sitemap.xml`. The sitemap contains only public pages and excludes private dashboards, API routes, and role portals.

Local verification confirmed that the built application exposes static `/robots.txt` and `/sitemap.xml` routes and that the public HTML contains title, description, Open Graph, and Twitter metadata. These changes are currently local working-tree changes and are **not claimed as deployed** until committed and published through the normal review/deployment path.

## Verification log

| Check | Actual result | Notes |
|---|---|---|
| `pnpm lint` | **PASS** | ESLint completed successfully. |
| `pnpm build` | **PASS** | Next.js production build completed; route inventory included robots and sitemap. |
| `pnpm vitest run --reporter=verbose` | **PASS with skips** | 44 passed, 9 skipped; cross-tenant runtime file skipped due to absent safe fixtures. |
| Local `GET /robots.txt` | **PASS** | Returned the intended disallow rules and sitemap URL. |
| Local `GET /sitemap.xml` | **PASS** | Returned XML containing public URLs only. |
| Local public metadata inspection | **PASS** | Title, description, canonical/Open Graph/Twitter markers rendered. |
| Local `GET /api/health` | **BLOCKED by environment** | Returned 503 because the sandbox start process did not have the production Supabase configuration. This is not evidence of a production outage; inherited production health evidence was HTTP 200. |
| Production mutation safety | **PASS** | No production records, secrets, email, or WhatsApp messages were changed or sent during this pass. |

## Prioritized gap list

### Critical

The highest-priority gaps are real Academy A/B runtime isolation, physical-device QR attendance, and the parental-consent audit trail. These are launch blockers because they concern data disclosure, attendance integrity, and processing of student data. The exact Vercel/Supabase authentication configuration is also a critical release gate until manually confirmed.

### High

Large-file and signed-download behavior, provider sandbox/webhook verification, linked Student/Parent/Assistant fixtures, and full localization coverage are high-priority operational tests. Payment sandbox-to-production verification is also high priority and remains separate from the completed code-level payment authorization review.

### Medium

A Content-Security-Policy header is a reasonable hardening recommendation because the inherited header inspection did not observe one. It should be designed against the actual script and provider inventory rather than added blindly. Performance Advisor unused-index notices should be re-evaluated after real traffic and should not be removed solely because they are currently unused.

### Low

Post-launch improvements include richer metadata images, expanded translated content-body strings, a distinct Assistant role if required by product policy, and broader observability dashboards.

## Required closure sequence

First, the owner should complete the two dashboard actions: enable Supabase leaked-password protection and verify the exact public Supabase key and URL in the correct Vercel project, then redeploy. No secret should be pasted into chat, Git, or the audit report.

Second, create two synthetic academies and linked test records without using real student or recipient data. Execute the existing route-level isolation harness and extend it to all sensitive domains. Third, run the QR and upload matrix on a physical phone and record only pass/fail outcomes, HTTP status, and non-sensitive record counts. Fourth, add the durable consent acceptance record after policy wording and retention requirements are reviewed by qualified counsel. Finally, run payment and notification provider tests only in sandbox/stub mode and verify webhook signatures and idempotency.

Until these steps produce evidence, the correct release label remains **Still Blocked**, not Ready.

## References

[1]: `docs/launch-blocker-automation-findings.md` — project evidence log and prior production diagnostics.

[2]: `tests/cross-tenant-route.test.ts` — runtime Academy A/B isolation harness.

[3]: `services/attendance.ts` — attendance authorization and duplicate-protection logic.

[4]: `app/actions/content.ts` — file validation, association, quota, and tenant-prefixed storage logic.

[5]: `schemas/students.ts` and `services/students.ts` — current consent requirement and persistence path.

[6]: `app/layout.tsx`, `app/robots.ts`, and `app/sitemap.ts` — metadata and SEO changes made in this pass.


## Closure sequence update — 18 August 2026

The owner elected not to pay for Supabase Pro. The dashboard confirmed that leaked-password protection is available only on Pro or higher, so no upgrade, purchase, or setting change was performed. This item is now recorded as an accepted plan limitation, not as a silently passed security control.

A read-only Supabase check found no existing development branches for project `fpcdaiyktnoiwaulbhcn`. The official branch cost estimate was `0.01344 USD/hour`; no branch was created. The six runtime Academy A/B fixture variables were absent from the environment, so no production records or credentials were invented. The local safe test run completed with 3 test files passed and 1 skipped, for 44 passed and 9 skipped tests. The skipped suite remains the runtime cross-tenant test.

The launch decision therefore remains **Still Blocked**, with the following revised classification: leaked-password protection is **Accepted Limitation / Not Applicable without paid plan**, while tenant isolation, physical QR, file-upload runtime behavior, and consent audit trail remain genuine evidence gaps.


## Full review addendum — 18 Aug 2026

### Verified changes in this review

| Area | Result | Evidence |
|---|---|---|
| Push subscription API | Fixed | `app/api/push/subscribe/route.ts` now calls `loadCurrentUser()` and rebinds request context for POST/DELETE. |
| Push send API | Fixed and tightened | `app/api/push/send/route.ts` now loads the signed session per request and returns 403 to roles outside ADMIN/TEACHER/SUPER_ADMIN. |
| WhatsApp diagnostic endpoint | Fixed session handling; live send remains gated | `app/api/whatsapp/test/route.ts` now loads the session per request, requires ADMIN, and still requires `WHATSAPP_MODE=live` plus `WHATSAPP_ALLOW_TEST_SEND=true`. No message was sent. |
| Static quality gates | Pass | `pnpm lint` passed; `pnpm build` passed. |
| Local automated tests | Pass with known skips | 44 passed; 9 skipped in `tests/cross-tenant-route.test.ts` because no safe Academy A/B fixtures exist. |

### Newly confirmed gaps

1. **Upload size mismatch — High.** `next.config.js` allows a 500MB Server Action body, but `app/actions/upload.ts` rejects any file over 10MB before storage/quota evaluation. This means “large file” readiness is not proven and the application does not currently honor the advertised 500MB transport limit. A product decision is required for the intended per-file limit; no production behavior was changed during this review.

2. **Parental consent audit trail — Critical/Compliance.** `services/students.ts` persists `consent_given` and hardcodes `consent_version: "v1"`, but the create path does not persist `consent_at`, `consent_by`, or an immutable policy-acceptance event containing actor, subject, version, timestamp, and source. This remains blocked pending policy/legal definition and schema/API implementation.

3. **Runtime tenant isolation — Critical, evidence unavailable.** Static tests pass, but the cross-tenant runtime suite remains skipped because no separate Academy A/B fixtures or non-production branch is available. No production rows were created.

4. **Physical QR verification — Critical, evidence unavailable.** The teacher check-in route contains explicit rate limiting, selected-group scope, duplicate prevention, and a 30-minute group cookie, but a real-device scan/refresh/offline test was not performed in this review.

### Current decision

The application remains **Still Blocked for unrestricted public launch**. The code-level API fixes above are not a substitute for runtime tenant, QR, upload-isolation, consent, and manual configuration evidence.

### Safety boundaries observed

No production records were created, modified, or deleted. No real email or WhatsApp message was sent. No paid Supabase branch or plan was created.
