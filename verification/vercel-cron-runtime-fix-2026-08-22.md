# Vercel Cron runtime-fix inspection — 2026-08-22

## Verified project metadata

- Project: `my-academy-eg`
- Project ID: `prj_OAJ78KzRhDjdNah4p3TMbLvPQsKH`
- Team ID: `team_3uWRmEgCHKoT6EFH5K1bUfD1`
- Framework: Next.js
- Latest production deployment: `dpl_BHx6YZAyj2CtCUAMLX2e4UhUK7Ui`
- Latest deployment state: `READY`
- Latest deployment target: `production`
- Latest deployment URL: `my-academy-jwgsbkg4m-mohamed-yahya.vercel.app`
- Latest deployment commit: `ebd671315690b72a97a55956b382959d0c40ddd5`
- Latest deployment commit message: `docs: record blocker 3 production closure evidence`
- Production branch: `main`
- Repository: `Mohamedyahyamohamed/my-academy.eg`

## Verified repository configuration

`vercel.json` registers:

- `/api/cron/billing-notifications` at `0 6 * * *`
- `/api/cron/cleanup-homework-files` at `30 3 * * *`

The cleanup route currently supports `GET` and requires an `Authorization: Bearer <CRON_SECRET>` header with constant-time comparison. Anonymous requests correctly return 401.

## Current diagnosis status

The project and production deployment are READY and the route/configuration exist. The remaining checks are whether the production deployment has the required Cron configuration and whether Vercel's official Cron invocation supplies the expected authorization header. No conclusion about scheduler success is made from the earlier 401 manual requests.

Source records: Vercel MCP project result `/home/ubuntu/.mcp/tool-results/2026-08-21_22-13-04.121976384_vercel_get_project_3798aea9.json`, deployment list `/home/ubuntu/.mcp/tool-results/2026-08-21_22-13-46.690642073_vercel_list_deployments_260b0be8.json`, repository `/home/ubuntu/my-academy-recovered-alt/vercel.json`, route `/home/ubuntu/my-academy-recovered-alt/app/api/cron/cleanup-homework-files/route.ts`.
## External verification of Vercel Cron behavior

Vercel's official documentation states that Cron Jobs run only on Production deployments, that `CRON_SECRET` is automatically sent as an `Authorization: Bearer ...` header when configured, and that the `x-vercel-cron-schedule` header is available to the route. Vercel's troubleshooting guidance also recommends `export const dynamic = 'force-dynamic'` when logs are not appearing, and says to verify the `crons` property during the build process.

References:

[1] [Vercel — Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

[2] [Vercel — How to Setup Cron Jobs](https://vercel.com/kb/guide/how-to-setup-cron-jobs-on-vercel)

[3] [Vercel — Troubleshooting Vercel Cron Jobs](https://vercel.com/kb/guide/troubleshooting-vercel-cron-jobs)
## Implemented runtime fix

Updated `app/api/cron/cleanup-homework-files/route.ts` to add `dynamic = "force-dynamic"`, preserve constant-time `CRON_SECRET` authorization, and emit safe counters only after authorization: `CRON_START`, `CRON_AUTHORIZED`, `CRON_CANDIDATES`, `CRON_CLEANED`, `CRON_ERRORS`, and `CRON_COMPLETE`. Unauthorized requests log only method and whether the Vercel schedule header exists; no secret, token, password, academy ID, or customer data is logged.

`vercel.json` currently registers `/api/cron/cleanup-homework-files` with schedule `30 3 * * *` alongside the existing billing Cron. The official Vercel documentation confirms that Cron runs only on Production deployments and sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured. It also documents `x-vercel-cron-schedule` and recommends `force-dynamic` when logs do not appear.

## Local validation

- Vitest: 130 passed in 14 files.
- TypeScript: passed.
- ESLint: passed.
- Production build: passed.

## Runtime status

The source fix is ready for a Production deployment. A real scheduled execution still cannot be claimed until Vercel deploys this commit to Production and Logs show an authorized GET with the safe runtime markers. The previously observed GET/POST 401 entries remain unauthorized manual requests and are not Cron proof.
## Production deployment check

Commit `1feb5b1` produced Vercel Production deployment `dpl_8v2AXpRHbGiVUHbXPoSTJTbP4sCS`, state `READY`, with the expected commit message and SHA. A read-only Vercel runtime-log query scoped to that deployment, Production, the last 30 minutes, and `CRON` returned **no logs**. This is expected before the next scheduled window and is not treated as a Cron PASS.

The remaining acceptance evidence is an authorized scheduled GET followed by `CRON_START`, `CRON_AUTHORIZED`, and `CRON_COMPLETE` (or an equivalent Vercel request log with HTTP 200).
## Final verification round

- `vercel.json` registers `/api/cron/cleanup-homework-files` with schedule `30 3 * * *` (03:30 UTC daily) on the production `main` deployment.
- The latest Production deployment after the documentation push is `dpl_48BpBxBZDvHejefXsKASL9ggLGH3`, state `READY`; the code fix is from `1feb5b1` and is also present in that deployment lineage.
- Unauthenticated production checks remain protected: GET returned HTTP 401; POST returned HTTP 405 because the route intentionally supports GET only. These checks are security evidence, not scheduler evidence.
- At `2026-08-21T22:24:41Z`, the next scheduled time is `2026-08-22T03:30:00Z`. No official scheduler execution can be claimed before a Vercel log shows the scheduled request.

## Final verification round — 2026-08-21T22:30Z

- Current production deployment: `dpl_AqtK6ZZhctFVT34BFpGSrDhQ7dv1`, READY, production, GitHub SHA `beb65cc77ef4387968487e2b4fd383f513e58970`, branch `main`.
- `vercel.json` still contains `/api/cron/cleanup-homework-files` with schedule `30 3 * * *`; no implementation rewrite was made in this round.
- Current UTC time at verification: `2026-08-21T22:30:17Z`.
- Previous scheduled window: `2026-08-21T03:30:00Z` = Cairo `2026-08-21T06:30:00+03:00`.
- Next scheduled window: `2026-08-22T03:30:00Z` = Cairo `2026-08-22T06:30:00+03:00`.
- A 7-day Vercel runtime-log query on the current deployment returned no logs because the project is on Hobby retention; the provider reports a 1-hour runtime-log retention window. This is not treated as PASS or FAIL for the upcoming window.
- Official Scheduler execution is not yet proven because the next window had not occurred at the time of this check. Required evidence remains a Scheduler-originated request with safe `CRON_START`, `CRON_AUTHORIZED`, `CRON_COMPLETE`, and cleanup counters.
- Earlier manual GET/POST 401 entries remain unauthorized manual requests and are not scheduled-Cron evidence.

Status: GAP 2 remains OPEN pending the next scheduled execution; no customer data was modified.

Source deployment metadata: Vercel `dpl_AqtK6ZZhctFVT34BFpGSrDhQ7dv1`; source commit `beb65cc`.

Instruction compliance: no Cron implementation rewrite was performed in this round, and no secret, token, password, or customer data was requested or exposed.

## Owner screenshot — Last hour filter

The owner set Vercel Logs to **Last hour** and searched for `cleanup-homework-files`. The screenshot shows:

| Time (displayed by Vercel) | Method | Status | Request | Message |
|---|---:|---:|---|---|
| Aug 22 01:24:28.51 | POST | 405 | `/api/cron/cleanup-homework-files` | Method not allowed; the route intentionally supports GET only. |
| Aug 22 01:24:27.29 | GET | 401 | `/api/cron/cleanup-homework-files` | `CRON_UNAUTHORIZED { method: 'GET', hasScheduleHeader: false }`. |
| Aug 22 00:59:19.21 | POST | 401 | `/api/cron/cleanup-homework-files/...` | Unauthorized manual request. |
| Aug 22 00:58:26.60 | GET | 401 | `/api/cron/cleanup-homework-files` | Unauthorized manual request. |

Interpretation: `hasScheduleHeader: false` confirms the visible GET was not identified as a Vercel Scheduler request. These entries are protection evidence only and do not prove Cron execution. The acceptance evidence remains an official scheduled GET 200 with `hasScheduleHeader: true` and/or the safe runtime markers `CRON_START`, `CRON_AUTHORIZED`, and `CRON_COMPLETE`.

No secret, token, password, or customer data was exposed or changed.
