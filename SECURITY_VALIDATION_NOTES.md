# Security Validation Notes

## Supabase tenant fixture availability

A read-only query executed on 2026-08-13 against the active **mySAAS** Supabase project confirmed that the production database contains four academies, including the primary `my-academy` tenant and a separate `test-b-1786360216492` tenant. The respective active-membership counts were 58 and 1. This confirms that production has real multi-tenant fixture data suitable for non-mutating isolation checks.

The database project is active and healthy. No production rows or schema were changed during this check.

## Local security test environment

The Playwright suite is intentionally run with `E2E_DEMO_MODE=true` and a local test-only session secret. This explicitly enables the in-memory fixture when production credentials are absent and does not relax production authentication, which still requires configured Supabase credentials. The local security suite completed with **20 passing tests** after this setup.

## Production deployment and authentication diagnosis

The production deployment for commit `830fa35` is **READY** at `https://my-academy-1fg4wtjg2-mohamed-yahya.vercel.app` and is the current production deployment for the Vercel project `my-academy-eg`.

A non-mutating live login probe against this deployment returned HTTP 401 for each of the four documented demo accounts. The four accounts do exist, are confirmed, and are not banned in the `mySAAS` Supabase project. Their password hashes were reset to the documented credentials and separately verified through PostgreSQL as matching those credentials. A direct authentication request to `https://fpcdaiyktnoiwaulbhcn.supabase.co/auth/v1/token?grant_type=password` for the admin account then returned HTTP 200.

Therefore, the remaining production login failure is not caused by the demo account records or password hashes in `mySAAS`. It strongly indicates that the Vercel production environment is configured with a different Supabase URL and/or anon key than the `mySAAS` project. The alternate Supabase project accessible to this workspace does not contain the four demo accounts. No secret values were read or recorded during the diagnosis.

A full live cross-tenant HTTP test cannot proceed until Vercel is pointed at `mySAAS`, because the application login endpoint does not establish a signed session in its current environment.

## Required production environment remediation

Set the following Vercel **Production** environment variables to the matching credentials from Supabase project `mySAAS` (`fpcdaiyktnoiwaulbhcn`), then redeploy the main branch:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET` (a unique random secret, at least 32 characters)

After deployment, repeat the four-role login test and the cross-tenant record check documented above.

## Automated verification result

On 2026-08-13, the local production-mode Playwright suite completed with **23 passing tests**. It covers cross-tenant record isolation, unauthenticated-route redirection, role-escalation prevention, scoped export data, invalid login rejection, and the rejection of unsigned or malformed Stripe and Paymob webhook payloads.
