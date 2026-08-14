# جرد الترجمة والاتجاه — 2026-08-14

## الملاحظة الأساسية

زر اللغة الحالي يحفظ `ma_lang` ويغيّر `document.documentElement.dir`، لكن عددًا كبيرًا من الصفحات والمكوّنات يحتوي نصوصًا عربية ثابتة أو `dir="rtl"` ثابتًا. لذلك لا يكفي تعديل الزر وحده؛ يجب ربط الصفحات بمصدر لغة موحد وترجمة المسارات الأساسية.

## ملفات تحتوي اتجاه RTL ثابتًا

- `app/(app)/help/page.tsx`
- `app/(app)/onboarding/page.tsx`
- `app/(app)/parent/children/[id]/report/page.tsx`
- `app/(app)/platform/page.tsx`
- `app/(app)/students/[id]/report/page.tsx`
- `app/(app)/support/tickets/page.tsx`
- `app/forgot-password/page.tsx`
- `app/invite/[token]/page.tsx`
- `app/login/page.tsx`
- `app/page.tsx`
- `app/pricing/page.tsx`
- `app/privacy/page.tsx`
- `app/reset-password/page.tsx`
- `app/status/page.tsx`
- `app/support/page.tsx`
- `app/terms/page.tsx`
- `components/layout/onboarding-gate.tsx`
- `components/settings/invite-manager.tsx`
- `components/support/support-desk.tsx`

## المسارات التي يجب تغطيتها

تشمل المنصة مسارات الأكاديمية، المدرس المستقل، الطالب، ولي الأمر، التقارير، الحضور، المدفوعات، الإعدادات، المنصة، الدعم، التسجيل، الدعوات، واستعادة كلمة المرور. التنفيذ سيبدأ بطبقة لغة مشتركة ثم يمر على onboarding، القوائم، الحسابات، الدعوات، ولوحة المنصة قبل الصفحات التشغيلية.

## نتيجة الجرد

الإنجليزية ليست مكتملة حاليًا على مستوى المنصة كلها. صفحة التسجيل العامة أصبحت ثنائية اللغة، لكن onboarding والدعوات والصفحات التشغيلية تحتاج ربطًا تدريجيًا بمصدر اللغة الموحد وإزالة الاتجاه الثابت.
