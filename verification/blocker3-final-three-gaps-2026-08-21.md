# MYAcademy — BLOCKER 3 Final Three Gaps

**Date:** 21 August 2026 UTC

**Production project:** `prj_OAJ78KzRhDjdNah4p3TMbLvPQsKH`

**Production deployment:** `dpl_3xNrtbCSBtJ25NLVDERnjrs8azbV`, status `READY`

## Gap 1 — Real 10MiB+1 upload

The authenticated Student 1 production session opened the synthetic pending homework `Private Upload Limit Boundary — Synthetic` at `/student/homework`. The real attachment control selected `/home/ubuntu/MYAcademy-homework-oversize-10mb.pdf`, measured at exactly **10,485,761 bytes** (10 MiB + 1 byte). The production UI rejected it with **“File size must be 10 MB or less.”**

Production Supabase verification at `2026-08-21T17:05:26Z` showed the synthetic submission remained `PENDING` with `file_id=null`, `file_url=null`, and `submitted_at=null`. No successful Storage object or file-registry record was created by the rejected upload. This is a PASS for the real production UI boundary and no-write behavior.

## Gap 2 — Official Vercel Cron execution

The production code now contains `/api/cron/cleanup-homework-files`, protected by `Authorization: Bearer $CRON_SECRET`, and `vercel.json` schedules it daily at `03:30 UTC`. The cleanup implementation uses a 24-hour grace period, checks exact tenant/homework/student storage paths, skips files linked by `homework_submissions.file_id`, deletes Storage first, and deletes the registry row only after Storage succeeds.

The latest production deployment is `READY` (`dpl_3xNrtbCSBtJ25NLVDERnjrs8azbV`), but a Vercel runtime-log query scoped to the production cleanup route during the last 24 hours returned **No logs found**. Therefore there is currently no evidence that the official scheduler has executed the route. This gap remains **OPEN / OWNER ACTION REQUIRED** until a real scheduler execution log records start, evaluation, counts, errors, and completion.

## Gap 3 — Live Storage failure behavior

The production code contains `/api/cron/cleanup-homework-files/failure-injection`, protected by the same `CRON_SECRET`. It accepts only a supplied synthetic academy/file pair whose path is a valid homework path, whose homework title contains `Failure Injection`, and whose file is unlinked. It injects a Storage deletion error, does not delete the registry row, and returns `registryRetained=true` only when the invariant is verified.

The implementation is covered by automated tests, but no production HTTP response has yet been captured for the fixture-only route. The production failure-injection proof, natural retry proof, and final synthetic-fixture cleanup proof therefore remain **OPEN / OWNER ACTION REQUIRED**.

## Regression checks

The full required commands completed successfully on the current main revision:

- `pnpm exec vitest run`: **130 passed, 14 test files, 0 skipped**.
- `pnpm exec tsc --noEmit`: **PASS**.
- `pnpm run build`: **PASS**; the build includes both cleanup routes.

## Decision

Do **not** mark BLOCKER 3 closed yet. Gap 1 is operationally proven. Gaps 2 and 3 require the real production scheduler/failure-injection evidence described above. No customer data was intentionally selected for the failure probe; the remaining production action must use synthetic fixtures only and must not disclose or transmit any secret.
