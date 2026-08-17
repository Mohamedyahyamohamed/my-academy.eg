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

## References

No external sources used; findings are based on the project source and existing test files.
