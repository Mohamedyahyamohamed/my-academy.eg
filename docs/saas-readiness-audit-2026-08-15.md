# SaaS Readiness Audit — 2026-08-15

## Production and repository observations

- Production deployment for `my-academy-eg` is currently ready on Vercel after the educational content release.
- Full Playwright production suite previously passed: 62/62 tests.
- The repository includes a protected Vercel Cron endpoint at `/api/cron/billing-notifications` scheduled daily at `0 6 * * *` in `vercel.json`.
- The billing service uses Stripe and Paymob checkout flows and stores verified provider events idempotently in `billing_events`.
- Historical Vercel runtime errors included `Academy data is unavailable for the active session`, Supabase Auth rate limiting, missing academy context, and Resend testing-domain restrictions. A subsequent one-hour check reported no new runtime errors.

## Supabase security advisor findings

Project: `fpcdaiyktnoiwaulbhcn`

1. `public.billing_events` has RLS enabled but no RLS policies. This is currently an informational warning, and the intended design is server-only writes/reads, but it should be explicitly documented and verified so no client path depends on the table.
2. Multiple `SECURITY DEFINER` helper functions in the exposed `public` schema are executable by the `authenticated` role, including `auth_academy_id`, `auth_can_manage_group`, `auth_can_manage_student`, `auth_can_read_group`, `auth_can_read_student`, `auth_has_academy_role`, `auth_is_active_member`, `auth_membership_role`, `auth_parent_id`, and `auth_profile_id`. Supabase recommends revoking authenticated execute or moving them out of the exposed API schema when direct client execution is not intentional.
3. The remediation reference for the security-definer warning is https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable.
4. The remediation reference for the no-policy RLS warning is https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.

## Immediate SaaS priority candidates

- Verify and harden exposed SECURITY DEFINER function privileges without breaking server-side RLS policies.
- Confirm production payment provider webhook configuration and run a controlled webhook/idempotency test.
- Validate that `CRON_SECRET` is present in Vercel Production and that the daily billing notification cron is executing.
- Add or verify database performance indexes and monitor slow queries.
- Resolve or explicitly document the historical academy-context and email-testing errors before opening the platform to paying tenants.

## Current Vercel runtime errors — last 24 hours

The current Vercel production error aggregation shows five groups:

| Error | Count | Routes | Assessment |
|---|---:|---|---|
| `Academy data is unavailable for the active session.` | 17 | `/onboarding`, `/reports`, `/dashboard`, `/teacher` and RSC variants | P1 reliability issue. The app is throwing on requests where an authenticated session has no resolved academy context; onboarding should be an allowed recovery path rather than a hard exception. |
| Supabase Auth `Request rate limit reached` | 8 | `/dashboard` | P1 operational issue. Could be caused by repeated auth/profile lookups or a test burst; needs backoff and request deduplication, plus monitoring. |
| `Missing authenticated academy context.` | 5 | `/reports`, `/onboarding` | P1 onboarding/session issue. The route needs an explicit no-academy state and redirect or guided setup. |
| Resend testing-domain restriction | 3 | `/settings`, `/signup` | P0 before onboarding real tenants. A verified sending domain and production `EMAIL_FROM` are required. |
| Supabase password reset email rate limit | 2 | `/forgot-password` | P1 UX/operations issue. Add user-facing cooldown and avoid repeated provider calls; verify production auth email configuration. |

The newest listed errors are dated 2026-08-14 and are associated with earlier deployments, while the content deployment remained READY. They are still important because they identify flows that can fail for real tenants during onboarding or account recovery.

## Performance advisor observations

Supabase performance advisors report many unindexed foreign keys, including newly added `content_files.owner_id`, as well as existing academy, billing, exam, file, homework, invitation, lesson, and other relationships. These are informational rather than immediate failures, but indexes should be added in a reviewed migration before tenant volume grows.

## Changes implemented in this audit

- Added server-side tenant hydration for legacy signed sessions that lack `academy_id`; the academy is resolved only from the authenticated profile row and fails closed when the profile is missing, disabled, or unassigned.
- Added a safe recovery path in the authenticated app layout: stale or missing academy context clears the session and redirects to login instead of throwing an unhandled runtime exception or risking cross-tenant fallback.
- `npm run lint` passes with 0 errors and 4 pre-existing warnings; `NEXT_TELEMETRY_DISABLED=1 npm run build` passes with TypeScript compilation and all routes generated successfully.

## Remaining launch blockers

- Resend is still in testing mode; a verified production sending domain and `EMAIL_FROM` must be configured before invitations, signup, suspension, and password-reset emails can reliably reach tenant users.
- Payment webhooks still require a controlled production test for Stripe and Paymob, including signature verification, duplicate-event replay, successful payment, failure, cancellation, and suspension transitions.
- `CRON_SECRET` and the daily billing cron must be verified in Vercel Production, including an observable execution log and alert on failure.
- Supabase SECURITY DEFINER helpers should be moved out of the exposed API schema or otherwise hardened after confirming the RLS execution model in a staging project; blindly revoking authenticated execution could break policies.
- Add reviewed indexes for high-volume foreign keys and establish slow-query/error monitoring before onboarding a significant number of tenants.
- Add rate limiting/cooldowns for login, password reset, signup, invitations, and webhook endpoints, with user-facing retry guidance for provider 429 responses.
- Establish automated backups/restore drills, uptime/error alerts, and a support/admin audit trail for tenant suspension, plan changes, and destructive operations.

## Readiness position

The application is functionally deployable for controlled pilots, but it is not yet operationally ready for unrestricted paid-tenant scale until email delivery, webhook/cron verification, rate limiting, monitoring, and backup/restore procedures are completed.
