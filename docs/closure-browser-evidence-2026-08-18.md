# Closure browser evidence — 18 August 2026

- URL opened in My Browser: https://supabase.com/dashboard/project/fpcdaiyktnoiwaulbhcn/auth/providers
- Project shown in the dashboard: `mySAAS`, organization `my-academy`, branch `main` / `PRODUCTION`.
- Authentication sidebar visibly includes `Attack Protection`, which is the likely location for leaked-password protection in the current Supabase dashboard UI.
- Current page is authenticated and shows Sign In / Providers. No setting was changed and no Save action was performed.
- Supabase MCP Security Advisor at 2026-08-18 reported `auth_leaked_password_protection` with level `WARN`: “Leaked password protection is currently disabled.” Remediation URL: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- No passwords, API keys, tokens, or personal secrets were recorded.

## Runtime isolation fixture check

A non-invasive environment check on 18 August 2026 found all six required runtime fixture variables absent: `MYACADEMY_E2E_A_EMAIL`, `MYACADEMY_E2E_A_PASSWORD`, `MYACADEMY_E2E_B_EMAIL`, `MYACADEMY_E2E_B_PASSWORD`, `MYACADEMY_E2E_B_STUDENT_ID`, and `MYACADEMY_E2E_B_GROUP_ID`. No values were printed. Because the user prohibited production mutations, no Academy B account, group, or student was created during this step; the runtime isolation test remains blocked until safe fixtures are provided or a non-production branch/environment is authorized.

## Local safe verification

The local Vitest run completed with 3 test files passed and 1 skipped; 44 tests passed and 9 were skipped. The skipped file is the runtime cross-tenant suite because the required Academy A/B fixture variables are absent. The only warning was a Vite configuration deprecation notice about CommonJS/ESM loading; it did not fail the tests. No production endpoint or outbound messaging provider was used.

## 2026-08-18 — Existing Academy B discovered

After Owner login, the platform dashboard displayed three existing academies. The current workspace is `MYAcademy Production Audit`. A second existing workspace named `mohamed yahya — مساحة المدرس` is active, has `0 طالب` and `1 مدرس`, and is marked `تحتاج تهيئة`. A third workspace `ماي اكاديمي` has `1 طالب`. This means an existing empty Academy B is available for safe inspection without creating a new academy or a paid Supabase branch. The current page exposed management controls for suspend/delete only; no delete or suspend action was used.

Evidence source: My Browser page `/platform`, captured 2026-08-18. No passwords or tokens were recorded.

## 2026-08-18 — Academy B runtime blocker
- جلسة Owner الحالية مرتبطة بـ `MYAcademy Production Audit`.
- صفحة `/students` تعرض طلاب الأكاديمية الحالية وتعرض زر `إضافة طالب`، لكن لا يوجد مبدّل أكاديمية ظاهر في واجهة Owner.
- قائمة الحساب تعرض الإعدادات وتسجيل الخروج فقط.
- صفحة Supabase Auth توفر `Send password recovery` و`Send magic link` فقط، ولم يتم الضغط عليهما لأن ذلك يرسل Email حقيقيًا.
- لم يتم إنشاء طالب جديد لتجنب إدخاله بالخطأ في Academy A.
- النتيجة: Academy A vs B runtime isolation = Still Blocked، ولا يوجد record-count evidence جديد حتى يتوفر حساب عضو في Academy B أو مسار تبديل أكاديمية آمن.
- لم يتم تغيير بيانات الإنتاج أو إرسال رسائل خارجية.

## 2026-08-18 — Account/password constraint
- حساب Academy B الموجود مسبقًا لا تملك له الجلسة الحالية كلمة مرور معروفة.
- تعيين كلمة مرور مباشر من لوحة Auth غير متاح في الواجهة المصورة؛ الخيارات الظاهرة ترسل recovery email أو magic link.
- قرار السلامة: عدم إرسال أي رسالة وعدم استخدام كلمة مرور مخمّنة.

## 2026-08-18 — Academy B test account created
- تم إنشاء مستخدم Auth جديد عبر لوحة Supabase المباشرة دون إرسال دعوة.
- user/profile id: `c459da0f-8a8d-4181-931c-127ddb4a71fb`
- email: `mohamedyahya13579+academy-b-isolation-20260818@gmail.com`
- role: `STUDENT`
- academy_id: `155a078b-df83-43f7-8646-0c3a0156f5b8`
- academy_name: `ماي اكاديمي`
- email_confirmed_at موجود، والحساب مرتبط تلقائيًا بأكاديمية B.
- لم تُقرأ أو تُسجّل كلمة المرور، ولم تُرسل دعوة أو Email أو WhatsApp.

## 2026-08-18 — Academy B login and student-link result
بعد إضافة عضوية ACTIVE للحساب `mohamedyahya13579+academy-b-isolation-20260818@gmail.com` في Academy B، نجح تسجيل الدخول فعليًا، وظهر البريد في شريط الحساب والصفحة العربية `/student`. لكن الصفحة تعرض: `الملف غير مرتبط` و`حسابك غير مرتبط بسجل طالب. تواصل مع الأكاديمية.` لذلك فعضوية academy_memberships وحدها لا تنشئ سجل student domain record. لا توجد نتيجة عزل بعد، لأن حساب B لا يستطيع عرض بيانات الطالب قبل ربط student record.

## Schema finding — public.students
فحص `information_schema.columns` في مشروع Supabase الإنتاجي أظهر أن جدول `public.students` يحتوي 20 عمودًا، منها `id`, `academy_id`, `first_name`, `last_name`, `status`, وحقول الموافقة `consent_given`, `consent_at`, `consent_by`, `consent_version`. لا يوجد عمود `profile_id` في students؛ لذلك يجب تحديد مفتاح الربط عبر academy_memberships أو جدول domain mapping قبل إدخال أي بيانات.

## 2026-08-18 — Academy B student fixture recheck
- Inserted one synthetic `students` row only in Academy B: id `55fa4793-7a7e-401e-a48d-4b7d72c5bbe6`, email `mohamedyahya13579+academy-b-isolation-20260818@gmail.com`, status `ACTIVE`.
- Verified `profiles`, `auth.users`, and `academy_memberships` all use the same UUID `c459da0f-8a8d-4181-931c-127ddb4a71fb`, Academy B UUID `155a078b-df83-43f7-8646-0c3a0156f5b8`, and role `STUDENT/ACTIVE`.
- Verified `private.auth_has_academy_role` checks `academy_memberships.profile_id = auth.uid()`, ACTIVE membership, and requested role; the fixture satisfies those conditions.
- Browser runtime after fresh login and cache-busting URL `/student?tenant-fixture-refresh=20260818-1305` still shows `الملف غير مرتبط` / `حسابك غير مرتبط بسجل طالب`. Tenant isolation remains blocked; next diagnosis target is production hydration/RLS runtime rather than missing database fixture.
