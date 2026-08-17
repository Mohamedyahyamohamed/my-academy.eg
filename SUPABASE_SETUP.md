# Supabase setup

This turns MY Academy from a demo (in-memory data) into a real app backed by Supabase Auth + Postgres. The app auto-detects Supabase via environment variables; when they are absent, it keeps running on the local demo store.

## 1. Create a Supabase project

Open [Supabase](https://supabase.com) and create a project. Record its Project URL and region.

## 2. Run the schema

Open the project, go to **SQL Editor**, create a new query, paste the contents of `supabase/schema.sql`, and run it. This creates the tables, enums, triggers, and Row Level Security policies.

## 3. Configure environment variables

Create `.env.local` locally or configure the variables in Vercel. Copy the URL and public key only from the intended Supabase project's Settings → API page.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copy-from-Supabase-project-settings>
SUPABASE_SERVICE_ROLE_KEY=<copy-from-Supabase-project-settings-and-store-only-in-Vercel/server-env>
```

The anon key is intended for the client. The service-role key is server-only, must never be shipped to the browser, and must never be pasted into chat, Git, screenshots, or issue trackers. Rotate it immediately if it has appeared in any historical log or commit.

## 4. Seed the database

Run the seed script from a trusted environment, using environment variables that are not committed to Git:

```bash
SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  npx tsx scripts/seed-supabase.ts
```

The demo seed creates demo users and data. Do not run it against a production database containing real student information unless the data-reset impact has been reviewed and explicitly approved.

## 5. Run the app

```bash
npm run dev
```

The app reads and writes the configured Supabase database, and data persists across restarts.

## Security checklist

Configure secrets directly in the local environment or Vercel. Do not send secrets through chat or commit them to the repository. Confirm that the project URL points to the intended Supabase project, that no `NEXT_PUBLIC_` variable contains a service-role key, and that production secrets are marked sensitive in Vercel. Before onboarding real student data, complete the required legal and privacy review for applicable Egyptian data-protection obligations.
