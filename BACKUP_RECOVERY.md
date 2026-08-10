# Backup & Recovery — MY Academy

## Supabase Automated Backups
Supabase (Pro plan and above) provides:
- **Daily automated backups** (retained 7 days on Free, 30 days on Pro).
- **Point-in-Time Recovery (PITR)** on Pro+ — restore to any second within retention.

## Recovery Steps
1. **From daily backup**: Supabase Dashboard → Database → Backups → Restore.
2. **From PITR**: Dashboard → Database → PITR → Choose timestamp → Restore.
3. **Manual SQL export**: `pg_dump` via Supabase connection string.

## What to Back Up
- **Postgres database** (all tables): handled by Supabase automated backups.
- **Storage files** (homework bucket): Supabase Storage has its own redundancy.
- **Auth users**: part of the Postgres backup (auth schema).
- **Environment variables**: document separately (`.env.local` — NOT in version control).

## Restore Testing
After any restore:
1. Verify auth login works (`admin@myacademy.edu`).
2. Verify students/payments/grades appear correctly.
3. Run `npx vitest run` to validate business logic.
4. Check audit logs for gaps during the backup window.

## Disaster Recovery
- **Code**: stored in Git (GitHub) — redeploy from Vercel.
- **Database**: restore from Supabase backup.
- **Downtime**: typically < 15 minutes for full restore.
- **Data loss**: limited to time since last backup (max 24h on Free, seconds on Pro PITR).

## Recommendation
For production with real student data: **upgrade to Supabase Pro ($25/mo)** for:
- PITR (seconds-level recovery)
- 30-day backup retention
- Daily logical backups
- Enhanced support
