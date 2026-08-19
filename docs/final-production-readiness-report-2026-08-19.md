# MYAcademy — Final Production Readiness Update

**Date:** 19 August 2026  
**Scope:** Closure work for the eight minimal launch blockers in the Next.js/Supabase/Vercel multi-tenant SaaS.  
**Author:** Manus AI

> **Release decision: STILL BLOCKED.** The mandatory parental-consent code path and the platform subscriptions tab are implemented, migrated, tested locally, committed, pushed, and deployed. This does not close the remaining runtime-evidence gates for tenant isolation, physical-device QR attendance, file uploads, payment sandbox/webhooks, WhatsApp sandbox delivery, or the owner’s manual configuration checks.

## Executive summary

The closure commit is **`cf42075`**, titled `feat: enforce parental consent and add platform subscriptions`. It was pushed to the project repository and Vercel created production deployment **`dpl_AAcPD9optUbWtekJbSCFW9TN4kaE`**, associated with Git commit `cf420752db7864bc8f553879f0987b65efb36ae1`, in state **READY**. The deployment aliases include [`https://my-academy-eg.vercel.app`](https://my-academy-eg.vercel.app).

A new production database migration created `public.parent_consent_requests`, including one-time hashed tokens, academy and student scope, expiry, used-at state, consent version, approving email, approving profile, creator, timestamps, indexes, and an authenticated-admin read policy. The migration initially exposed an incorrect schema reference; this was corrected to the existing `private.auth_has_academy_role` helper before successful application. No student records were changed by the migration.

The public production smoke checks returned HTTP 200 for `/api/health` and `/consent/pending`. The health response reported `app: ok`, `qr: ok`, and `db: ok`; the observed sample latency was 638 ms and is not sufficient by itself to diagnose a database performance issue. Unauthenticated access to `/platform?tab=billing` redirected to `/login`, which is the expected protected-route behavior; an authenticated owner check is still required to prove the subscriptions table renders for the correct role.

## Closure work completed

| Area | Result | Evidence |
|---|---|---|
| Mandatory consent state for CSV import | **Implemented** | `app/actions/import.ts` now creates students with `status: "INACTIVE"`, `consent_given: false`, and null consent audit fields. |
| Mandatory consent state for direct student accounts | **Implemented** | `app/actions/direct-accounts.ts` leaves student profiles and memberships inactive/invited until approval; non-student roles retain their existing activation behavior. |
| Mandatory consent state for invite acceptance | **Implemented** | `app/actions/invites.ts` creates the student as inactive, keeps the student membership `INVITED`, and routes the student to a waiting page instead of signing them in as active. |
| Consent request creation | **Implemented** | Admin-only Server Action generates a random one-time token, stores only its SHA-256 hash, applies a 14-day expiry, and returns a link for manual QA copying. No email or WhatsApp message is sent. |
| Consent approval | **Implemented** | `/consent/[token]` validates the token and parent email, activates the student, sets `consent_given`, `consent_at`, `consent_version`, closes the token, activates an invited student membership, and writes an audit event. |
| Consent audit identity | **Implemented with guest-parent support** | When the parent has a linked profile, `consent_by` and `approved_by_profile_id` use that profile. For a guest parent, the verified `approved_by_email` and request/student linkage remain the recorded actor evidence. |
| Platform subscriptions tab | **Implemented** | `/platform?tab=billing` now renders a real subscriptions view with academy, plan, status, renewal date, and provider; the default platform dashboard remains available. |
| Help/navigation links | **Updated** | Owner-facing links now point to the platform subscriptions tab rather than the generic billing page. |
| Production schema | **Applied** | `public.parent_consent_requests` exists in production with the required foreign keys and indexes. |
| Local quality gates | **PASS** | `pnpm lint`, `pnpm build`, and `pnpm vitest run` completed successfully. |

## Validation evidence

| Check | Actual result | Interpretation |
|---|---|---|
| ESLint | **PASS** | `pnpm lint` exited successfully. |
| Production build | **PASS** | `pnpm build` compiled TypeScript and generated the consent and platform routes. |
| Vitest | **48 passed, 9 skipped** | Three test files passed; the nine skipped tests are the runtime cross-tenant route cases requiring safe Academy A/B fixtures. |
| Supabase migration | **PASS** | The corrected migration applied successfully to project `fpcdaiyktnoiwaulbhcn`; schema metadata includes `parent_consent_requests`. |
| Vercel deployment | **READY** | Deployment `dpl_AAcPD9optUbWtekJbSCFW9TN4kaE`, target `production`, commit `cf42075`. |
| Production health | **PASS** | `GET /api/health` returned HTTP 200 with `app`, `qr`, and `db` all `ok`. |
| Consent pending route | **PASS** | `GET /consent/pending` returned HTTP 200 with Arabic RTL markup. |
| Protected subscriptions route | **PASS for protection only** | Unauthenticated request redirected to `/login`; owner-authenticated rendering still needs manual evidence. |
| Outbound communications | **Not sent** | No real email or WhatsApp message was sent during this closure work. |
| Production student data | **Unchanged by migration** | The migration created schema objects only; no student status was bulk-updated. |

## Status of the eight minimal launch blockers

| # | Blocker | Current status | What remains before closure |
|---:|---|---|---|
| 1 | Authenticated role matrix | **Partial — Still Blocked** | Repeat the owner, admin, teacher, assistant, parent, and student workflow matrix against linked synthetic records, including allowed and denied actions. |
| 2 | Academy A versus Academy B isolation | **Still Blocked — Critical** | Execute the skipped runtime route suite with safe A/B credentials and records across groups, students, attendance, notes, grades, homework, payments, messages, and files. |
| 3 | QR attendance on a real phone | **Still Blocked — Critical** | User must test first scan, duplicate scan, wrong group/time, refresh, offline/retry, and RTL behavior on a physical phone. |
| 4 | 500 MB file upload and isolation | **Code implemented; runtime still blocked** | Test valid, invalid, near-limit, interrupted/retry, lesson association, signed download, and cross-tenant denial using synthetic files. The 500 MB limit is enforced by the signed-upload intent; bytes do not pass through the Vercel Server Action. |
| 5 | Arabic/English, RTL/LTR, and 12-hour time | **Partial — Still Blocked** | Verify all private forms, toasts, dialogs, errors, schedule fields, attendance, upload, and billing views without a page reload. |
| 6 | Payment gateway and webhook | **Still Blocked** | Run the owner-only Stripe/Paymob sandbox flow from plan selection through webhook activation and record the subscription transition plus webhook event ID. Teacher checkout must remain rejected. |
| 7 | WhatsApp sandbox and delivery webhook | **Still Blocked** | Send only to the Meta test number, then record the `wamid` and delivery webhook. No production recipient may be used. |
| 8 | Parental consent and legal audit trail | **Code and schema implemented; runtime/legal evidence still required** | Execute one synthetic import/invite/direct-account case through the generated consent link, verify inactive-before/active-after states and audit fields, and confirm policy wording/version and retention with qualified legal review. |

## Important implementation notes

The consent flow is deliberately **not** an automatic acceptance mechanism. Import, invite, and direct-account creation leave the student inactive and do not fabricate `consent_at`, `consent_by`, or `consent_version`. An administrator must create a consent link, and a parent must open it and provide the matching email before the student is activated. The link is one-time, hash-backed, expires after 14 days, and is marked used only after the student update succeeds.

The migration uses the existing private authorization helper rather than exposing a new public helper. The first application attempt failed because the migration referenced `public.auth_has_academy_role`; inspection of production policies showed the live helper is `private.auth_has_academy_role`. The migration was corrected and then applied successfully. This correction is included in the repository migration file.

The platform subscriptions tab is deployed, but its data view should not be treated as payment evidence. A visible subscription row proves only the read/display path. The payment blocker remains open until a sandbox checkout and verified webhook event activate a subscription automatically.

## Remaining owner actions

The owner must manually confirm that Vercel production uses the Supabase URL for project `fpcdaiyktnoiwaulbhcn` and a public anon/publishable key rather than a service-role key. No key was read, copied, or changed during this work. Leaked-password protection remains subject to the previously accepted Supabase plan limitation and should not be marked as passed unless the owner confirms the relevant dashboard state.

The owner must also run the physical QR test and provide only non-sensitive outcomes, such as pass/fail, HTTP result, and attendance row count. Passwords must continue to be entered by the owner through the browser; they were not requested, logged, or included in this report.

## Release decision

**MYAcademy is not yet Ready for an unrestricted public launch.** The current release is technically buildable and deployed, and the previously incomplete consent and subscriptions code paths are now present. The release remains blocked because several high-impact behaviors still lack runtime evidence and because the payment, WhatsApp, physical QR, owner-authenticated subscriptions, and manual configuration checks have not been completed.

## References

[1]: `cf42075` — repository commit `feat: enforce parental consent and add platform subscriptions`.

[2]: `supabase/20260819_parent_consent_requests.sql` — production migration source for one-time consent requests.

[3]: `app/actions/parent-consent.ts` — consent-link generation, approval, activation, and audit logic.

[4]: `app/actions/import.ts`, `app/actions/invites.ts`, and `app/actions/direct-accounts.ts` — pending-consent creation paths.

[5]: `app/(app)/platform/page.tsx` — platform dashboard and subscriptions tab.

[6]: `tests/cross-tenant-route.test.ts` — runtime Academy A/B isolation harness; nine cases remain skipped until safe fixtures are supplied.

[7]: [`https://my-academy-eg.vercel.app`](https://my-academy-eg.vercel.app) — production deployment alias.

[8]: [`https://my-academy-eg.vercel.app/api/health`](https://my-academy-eg.vercel.app/api/health) — production health endpoint checked on 19 August 2026.
