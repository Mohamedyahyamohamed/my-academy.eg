# Phase 19 — Legal Compliance & Data Protection

## ⚠️ Status: NOT IMPLEMENTED — Required before production with real student data.

### What's needed:

1. **Privacy Policy** — A dedicated page (`/privacy`) describing:
   - What data is collected (student PII, parent PII, academic records, financial records, biometric-free attendance).
   - Who can access it (academy admin, assigned teachers, linked parents, the student themselves).
   - Data retention period (recommended: retain while enrolled + 1 academic year, then soft-delete → purge after 90 days).
   - Data subject rights (access, correct, export, delete).

2. **Terms of Service** — A dedicated page (`/terms`) covering:
   - Acceptable use.
   - Academy owner responsibility for data accuracy.
   - Limitation of liability.
   - Subscription terms (free tier limits, upgrade, cancellation, no data deletion on cancel).

3. **Egyptian Data Protection Law (Law 151 of 2020)** compliance:
   - **Consent**: Parents must explicitly consent to data collection for minors.
   - **Purpose limitation**: Data used only for academy management.
   - **Data minimization**: Only collect necessary fields.
   - **Right to erasure**: Implement "delete my data" flow for academy owners.
   - **Data residency**: Supabase region should be EU/US — verify if Egyptian law requires on-premise.

4. **Minor data policy**:
   - Explicit parent consent checkbox on student creation.
   - Access logs for minor data (already have audit_logs).
   - Auto-purge archived students after configurable retention period.

5. **Data portability**:
   - Export academy data as JSON/CSV (all students, payments, grades, attendance).
   - Implement `/api/export` endpoint.

### Implementation plan:
- Add `consent` field to `students` table (boolean, required).
- Add `data_retention_days` setting (default 365).
- Create `/privacy` and `/terms` pages.
- Create data export endpoint.
- Add consent checkbox to student creation form.

---

# Phase 20 — Staging & Monitoring

## ⚠️ Status: NOT IMPLEMENTED.

### What's needed:

1. **Staging environment**:
   - Separate Supabase project for staging (not the same database).
   - Vercel Preview Deployments for every PR.
   - Separate `.env.staging` with staging keys.
   - Run seed data on staging database.

2. **Migration rollback plan**:
   - Every SQL migration should have a documented `DOWN` script.
   - Test rollback on staging before applying to production.
   - Supabase PITR (Point-in-Time Recovery) on Pro plan as safety net.

3. **Uptime monitoring**:
   - UptimeRobot / Better Uptime (free tier) — pings the app URL every 5 min.
   - Alert via email/SMS/Slack on downtime.
   - Separate from Sentry (Sentry = code errors, UptimeRobot = service availability).

4. **Deployment checklist**:
   - [ ] All tests pass (`npx vitest run`).
   - [ ] Build succeeds (`npm run build`).
   - [ ] ESLint passes (0 errors).
   - [ ] SQL migrations tested on staging.
   - [ ] Environment variables set in Vercel.
   - [ ] Sentry DSN configured.
   - [ ] Resend API key configured.
   - [ ] Uptime monitor configured.
   - [ ] Privacy Policy + Terms published.
   - [ ] DNS/domain configured.

### Implementation plan:
- Create staging Supabase project.
- Configure Vercel Preview Deployments.
- Set up UptimeRobot.
- Document migration rollback procedures.
