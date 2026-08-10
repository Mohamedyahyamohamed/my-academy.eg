# 🚀 Deploy Guide — MY Academy to production

Your Supabase backend is **fully set up** (schema, triggers fixed, data seeded,
storage bucket created). The only thing left is to put the **frontend online**.
Easiest path = **Vercel** (made by the Next.js team, free tier is enough).

---

## Step 1 — Push the code to GitHub
1. Create a new repo on GitHub (e.g. `my-academy`).
2. From the project folder:
```bash
git init
git add .
git commit -m "MY Academy — production-ready"
git branch -M main
git remote add origin https://github.com/<you>/my-academy.git
git push -u origin main
```
> `.env*.local` is gitignored — your secret key will **not** be pushed. ✅

## Step 2 — Import to Vercel
1. Go to https://vercel.com → **Add New… → Project**.
2. Import your `my-academy` repo.
3. Framework stays **Next.js** (auto-detected).
4. Open **Environment Variables** and add these 3 (from your Supabase → Settings → API):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fpcdaiyktnoiwaulbhcn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_M_BwY18-...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_RylOB3pU...` |

5. (Optional but recommended) **Settings → Functions → Node.js Version = 22.x**
   (supabase-js prefers Node 22; Node 20 also works via the built-in polyfill.)
6. **Deploy.** Wait ~1–2 min. You'll get a live URL like `my-academy.vercel.app`.

## Step 3 — Log in 🎉
Open the Vercel URL → sign in with `admin@myacademy.edu` / `demo1234`, or go to
`/signup` to create a new academy.

---

## ✅ Daily-use checklist (everything that works now)
- **Admin**: dashboard, students (+profiles), groups, lessons, attendance, payments,
  grades, homework, analytics, printable reports, settings, **create user accounts**.
- **Teacher / Parent / Student** portals — fully isolated per academy.
- **Self-service signup** — new academies register at `/signup`.
- **File uploads** — homework attachments stored in Supabase Storage.
- **Real auth + persistent data** on your Supabase project.
- **Multi-tenant isolation** — each academy sees only its own data.

## 🔧 Admin how-to (for the academy owner)
1. Sign in as **admin**.
2. **Settings → Users → Add user** → create accounts for your teachers / parents / students.
3. Add **Students**, create **Groups**, schedule **Lessons**, take **Attendance**, record **Payments**.
4. Hand parents/students their emails + passwords → they sign in to their portals.

## 🧰 Useful ops commands
```bash
npm run dev       # local development
npm run build     # type-check + production build
npm run lint      # lint

# Re-seed the database (wipes + reloads demo data):
SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY npx tsx scripts/seed-supabase.ts
```

## ⚠️ Notes for scaling later (not needed now)
- The app uses a **write-through cache** (reads from memory, writes to Postgres).
  Perfect for a single academy / one server. For many concurrent academies on
  multiple instances, switch reads to per-request Supabase queries (RLS is already
  defined in `supabase/schema.sql`).
- Want **realtime** notifications and **email** invites? Those are the next add-ons.
