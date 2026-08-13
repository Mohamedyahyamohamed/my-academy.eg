# SaaS Discovery Notes

_Date: 2026-08-13 (user timezone GMT+3)_

## Connected production services

| Service | Identified resource | Status |
|---|---|---|
| GitHub | `Mohamedyahyamohamed/my-academy.eg` | Accessible; `main` is the production branch. |
| Vercel | Project `my-academy-eg` (`prj_OAJ78KzRhDjdNah4p3TMbLvPQsKH`) in team `mohamed-yahya` | Latest production deployment is `READY`; domains include `my-academy-eg.vercel.app`. |
| Supabase | `mySAAS` (`fpcdaiyktnoiwaulbhcn`, eu-west-1) | `ACTIVE_HEALTHY`; identified as the SaaS database from its multi-academy tables. |

## Current database state

The `mySAAS` project already contains tenant-scoped tables (`academies`, `profiles`, `teachers`, `parents`, `students`, groups, lessons, attendance, payments, grading, homework, notifications, audit logs, subscriptions and plans). RLS is enabled on listed public tables. Current data is sparse in operational tables: `lessons`, `attendance`, `grades`, `homework`, notifications and messages have no rows, while the database holds 4 academies, 62 profiles and 4 plans.

The `profiles` table is linked to `auth.users`, carries a single `user_role` enum value (`ADMIN`, `TEACHER`, `PARENT`, `STUDENT`, `SUPER_ADMIN`), an academy id and active flag. This will need an additive role/membership model to support a person holding multiple scoped roles safely.

## Security baseline and remediation status

The initial review identified missing tenant policies, mutable function search paths, and publicly executable `SECURITY DEFINER` helpers. The following remediation has now been applied to the connected `mySAAS` production project:

1. The `academy_memberships` model, token-hashed invitations, subscription metadata, and tenant membership helpers were added additively.
2. The legacy RLS policies were replaced by fail-closed, multi-tenant policies covering the operational tables, including messages, assistant assignments, audit records, push subscriptions, QR sessions, payments, assessments, homework, and attendance.
3. `check_grade_bounds` and `touch_updated_at` now use a fixed `public` search path.
4. Internal authorization helpers are no longer executable by `anon`; they remain available only to `authenticated` users so RLS policy evaluation continues to work.

Source: Supabase advisor and SQL verification queries against the connected `mySAAS` project on 2026-08-13.

## Current code state

The codebase is a Next.js application. The legacy unsigned `ma_session` cookie has been replaced with an HMAC-SHA256 signed session envelope, and the login route selects an active academy membership rather than trusting the single legacy profile academy alone. Account-creation paths now pass academy context explicitly, preventing the previous unsafe fallback that could attach a new user to an arbitrary academy. Service-layer checks additionally enforce academy scope and resource ownership for student, attendance, and homework operations.

## Remaining implementation direction

1. Keep production data in the existing `mySAAS` project rather than create a new database.
2. Build the academy-creation and invitation acceptance experiences on top of the membership and invitation foundation.
3. Replace all remaining production fallbacks to demo/local data with explicit error handling and service-role workflows where appropriate.
4. Add subscription-plan management and a payment-provider webhook. The provider credentials and merchant onboarding require owner action.
5. Add final launch documentation for Vercel/Supabase environment variables, email delivery, payment configuration, and domain setup.
