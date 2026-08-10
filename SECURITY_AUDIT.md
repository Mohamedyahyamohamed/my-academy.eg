# تقرير الثغرات (npm audit) — MY Academy

> تاريخ: 2026-08-10
> المصدر: `npm audit` على package-lock.json الحالي.

## الحكم العام
**لا تعمل `npm audit fix --force`** → سيثبّت `next@16.3.0` (قفزتين major من 14.2.35) ويكسر التطبيق.

## الـ 5 ثغرات (high)

### 🟢 تجاهَلها — dev/build فقط (مش إنتاج)
1. **glob** ≤10.4.5 — command injection via `-c`. تأتي عبر `eslint-config-next` → `@next/eslint-plugin-next`. **أداة linting فقط**، لا تُشغّل في runtime ولا تُحمّل للإنتاج. غير قابلة للاستغلال في الموقع.
2. **postcss** ≤8.5.22 — XSS / path traversal via sourceMappingURL. متداخلة تحت `next/node_modules/postcss`. **معالجة CSS وقت build فقط** على ملفات ثابتة، لا على دخل مستخدم.

### 🟠 حقيقية — runtime (Next.js)
3. **next** 9.3.4-canary → 16.3.0-preview — مجموعة advisories:
   - DoS عبر Image Optimizer / Server Components / Server Actions.
   - HTTP request smuggling في rewrites.
   - Cache poisoning (RSC / middleware redirects).
   - SSRF في Server Actions (custom servers فقط — Vercel يخففها).
   - XSS مع CSP nonces.
   - إفصاح غير مُصادَق عن internal Server Function endpoints.

## الوضع
- النسخة الحالية: **next@14.2.35** = **آخر 14.x** (`next-14` dist-tag).
- لا يوجد patch جوه 14.x يصلحها → العلاج الوحيد = **ترقية Next 15.x**.

## التوصية
- **الآن:** ابقَ على 14.2.35. الثغرات أغلبها DoS/توافر، والموقع لسه غير عام.
- **قبل الإطلاق العام:** خطط لترقية Next 15 (الأحدث: 15.5.23). تنبيه: Next 15 بها breaking changes:
  - React 19.
  - async request APIs (`cookies()`, `headers()` تصبح async).
  - تغييرات في caching/turbopack.
  - تحتاج اختبار كل المسارات بعد الترقية.
- الثغرات dev/build (glob/postcss) تُحل تلقائيًا عند ترقية Next.

## خطوات الترقية المستقبلية (Next 15)
1. فرع جديد: `npm i next@15.5.23 eslint-config-next@15 react@19 react-dom@19`.
2. عدّل كل `cookies()`/`headers()` لتصبح `await cookies()`.
3. اختبر: build + كل المسارات (admin/teacher/parent/student) + login.
4. أعد `npm audit` للتأكد من انخفاض العدد.

## ملاحظة
`npm audit` أحيانًا تبالغ في التقييم. الأهم هو **هل الثغرة في مسار runtime يتلقى دخل من مستخدم؟** — هنا فقط next يلتقي هذا الشرط، والباقي أدوات تطوير.
