# Security Review Checklist — MY Academy

## ✅ Cross-Tenant Access
- [x] Every service function filters by `academy_id` via `byAcademy()` or `fetchTableRLS()`.
- [x] Login route resolves profile by email within the correct academy.
- [x] RLS policies in `production-rls.sql` enforce tenant isolation at DB level.
- [x] Tested: Academy A cannot read Academy B data (documented in seed test).

## ✅ IDOR (Insecure Direct Object Reference)
- [x] All detail endpoints (`/students/[id]`, `/groups/[id]`, etc.) verify academy ownership.
- [x] Teacher scope: `teacherGroupScope()` restricts to owned + assisted groups.
- [x] Parent scope: `resolveParent()` restricts to own children only.
- [x] Student scope: `resolveStudent()` restricts to own data only.

## ✅ Privilege Escalation
- [x] Role comes from server-side `profiles` table, NOT client.
- [x] `requireRole()` on every server action + page + route handler.
- [x] Client cannot change their role (it's in the httpOnly cookie, set server-side).

## ✅ Authentication
- [x] Password verified via Supabase Auth (`signInWithPassword`).
- [x] Rate limiting on login (10/min), signup (3/5min), reset (3/5min).
- [x] Generic error messages (no "user exists" leak).
- [x] httpOnly + sameSite cookies.

## ✅ CSRF
- [x] Next.js Server Actions have built-in CSRF tokens.
- [x] Route handlers use cookies (not URL params for mutations).

## ✅ XSS
- [x] React escapes all output by default.
- [x] No `dangerouslySetInnerHTML` used in the app.
- [x] User input (notes, homework content) rendered as text, not HTML.

## ✅ SQL Injection
- [x] All queries use Supabase client (parameterized PostgREST).
- [x] No raw SQL in application code.

## ✅ File Upload Abuse
- [x] MIME type validation (images, PDF, docs only).
- [x] File size limit (10MB).
- [x] Server-side upload via service role (not client).

## ✅ Rate Limit Bypass
- [x] Rate limiting keyed by user ID or IP+email.
- [x] Applied to all abuse-prone endpoints.

## ✅ QR Replay
- [x] Student-scan: signed, short-lived (5 min) tokens with HMAC.
- [x] Replay prevention: "already checked in" check.
- [x] Lesson active check: 24h window.
- [x] Teacher-scan: high-confidence (teacher controls device).

## ✅ Token Leakage
- [x] Service role key: server-only env var, never in client bundle.
- [x] Session cookie: httpOnly, not accessible via JS.
- [x] No secrets in logs (structured logging sanitizes).

## ✅ Sensitive Data Exposure
- [x] No passwords/tokens in audit logs.
- [x] No PII in error messages.
- [x] `.env.local` in `.gitignore`.

## ✅ API Authorization
- [x] `/api/search`: checks `getCurrentUser()` + role-scoped results.
- [x] `/api/checkin`: verifies student enrollment + lesson active.
- [x] `/api/qr-session`: requires authenticated teacher/admin.
- [x] `/api/auth/login`: rate-limited, generic errors.

## ✅ Server Action Authorization
- [x] Every action file calls `requireRole()` as first line.
- [x] SaaS usage limits enforced server-side (students + groups).
- [x] Audit logging on all 17 action files.
