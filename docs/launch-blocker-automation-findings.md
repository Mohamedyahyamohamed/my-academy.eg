# MYAcademy — Automated Launch-Blocker Findings

## Phase 1 findings

- The current cross-tenant tests are mostly in-memory filtering assertions; they do not prove authenticated Supabase RLS behavior between two real academies.
- Attendance and QR logic in `services/attendance.ts` validates lesson, group, academy, enrollment, and role, but it still reads the request snapshot for several checks. The durable write uses `persistInsert`; database-level duplicate behavior and real-device flows remain unverified.
- Content access in `services/content.ts` uses academy-scoped `fetchTableRLS` for content rows and has a direct academy-scoped fallback for group lookup. File signed URLs are generated from storage paths after filtering by academy-scoped rows; storage policy and cross-tenant download behavior still need explicit verification.
- The Assistant account is represented as a restricted TEACHER assignment rather than a separate role.
- No production data was changed during this review phase.

## Remaining evidence gaps

- Authenticated Academy A versus Academy B tests on production/staging.
- Real QR first-scan, duplicate, wrong-group/time, refresh, and offline behavior on a phone.
- File upload size/type/retry and cross-tenant download denial.
- Full language switching and 12-hour time coverage.
- Supabase leaked-password setting and exact Vercel environment value require dashboard confirmation.

## Safety constraints

Use synthetic QA data only. Do not send real Email or WhatsApp messages. Do not record passwords or secret values.

_Last updated by Manus AI._

## Full production QA preflight — 18 August 2026

- Working tree is based on `main`, aligned with `origin/main` at commit `ee25263` (`test: make tenant isolation fixtures runtime configurable`).
- Recent production-related commits: `0a2cacd` upload validation, `2cfa6a0` QR time/network fixes, `b5b45be`/`36ec302` scoped assistant provisioning.
- Local uncommitted changes are documentation only: `docs/production-launch-readiness-update.md` modified and `docs/manual-launch-completion-guide.md` untracked. No application source changes are present in the working tree at preflight.
- Available validation scripts are `build`, `start`, and `lint`; no dedicated npm test script is defined. Tenant isolation is run through the configured test harness rather than a package script.
- No production data or configuration was modified during preflight.


## Production QA evidence — 18 August 2026

- `GET https://my-academy-eg.vercel.app/api/health` returned HTTP 200 with JSON status `healthy`; checks were `app: ok`, `qr: ok`, and `db: ok`; reported latency was 387 ms.
- Navigating to `/dashboard` in My Browser opened an already-authenticated Owner session (`MYAcademy Test Owner`) rather than an unauthenticated state. The dashboard rendered Arabic RTL content, owner navigation, quick actions, and live-looking summary cards. Therefore this navigation is not evidence of unauthenticated route protection; a separate signed-out/private-window check is still required.
- The dashboard exposed an English toggle (`EN`), Arabic layout direction, search input, notifications controls, and owner navigation including platform, subscriptions, audit log, support, and privacy.

## Production route inventory — 18 August 2026

- The authenticated dashboard HTML exposed routes: `/platform`, `/billing`, `/audit`, `/support`, `/privacy`, `/reports`, `/students`, `/groups`, `/lessons`, `/attendance`, `/payments`, and individual lesson routes under `/lessons/{uuid}`.
- Existing production QA data was visible: 2 active students, 1 active group, 5 upcoming lesson links, and 0 recorded payments/attendance/grades in the dashboard summary.
- A click on the active-group summary did not navigate because the rendered element was a non-link container; route discovery from saved HTML was used instead. This is a possible UX/navigation defect to verify, not yet classified as a bug.

## Owner student-page evidence — 18 August 2026

- Production `/students` loaded while the Owner session was active and showed search, status/group filters, Excel import, account-management buttons, and add-student controls.
- The page simultaneously displayed `لا يوجد طلاب بعد` / no students, while the dashboard had displayed 2 active students. This is a potentially significant data-consistency or academy-context loading defect and is not yet classified until a second verification path succeeds.
- A follow-up browser view and reload both timed out with HTTP 504 from the browser extension. No data mutation was performed.

## Supabase production diagnostics — 18 August 2026

- Supabase project confirmed: `fpcdaiyktnoiwaulbhcn` (`mySAAS`), status `ACTIVE_HEALTHY`, region `eu-west-1`.
- Security Advisor returned one warning: `auth_leaked_password_protection` — Leaked Password Protection is disabled. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Performance Advisor returned only `INFO` unused-index notices; no performance-level error or warning was observed. These should not block launch by themselves and should not be removed before real traffic validates usage.
- Supabase key inventory contains both an active legacy anon key and an active modern publishable key. The values were not copied into project evidence or user-facing output. Whether Vercel uses the modern key still requires checking the Vercel Production environment variable and redeploy metadata.

## Vercel production diagnostics — 18 August 2026

- Vercel team confirmed: `team_3uWRmEgCHKoT6EFH5K1bUfD1` (`mohamed-yahya`).
- Project confirmed: `my-academy-eg`, project ID `prj_OAJ78KzRhDjdNah4p3TMbLvPQsKH`.
- Current production deployment: `dpl_HJ2J4atDkPh3QgknzRk1KUqauRsA`, commit `ee25263`, state `READY`, aliases include `https://my-academy-eg.vercel.app`.
- Current deployment runtime logs: no error/fatal/warning entries found for the last 24 hours.
- Project-wide grouped runtime errors for the last 24 hours include 7 historical `Missing authenticated academy context` events on `/lessons/new` and `/groups`, all attributed to older deployment `dpl_G5jVV8xKfpV9xBf8SE96YLABgjGp`; and 4 email-send test failures caused by Resend's unverified-domain/testing restriction. These are not evidence that the current deployment is failing, but the affected flows require authenticated interactive verification.

## References

No external sources used; findings are based on the project source and existing test files.

## تحديث التنفيذ — 17 أغسطس 2026

- QR: إصلاح `standardize QR scan time and network errors` منشور Production بحالة READY، commit `2cfa6a0`.
- File upload: تحقق واجهة مسبق من الامتداد والحجم (المسموح: PDF/PNG/JPG/JPEG/WEBP/DOCX/MP4، الحد 500MB) منشور بحالة READY، commit `0a2cacd`.
- Localization/time: helper المركزي يستخدم `hour12: true`، ولم تظهر صيغ وقت مباشرة أخرى في مسارات التطبيق الأساسية أثناء البحث.
- Tenant isolation: route-level test لم يكن قابلًا للتشغيل لأن fixtures/حسابات الاختبار القديمة غير موجودة؛ النتيجة Blocked وليست Pass. لم تُستخدم كتابة مباشرة لتجاوز التطبيق.
- Production evidence: latest upload deployment `dpl_2QzNVvPNNfEfKvuJYZjm8Hd6QRxM` READY; QR deployment `dpl_G7Sbx9MNtPk4iX5f2Fw1Axf5ptyY` READY.
