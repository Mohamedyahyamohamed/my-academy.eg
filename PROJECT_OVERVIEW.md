# MY Academy — مراجعة شاملة للمشروع (SaaS)

ده تفصيل كامل لكل اللي اتعمل في نظام إدارة الأكاديمية "MY Academy". انسخ الملف كامل وابعته للمراجع عشان يقولك التعديلات المطلوبة.

---

## 1) الفكرة العامة
نظام SaaS لإدارة الأكاديميات/مراكز التدريس. مبنى يكون **multi-tenant ready** (كل أكاديمية معزولة)، وفيه 4 أدوار (Admin / Teacher / Parent / Student) كل واحد ليه بورتال وصلاحيات. بيشتغل على **Supabase** (Auth + Postgres + Storage).

## 2) التقنيات (Tech Stack)
- **Frontend**: Next.js 14 (App Router) + TypeScript (strict) + Tailwind CSS + مكوّنات شادcn/ui + Recharts + Lucide Icons + Sonner (toasts).
- **Forms/Validation**: React Hook Form + Zod (client + server).
- **Backend**: Next.js Server Actions + Route Handlers.
- **Database/Auth/Storage**: Supabase (@supabase/ssr + supabase-js).
- **QR**: qrcode.react (توليد) + html5-qrcode (مسح بالكاميرا).

## 3) المعمارية (Architecture)
- **Service Layer** = المصدر الوحيد للداتا. كل صفحة بتتكلم مع دوال service مش مع الـ DB مباشرة.
- **Write-through cache**: السيرفر بيـ hydrate كل الداتا من Supabase في الذاكرة عند كل request (قراءات سريعة)، وكل mutation (create/update/delete) بيتكتب في Postgres فورًا (await + UUIDs صحيحة + ترتيب FK مظبوط).
- **Multi-tenant isolation (app-layer)**: كل entity فيها `academy_id`، وكل القراءات متفلترة بأكاديمية اليوزر الحالى (`byAcademy`). كمان RLS policies موجودة في الـ SQL كدفاع عميق.
- **Auth**: تسجيل دخول بيتحقق من Supabase Auth (`signInWithPassword`)، وبعدها session cookie. Signup بيعمل أكاديمية + أدمن جديدين.

## 4) قاعدة البيانات (Supabase / PostgreSQL)
جداول: academies, profiles, courses, teachers, parents, students, groups, group_students, **group_assistants**, lessons, attendance, payments, payment_transactions, exams, grades, homework, homework_submissions, notifications, notes, files.
- UUIDs لكل IDs.
- Foreign keys + unique constraints + indexes.
- **Generated column**: `payments.remaining` (متاحسب أوتوماتيك = amount_due − amount_paid).
- **Triggers**: `handle_new_user` (بيعمل profile عند التسجيل — دفاعي)، `check_grade_bounds` (يمنع درجة > الـ max)، `touch_updated_at`.
- **RLS policies** لكل جدول (admin = أكاديمية كاملة، teacher = المخصّص له، parent = أولاده، student = نفسه).
- ملفات SQL: `supabase/schema.sql` + `supabase/fix-trigger.sql` + `supabase/fix-grades-trigger.sql` + `supabase/assistants.sql`.
- سكريبت seed: `scripts/seed-supabase.ts` (بيعمل 4 يوزرات demo + داتا كاملة).

## 5) المصادقة والأدوار (Auth & Roles)
- **Admin**: تحكّم كامل في الأكاديمية (كل الصفحات + Settings + Analytics + Reports).
- **Teacher**: جروباته وطلابه بس (scoped بـ `teacherGroupScope` = جروبات يملكها + يساعد فيها). صفحاته: Dashboard, My Groups, Students, Lessons, Attendance, Grades, Homework, **Assistants**.
- **Parent**: أولاده بس (محدود تمامًا). صفحاته: Dashboard, Children, Attendance, Grades, Homework, Payments, Notifications.
- **Student**: بياناته هو بس. صفحاته: Dashboard, My Classes, Lessons, Homework, Grades, Progress, Notifications.
- التفويض على السيرفر في كل صفحة و action (`requireRole`) — مش بس إخفاء UI.
- عزل الـ search API حسب الـ role.
- كلمة سر كل حسابات demo: `demo1234`.

## 6) الميزات الأساسية بالتفصيل

### الطلاب (Students)
- List فيه: بحث + فلتر (status/group) + sort + pagination + responsive (table على الديسكتوب، cards على الموبايل).
- Add/Edit عبر dialog (React Hook Form + Zod): الاسم، التليفون، الإيميل، تاريخ الميلاد، النوع، **ولى الأمر (إلزامى + إضافة سريعة)**، المدرسة، المرحلة، Notes، الحالة، **الجروبات (checkbox)**.
- Archive/Restore.
- **بروفايل الطالب (Premium)**: header (اسم/مرحلة/جروب/حالة) + 5 stat cards (حضور، متوسط، رسوم، مدفوع، متبقّى) + charts (حضور + درجات) + 7 tabs (Overview, Attendance, Payments, Grades, Homework, Lessons, Notes) + Notes interactable (إضافة/حذف).

### الجروبات (Groups)
- Cards بكل جروب (course color, students count, schedule, teacher, fee).
- تفاصيل الجروب: الطلاب (add/remove)، الدروس، نسبة الحضور، متوسط الدرجات، تفاصيل + أزرار (Take attendance, Create lesson).
- **Assistants**: قسم لإضافة/إزالة مدرّس مساعد على الجروب.
- إنشاء جروب: **المدرّس مُحدّد تلقائيًا (أنت)** + **الكورس نص حر (يتكتب أول مرة ويتحفظ)** + لون + رسوم + جدول + قاعة.

### الدروس (Lessons)
- List (upcoming/past) + بحث + فلتر بالجروب.
- إنشاء/تعديل/حذف (validation: end > start).
- تفاصيل الدرس: الموضوع، الجروب، الحضور، Notes، الواجب المرتبط.

### الحضور (Attendance) — 3 طرق
1. **يدوي**: اختيار جروب + درس → قائمة كل الطلاب → حاضر/غائب/متأخر + bulk (All present / All absent) + save واحد + ملخص لحظى.
2. **QR — المعلّم بيعرض كود الدرس** (الطالب يمسح): زرار "QR check-in" في ورشة الحضور.
3. **QR — المعلّم يمسح كود الطالب** (الأفضل): صفحة `/attendance/scan` بكاميرا → الطالب يعرض كوده الشخصي → المعلّم يمسحه → يسجّل حضور. كمان كل طالب ليه **كارت QR شخصي** (dashboard + بروفايل) قابل للتحميل/الطباعة.

### المدفوعات (Payments)
- Stat cards (مُحصّل، مُستحق، متبقّى) + بحث + فلتر (status/month).
- Add payment (validation: لا قيم سالبة، لا exceeds due، لا student غير صحيح).
- Record payment (يضيف دفعة على دفعة موجودة، يتحسب remaining/status تلقائيًا).
- حساب `remaining` و `status` (PAID/PARTIAL/UNPAID) أوتوماتيك.

### الدرجات (Grades)
- امتحانات (Create exam: اسم/كورس/جروب/تاريخ/أعلى درجة).
- **Grade entry**: جدولeditable لكل الطلاب + validation (0 ≤ score ≤ max) + نسبة + مستوى أداء لحظى + class average.
- مستويات الأداء: Excellent / Very Good / Good / Needs Improvement.

### الواجب (Homework)
- Assign (عنوان/وصف/جروب/موعد) → بينشئ pending submissions لكل طلاب الجروب.
- الطلاب يقدروا **يرفعوا ملف** (PDF/صورة/Word) + نص → تخزين في Supabase Storage.
- المعلم يراجع (feedback + grade) → status: Pending/Submitted/Reviewed.

### الإشعارات (Notifications)
- Bell في الـ topbar + unread count (polling كل 20s).
- مركز إشعارات (`/notifications`) + Mark all read.

### التقارير (Reports)
- تقرير شهرى شامل + roster + payments summary + grade performance.
- فلتر بالجروب + **printable** (CSS print).

### Analytics
- Student growth, Revenue (billed vs collected), Attendance trend, Avg grade by course, Popular courses, Profitable groups, retention.

### Settings
- Tabs: Academy (editable), Users (عرض + **Add user** يخلق حساب بإيميل لأى دور), Courses (إضافة/حذف + لون), Payment methods, Roles (شرح).

## 7) البورتالات (Portals)
- **Admin dashboard**: 8 KPIs + charts (revenue/students-by-course/attendance/grades) + Upcoming lessons + Recent payments + Outstanding + Smart Insights.
- **Teacher dashboard**: جروباته + طلابه + دروسه الجاية + نسبة حضوره + تنبيه واجب مستني مراجعة + Needs attendance + Recent submissions.
- **Parent dashboard**: كرت لكل ابن (حضور/متوسط/متبقّى/واجب) + next lesson.
- **Student dashboard**: حضوره/معدّله/جروباته/واجباته + **Gamification (نقاط/ترتيب/شارات/streak/leaderboard)** + My QR card.

## 8) المميزات المُميِّزة (Differentiators — مجانية 100%)
- **Gamification**: نقاط (حضور+درجات+واجب) + 5 شارات + Leaderboard + Streak. محسوبة من الداتا (no tables إضافية).
- **Smart Insights (rule-based AI)**: اكتشاف الطلاب المعرّضين للرسوب (حضور<70% / معدّل<60% / غياب متواصل / متأخر سداد) + مستوى خطورة + **توليد تعليق تقرير تلقائي** (عربى) لكل طالب.
- **QR Attendance** (اتجاهين): student-scan و teacher-scan + كروت QR شخصية قابلة للتحميل/الطباعة.
- **Assistants**: المدرّس يخلق حسابات assistants بإيميلات، يدّيهم نفس صلاحياته على جروباته المختارة.

## 9) Multi-tenant & Signup
- كل entity فيها `academy_id`.
- **Self-service signup** (`/signup`): صاحب أكاديمية يسجّل → تنشاء أكاديمية + أدمن → يدخل داشبورده.
- عزل البيانات تم اختباره: أكاديمية 2 شافت 0 طلاب من أكاديمية الـ demo.

## 10) ما تم اختباره (QA)
- Build نظيف (40 route، TypeScript strict).
- كل الـ routes بترجع 200 لكل دور.
- Auth guards شغّالة (logged-out → redirect، cross-role → redirect، parent يشوف ابن حد تاني → 404).
- الباسوورد الغلط بيترد.
- **QA كامل للmutations**: كل أزرار الإنشاء بتتخزن في DB (student/group/lesson/attendance/payment/transaction/exam/grades/homework/note/course) — 11/11 نجحوا.
- عزل المدرّسين اتختبر (Omar شاف 3 جروباته، الإنجليزى محدش).
- بقاء الداتا بعد الـ restart (write-through).

## 11) حاجات "مبسّطة" / قيود (مهم للمراجعة)
1. **الـ write-through cache** = single-process. على Vercel (serverless) القراءات بتعمل hydrate per-request (صح بس أبطأ شوية). لو multi-instance عالى، محتاج قراءات per-request بدل cache.
2. **عزل multi-tenant** app-layer (مش RLS مباشرة)، لأن السيرفر بيستخدم service role key للـ cache. الـ RLS موجودة في SQL لكن مش مفعّلة على الـ cache path.
3. **مفيش realtime** فعلًى (الإشعارات polling كل 20s، مش Supabase Realtime).
4. **مفيش إيميل** فعلًى (reset password stubbed؛ signup/invite مش بيبعتوا إيميل).
5. **رفع الملفات** عبر service role (مفيش Storage RLS policies).
6. **QR student-scan** ممكن يتعمل منها abuse (مفيش proximity/time validation) — الـ teacher-scan أدق.
7. **مفيش automated tests** (QA يدوى بس).
8. ESLint متعطّل في الـ build (فيه بعض unused imports) — TypeScript شغّال.
9. الكود شغّال على Node 20 (عن طريق polyfill لـ ws)؛ Vercel يُفضّل Node 22.
10. Node.js realtime client في supabase-js بيطلب WebSocket (تم حلّه بـ polyfill).

## 12) هيكل الفولدرات
```
app/
  (app)/            البورتالات (sidebar+topbar)
    dashboard/ students/ groups/ lessons/ attendance/ payments/
    grades/ homework/ analytics/ reports/ settings/ notifications/
    parent/ student/ teacher/ (صفحات الـ portals)
  api/              route handlers (login, search, attendance)
  actions/          server actions (students, groups, lessons, attendance,
                    payments, grades, homework, notifications, auth, notes,
                    users, parents, settings, signup, assistants, upload)
  login/ signup/ forgot-password/ checkin/
components/
  ui/ shared/ layout/ [feature]/ charts/
lib/                utils, constants, nav, auth, supabase clients
services/           session, students, groups, lessons, attendance, payments,
                    grades, homework, dashboard, notifications, misc, portals,
                    gamification, insights, data/(store+seed), supabase/config
schemas/            zod (auth, students, groups, lessons, payments, grades, homework, settings)
types/              domain types
supabase/           schema.sql + fix SQLs + assistants.sql
scripts/            seed-supabase.ts
```

## 13) الحسابات للتجربة (password: demo1234)
- admin@myacademy.edu · teacher@myacademy.edu · parent@myacademy.edu · student@myacademy.edu

## 14) أسئلة للمراجع (النقاط اللي محتاجة قرار)
- هل نستبدل الـ cache بقراءات per-request + RLS فعّالة للإنتاج الحقيقى؟
- هل نظبّط QR student-scan بـ time/geofence؟
- هل نضيف Supabase Realtime للإشعارات؟
- هل نظبّط إيميل (Resend/Supabase) للدعوات/reset؟
- هل نضيف automated tests (Jest/Playwright)؟
- هل نظبّط mobile app (React Native/Expo) للحضور الأوفلاين؟
