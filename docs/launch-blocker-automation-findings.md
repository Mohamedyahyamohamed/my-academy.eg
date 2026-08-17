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


## Production interactive follow-up — attendance after commit 20791af

- Production URL: https://my-academy-eg.vercel.app/attendance?group=5315369f-314c-46ae-b9ba-9cf0396a1348
- Authenticated session: MYAcademy Test Owner.
- After deployment `dpl_8pEBd9pKL1gDpXidCbSMZyriwAAH` (commit `20791af`, READY, production), the group selector showed `MYAcademy QA Group 01` and the lesson selector showed 12 lessons. This confirms the owner/admin group and lesson loading regression is fixed.
- Direct lesson URL tested: lesson `2a12796a-7553-46c1-8c5a-dea6bc573261`.
- Result: page displayed `لا يوجد طلاب في هذه المجموعة` / `No students in this group`. No attendance save was attempted. QR/attendance end-to-end remains **Blocked** pending verification that the selected QA group has `group_students` memberships and that the attendance page hydrates them correctly when memberships exist.
- No production records were changed during this test.

Source: My Browser production page, captured 2026-08-18, URL above.


## Teacher role smoke test — production, 18 August 2026

- Login succeeded for `mohamedworkout687@gmail.com`; the session identified the user as `MYAcademy Test Teacher`.
- `/dashboard` redirected to `/teacher` and rendered teacher-only navigation: dashboard, groups, lessons, attendance, homework, educational content, grades, students, messages, and support.
- Teacher dashboard showed 1 group, 0 students, 6 upcoming lessons, and 0% attendance.
- `/platform` redirected to `/teacher`; no platform-admin content was exposed.
- `/payments` redirected to `/teacher`; no payment data was exposed.
- `/groups/5315369f-314c-46ae-b9ba-9cf0396a1348` opened successfully for the teacher because the group is assigned to `MYAcademy Test Teacher`. It showed 12 lessons and 0 registered students.
- This confirms the tested teacher role boundary for the sampled routes. Full role matrix remains incomplete until Parent, Student, and Assistant sessions are tested.
- No production data was changed.


## Role mapping discrepancy — production

The account `mohamedyahyamohamed15@gmail.com`, selected from the previously supplied QA list for the Parent test, authenticated successfully but production identified it as `MYAcademy Test Assistant`. The dashboard was `/teacher` with zero assigned groups/students. Direct navigation to `/parent` redirected to `/teacher`. This is not an application security bypass; it is a test-fixture role mismatch. The Parent role test must use the correctly provisioned Parent account, currently expected to be the remaining QA address `megoyehei@gmail.com`, subject to confirmation by the displayed profile role after login.


## Parent role smoke test — production, 18 August 2026

- Login succeeded for `megoyehei@gmail.com`; production identified the account as `MYAcademy Test Parent` and routed `/dashboard` to `/parent`.
- Parent navigation exposed: dashboard, children, content progress, attendance, homework, grades, payments, messages, notifications, and support.
- The account correctly displayed that no children are currently linked; therefore no child records, attendance, grades, or payment data were exposed.
- Direct navigation to `/teacher` redirected to `/parent`; no teacher groups or students were exposed.
- Direct navigation to `/payments` also remained in `/parent` and displayed only the no-linked-children state; no unrelated payment data was exposed.
- Parent role boundary passed for the sampled routes. Student and Assistant role sessions remain to be tested.
- No production data was changed.


## Student role smoke test — production, 18 August 2026

- Login succeeded for `2202893@student.eelu.edu.eg`; production identified `MYAcademy Test Student 1` and routed `/dashboard` to `/student`.
- Student navigation exposed only student-facing areas: classes, lessons, homework, educational content, grades, progress, notifications, and support.
- The account displayed `الملف غير مرتبط` / `Account not linked to a student record`; no class, grade, attendance, or content records were exposed.
- Direct navigation to `/teacher` redirected to `/student`; no teacher groups, students, or attendance-management content was exposed.
- Student role boundary passed for the sampled routes. The unlinked fixture blocks deeper functional testing of classes, lessons, grades, and homework until a student record is linked.
- No production data was changed.


## Cross-tenant harness execution — 18 August 2026

Command executed: `pnpm vitest run tests/cross-tenant-route.test.ts --reporter=verbose`.

Result: 1 test file skipped and 9 test cases skipped. The skip is intentional because `MYACADEMY_E2E_A_EMAIL`, `MYACADEMY_E2E_A_PASSWORD`, `MYACADEMY_E2E_B_EMAIL`, `MYACADEMY_E2E_B_PASSWORD`, `MYACADEMY_E2E_B_STUDENT_ID`, and `MYACADEMY_E2E_B_GROUP_ID` were not supplied. No false Pass was reported. The harness contains control, student, group, search, export, authentication, and Academy B existence checks, but a real Academy A/B fixture is still required for a conclusive isolation result.


## RLS schema inspection — production

A read-only inspection of `pg_class` confirmed `relrowsecurity = true` for all sampled sensitive tables: `academies`, `academy_memberships`, `attendance`, `billing_events`, `files`, `grades`, `groups`, `homework`, `lessons`, `messages`, `notes`, `payments`, and `students`. `relforcerowsecurity` is false, which is normal for application-owner/service-role operations but means the runtime cross-tenant behavior must still be proven with authenticated Academy A and Academy B fixtures. The policy inspection found scoped read policies and role-specific write policies for the sampled tables. No DDL or data mutation was performed.


## SECURITY DEFINER helper privileges — production

The read-only privilege inspection found the sampled `auth_*` helper functions in the `private` schema. They have `EXECUTE` for `authenticated`, while no `PUBLIC` or `anon` grants were returned. This matches the current design in which authenticated requests may evaluate RLS helpers, but anonymous clients cannot call them directly. No permission changes were made.


## Localization, time, and upload code inspection — production candidate

The code inspection found the central date/time helpers using `Intl.DateTimeFormat` with `hour12: true`, and the client language switch setting `document.documentElement.dir` to `rtl` for Arabic and `ltr` for English. Upload/import components expose explicit accepted extensions, including CSV import; the previously implemented upload validation remains the code-level control for allowed types and the 500MB limit. This is a code-level Pass only. Full no-reload language switching, invalid-file rejection, retry behavior, large-file upload/download, and QR camera behavior still require interactive browser/phone evidence.


## Interactive localization smoke test — Student production session

On `/student`, the Arabic interface showed RTL navigation and an English language toggle. Clicking the toggle changed the navigation labels, search placeholder, and sidebar layout to English/LTR without a visible page reload. The account remained on the same route and session. The content card still displayed Arabic text after the toggle, so full localization coverage is not yet proven; this is a partial Pass for the shell/navigation and a follow-up item for page-body translations.


## Production HTTP verification — 18 August 2026

A direct HTTP check returned `GET /api/health` → `200` with `status: healthy` and `app`, `qr`, and `db` all `ok`; reported latency was 217ms. An unauthenticated `GET /api/search?q=test` returned `401`, confirming the search route does not disclose results without an authenticated session.


## QR duplicate protection — database evidence

The production index inspection confirmed `attendance_lesson_id_student_id_key` as a unique index on `(lesson_id, student_id)`, plus indexes on `lesson_id` and `student_id`. Therefore, duplicate attendance for the same student and lesson is protected at the database layer even under concurrent requests. A real phone scan remains required to verify the user-facing duplicate response and retry behavior.


## Large content upload configuration

The production candidate's `next.config.js` explicitly sets `experimental.serverActions.bodySizeLimit` to `500mb`, matching the lesson-content action's 500MB validation. The generic homework attachment action intentionally remains capped at 10MB. This distinction should be documented in the UI and launch checklist: 500MB applies to teacher lesson content, while homework submissions are limited to 10MB. No configuration change was made during the audit.


## Production security headers

`HEAD /` returned HTTP 200 with `strict-transport-security: max-age=63072000; includeSubDomains; preload`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `permissions-policy: camera=(self), microphone=(), geolocation=()`, and `referrer-policy: strict-origin-when-cross-origin`. No Content-Security-Policy header was observed in this response; this is a medium hardening recommendation rather than a confirmed launch blocker, provided no third-party script policy requirement exists.


## Final local verification

The current repository passed `pnpm lint` and `pnpm build` with exit status 0. The build completed the App Router route inventory, including protected group, attendance-related, teacher content, parent, student, payments, and platform routes. No TypeScript/build failure was observed.
