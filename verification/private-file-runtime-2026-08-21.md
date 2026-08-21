## Reverse cross-tenant runtime denial — 2026-08-21

While authenticated as the Academy A teacher `mohamedworkout687@gmail.com`, opening the Academy B content-file endpoint for file ID `395a8e30-44e8-437f-aa9c-2292acdfaf8c` returned `{"error":"File not found"}`. The supplied screenshot confirms no PDF content, storage path, signed URL, or metadata was exposed. Result: **A → B DENIED**.

## Production smoke and unauthenticated denial — 2026-08-21

The deployed production endpoint returned `/api/health` HTTP 200 with `app=ok`, `qr=ok`, `db=ok`, and measured latency 176 ms. `/status` returned HTTP 200 and rendered Arabic RTL markup. Unauthenticated requests to both the Academy A file endpoint `27817aa4-3051-4ed7-8201-976f9b418a4e` and the Academy B file endpoint `395a8e30-44e8-437f-aa9c-2292acdfaf8c` returned HTTP 401 with `{"error":"Unauthorized"}` and no binary body.

## Release verification after repository synchronization — 2026-08-21

- Release commit `68e4556` deployed to Vercel production as deployment `dpl_9eZLkH9vV4tcXyAy8n5cjnXTmYhr`.
- Vercel state: `READY`.
- Production deployment URL: `https://my-academy-218pjtxqa-mohamed-yahya.vercel.app`.
- Production alias smoke target: `https://my-academy-eg.vercel.app`.
- Unauthenticated request to `GET /api/homework/files/00000000-0000-0000-0000-000000000000` returned HTTP `401` with `x-matched-path: /api/homework/files/[fileId]` on 2026-08-21 13:47:54 UTC.
- Local gates after the hotfix: TypeScript passed; Vitest passed (`115 passed`, `11 test files`); Next.js production build passed and listed `/api/homework/files/[fileId]`.

## Remaining operational evidence

An authenticated student upload and submission is still required to verify the complete production chain: upload to the private `homework` bucket, `files` registry row, `homework_submissions.file_id` binding, and authenticated download returning binary content.

## 2026-08-21 — Homework creation test and corrective fix

- The first synthetic assignment attempt exposed a separate Server Action context defect: the teacher page displayed correctly, but `createHomeworkAction` returned a production toast with React minified error 441. Vercel runtime logs grouped the underlying error as `You are not allowed to create homework.` on `/homework`.
- Root cause: `requireScopedRole()` had already authenticated and returned the teacher, while `HomeworkService.createHomework()` re-read `getCurrentUser()` after an awaited boundary; the request context could be empty in that Server Action path.
- Fix: `createHomeworkAction` now passes its authenticated `SessionUser` explicitly to `HomeworkService.createHomework()`, which prefers that argument and retains the existing request-context fallback for other callers.
- Local verification after the fix: `pnpm exec tsc --noEmit` passed; `pnpm exec vitest run` passed with 11 test files and 115 tests; `pnpm build` passed and included `/api/homework/files/[fileId]`.

### Acceptance status

`NOT CLOSED` — anonymous rejection and cross-tenant content-file evidence exist, but an authenticated production homework submission with a newly created `file_id` and successful private download still must be captured.

## 2026-08-21 — Corrective release

- Pending deployment: explicit authenticated-user propagation for homework creation, with no changes to password handling, outbound messaging, or non-test production data.
- Authenticated homework creation: pending retry after deployment.
- Authenticated homework upload/download: pending student evidence.

[2026-08-21 14:01 UTC] Local verification after explicit-auth context fix: TypeScript passed; Vitest 11 files / 115 tests passed; production build passed.

[2026-08-21 14:01 UTC] Vercel runtime error diagnosis: the prior create attempt failed with `You are not allowed to create homework.` because the service re-read `getCurrentUser()` after an awaited server-action boundary; the corrective code passes the authenticated `SessionUser` explicitly.
