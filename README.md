# MY Academy

A production-ready Academy Management System — manage **students, parents, teachers, courses, groups, lessons, attendance, payments, exams, grades, homework, notifications, reports and analytics** in one unified, role-based product.

Built with **Next.js (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui · Recharts · Zod · React Hook Form**. Multi-tenant-ready architecture with a swappable data layer (local seeded store for the live demo → Supabase for production).

---

## ✨ What's inside

**Role-based portals** with server-enforced authorization (not just hidden UI):
- **Admin** — full academy dashboard, students, groups, lessons, attendance, payments, grades, homework, analytics, reports, settings.
- **Teacher** — teaching dashboard, their groups/students/lessons/attendance/grades/homework.
- **Parent** — sees **only their own children**: attendance, grades, homework, payments.
- **Student** — sees **only their own data**: classes, lessons, homework, grades, progress.

**Every feature is connected** through one source of truth: Student → Group → Lessons → Attendance → Grades → Payments → Homework → Dashboard → Reports.

---

## 🚀 Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

### Demo accounts (password for all: `demo1234`)

| Role    | Email                     |
|---------|---------------------------|
| Admin   | `admin@myacademy.edu`     |
| Teacher | `teacher@myacademy.edu`   |
| Parent  | `parent@myacademy.edu`    |
| Student | `student@myacademy.edu`   |

Click any role on the login screen for one-click access.

---

## 🏗️ Architecture

```
app/
  (app)/            # Authenticated shell (sidebar + topbar) — all role portals
  api/              # Route handlers (login, search, attendance)
  actions/          # Server actions (mutations) — authorized server-side
  login/  forgot-password/
components/
  ui/               # shadcn-style primitives (Button, Card, Dialog, …)
  shared/           # PageHeader, StatCard, Toolbar, badges, empty/error states
  layout/           # Sidebar, Topbar, GlobalSearch, Notifications, UserMenu
  [feature]/        # students, groups, lessons, attendance, payments, grades, homework…
  charts/           # Themed Recharts wrappers
lib/                # utils, constants, nav, auth (client-safe)
services/           # ★ Single source of truth — typed service functions
  data/             # In-memory seeded store (demo backend)
  supabase/         # Supabase config + production schema
schemas/            # Zod validation schemas
types/              # Domain types mirroring the DB
supabase/schema.sql # Full PostgreSQL schema with RLS, indexes, triggers
```

### Data layer — why it works in preview AND in production
All UI calls go through typed **service functions** (`services/`). For the live demo these read/write an in-memory seeded store (`services/data/`) so the app runs end-to-end with no secrets. The **production path is Supabase**: provide `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the same service surface maps to Supabase. The complete SQL schema with **Row Level Security** is in `supabase/schema.sql`.

### Multi-tenant ready
Every academy-owned entity carries `academy_id`. The seed uses config values, not hard-coded names, so adding academies later requires no schema rewrite.

---

## 🔒 Security
- **Server-side authorization** on every page and mutation via `requireRole(...)`.
- **Row Level Security** policies in `supabase/schema.sql` (admin: academy-wide; teacher: assigned; parent: own children; student: own records).
- Search API and all data access are **scoped by role** (verified).
- Service role key stays server-side; only the anon key is ever public.

---

## 🧪 Quality
- TypeScript strict mode — **clean production build** (`npm run build`).
- Loading skeletons, empty states, error states and toast notifications everywhere.
- Forms use React Hook Form + Zod with client **and** server validation.
- Responsive: desktop sidebar, mobile sheet nav, tables → cards on small screens.
- Print-ready reports.

```bash
npm run build     # type-checks + builds all routes
npm run lint
```

---

## 📊 Seed data
A small, interconnected development dataset (dates relative to today, so dashboards are never hard-coded): 2 parents, 8 active students, 4 courses, 4 groups, 12 lessons, attendance, 4 months of payments, exams + grades, homework + submissions, notifications. **No fake data is used in production** — see `services/data/seed.ts`.
 
