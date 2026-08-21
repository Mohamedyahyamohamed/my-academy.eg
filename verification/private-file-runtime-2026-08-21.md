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

## 2026-08-21 14:35 UTC — Student-side retry after upload-scope fix

- Production deployment for commit `397aaaf` reached Vercel `READY`.
- Authenticated Student 1 session loaded `/student/homework` under academy `MYAcademy Production Audit`.
- The new synthetic assignment `Private File Upload Test — Homework 02` is visible with status `Pending`, due Aug 28, 2026; the older `QA Homework 01 — Fractions` remains `Reviewed`/`Submitted`.
- The student submission dialog is open and exposes `Attach a file (PDF, image, WEBP) up to 10 MB`.
- No private file was created or submitted in this step; upload control interaction remains pending.

Source URL: https://my-academy-eg.vercel.app/student/homework
Evidence capture: `/home/ubuntu/upload/my-academy-eg.vercel.app_student_homework_1787323021612.html`.

## 2026-08-21 — Attachment upload and submission attempt after identity fix

- Student 1 production session remained on `/student/homework` with `Private File Upload Test — Homework 02` in `Pending` state.
- Attachment selection: **PASS**. The UI displayed `File attached` and showed `MYAcademy-homework-submission-test.pdf` inside the submission dialog.
- Submission attempt: Submit was clicked after explicit user confirmation. The modal remained visible and the subsequent snapshot still showed the assignment as `Pending`; no success toast or submitted state was observed. The complete chain therefore remains unverified pending runtime/database inspection.
- No real email, WhatsApp, or non-synthetic production data was used.

## 2026-08-21 — Corrective release retry state

Commit `36fe83d` reached Vercel `READY` as deployment `dpl_BCwu2Qi8PM9xGEX95A3jqGdqKfmu`, and the authenticated Student 1 homework page was reloaded on the new production version. The Homework 02 dialog opened successfully. The browser harness rejected two attempts to target the hidden file input because its element index became stale after the dialog update; this is a harness interaction issue, not an observed application error. The saved HTML confirms the dialog contains one file input accepting `.pdf,.png,.jpg,.jpeg,.webp`.

After the user confirmed the operation, the production Submit button entered a loading state but the dialog remained open in the subsequent snapshot; no success or error toast was visible. Database and runtime-log checks are required to distinguish a completed backend mutation from a still-running or failed Server Action.

The follow-up release `9e15785` reached Vercel `READY` as deployment `dpl_7YTohSPntfeYLZZT5hktA9WUdNGF` and is aliased to `my-academy-eg.vercel.app`. On a fresh Student 1 session, selecting the synthetic PDF again left the dialog in `Uploading…` after the subsequent page snapshot; no `File attached` confirmation appeared. The production upload path is therefore still not operationally closed and requires backend diagnosis.
After the latest release, the private PDF upload completed and displayed as attached. Following explicit user confirmation, the Submit action now surfaces an application error instead of hanging: `Could not submit homework: Minified React error #441`. The dialog remains open and the Homework 02 card remains `Pending`; this is a runtime submission failure requiring a Server Action boundary diagnosis, not evidence of a successful submission.

The file registry contains a newly created private row for this attempt (`MYAcademy-homework-submission-test.pdf`, 2,042 bytes) under the Academy A / Homework 02 / Student 1 path, while the submission row remains pending. No cross-tenant or external notification action was performed.
The final corrective release `9bb866c` reached Vercel `READY` as deployment `dpl_BqDzrVSa7VL7HNBmyEzy7z3KSB6i`, aliased to production. A clean Student 1 retry opened Homework 02 and accepted the synthetic PDF; the dialog is currently showing `Uploading…` while the finalization request completes.

The final production submission request committed successfully despite the browser extension timing out while waiting for the UI response. Direct Supabase verification at `2026-08-21 15:30 UTC` shows the existing submission `2573a9d4-19fe-4c34-8f65-be8f0a89ac1a` updated to `SUBMITTED`, with `submitted_at = 2026-08-21 15:29:29.119+00`, `file_id = a8a53aff-0d4e-4b8f-bbf1-096f49f05fd5`, and `file_url = /api/homework/files/a8a53aff-0d4e-4b8f-bbf1-096f49f05fd5`. The linked registry row is a 2,042-byte `application/pdf` at the tenant/homework/student-scoped storage path. This is the first complete production upload-and-submit mutation evidence for BLOCKER 3.

Authenticated download testing was attempted using the Student 1 browser session at `/api/homework/files/a8a53aff-0d4e-4b8f-bbf1-096f49f05fd5`; the browser extension returned HTTP 504 while waiting for the PDF response, and a subsequent `chrome://downloads/` inspection also timed out. This is a browser-harness observation only and does not establish a download failure; the endpoint still needs an independent HTTP-level check with authenticated session evidence.

After reloading production, Student 1’s Homework page visibly shows Homework 02 as `Submitted` and exposes `View attachment`. The click action returned to the same page snapshot, suggesting the link opened a separate browser tab or download target; the database evidence already confirms the file binding. Unauthenticated endpoint testing independently returned HTTP 401 with JSON content type.

## Focused closure inspection — authorization and download route

`getAuthorizedHomeworkFile` performs a live lookup of the file registry constrained by the authenticated user's academy, requires an academy-prefixed storage path, resolves the linked submission/homework/student in the same academy, and then applies role-specific access. Student access is restricted to the linked student's email; parent access is restricted to the linked parent; teacher and limited-assistant access is restricted to the linked group and teacher/assistant mapping. The download route authenticates before any file lookup, returns generic 401/404 responses, creates a 60-second signed URL only after authorization, streams the binary privately, and does not expose the signed URL.
## 2026-08-21 — Academy B private-file submission fixture

The real Academy B student account `mohamedyahya13579+haneen-test@gmail.com` opened the visible `Synthetic Academy B Homework` in `Pending` state after the exact matching synthetic submission row was reset. The student uploaded `MYAcademy-homework-submission-test.pdf` through the production UI and confirmed Submit. Although the browser extension timed out while waiting for the final UI response, direct production database verification at `2026-08-21 16:21:44.062+00` shows submission `d62fa301-d7b3-4a19-a913-9064741d186f` as `SUBMITTED`, linked to file registry ID `8d2a80cf-41f7-4499-857f-48ebaf1845ed`. The file belongs to Academy B `155a078b-df83-43f7-8646-0c3a0156f5b8`, owner/student linkage is preserved, and its storage path is tenant/homework/student scoped: `155a078b-df83-43f7-8646-0c3a0156f5b8/90f33417-de41-4221-810a-68118872f5a1/b58151ad-6bfd-4c2a-a45e-c2d245650baa/cdb66666-4d78-48bb-b04b-e5ee5bb7fdc8.pdf`. This is synthetic data only.
## 2026-08-21 — Academy B authentication retry note

The runtime log query for `GET /api/homework/files/8d2a80cf-41f7-4499-857f-48ebaf1845ed` on production deployment `dpl_DCkqgE79yQfzemTQVABdTG11CkYs` recorded repeated HTTP 401 responses at 16:24:57–16:25:48 UTC. This means the browser request was not authenticated as the Academy B student; it is not evidence of a cross-tenant denial. The browser session subsequently showed the private endpoint with no rendered content. An attempted navigation to `/student/dashboard` returned the app’s 404 page, so the next session check must use the known `/student/homework` route after a verified login. No application data was changed by these GET requests.
## 2026-08-21 — Academy B authenticated private download

After the Haneen Academy B student successfully signed in, production received `GET /api/homework/files/8d2a80cf-41f7-4499-857f-48ebaf1845ed` at `16:30:43 UTC` on deployment `dpl_DCkqgE79yQfzemTQVABdTG11CkYs` and returned HTTP 200. This confirms B → B authenticated retrieval of the synthetic Academy B private attachment. The same endpoint had returned HTTP 401 before the student login was actually established, confirming the earlier failure was an unauthenticated-session artifact rather than an application authorization denial.
## 2026-08-21 — Academy A to Academy B cross-tenant denial

The authenticated Academy A student `2202893@student.eelu.edu.eg` attempted to download the Academy B private file `8d2a80cf-41f7-4499-857f-48ebaf1845ed`. Production runtime logs for deployment `dpl_DCkqgE79yQfzemTQVABdTG11CkYs` show `GET /api/homework/files/8d2a80cf-41f7-4499-857f-48ebaf1845ed` at `16:32:05 UTC` returned HTTP 404. The response body was `{"error":"File not found"}`, confirming that the application correctly denies cross-tenant access and does not leak the existence of the file or its storage metadata to unauthorized tenants. This completes the bidirectional runtime isolation verification.
