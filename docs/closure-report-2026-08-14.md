# تقرير إغلاق الجولة الأمنية والتشغيلية لمنصة MYAcademy

**التاريخ:** 14 أغسطس 2026

**المستودع:** [Mohamedyahyamohamed/my-academy.eg](https://github.com/Mohamedyahyamohamed/my-academy.eg)

**Commit المنشور:** `e8dd365` — `Complete operational security and billing readiness`

## الملخص التنفيذي

اكتملت الجولة الرابعة من تحسين وتأمين منصة MYAcademy، ودُفعت التعديلات إلى فرع `main` في المستودع الحقيقي. أنشأ Vercel نشرًا إنتاجيًا جديدًا لهذا الـcommit بحالة **READY**، كما نجح البناء البعيد باستخدام Next.js 16.3.1 وTypeScript، وظهرت مسارات cron والفوترة والحصص ضمن ناتج البناء.[1] [2]

تضمنت الجولة حماية متعددة الأبعاد لمسارات حساسة، إغلاق demo في الإنتاج، توقيعات webhook، معالجة حالات Stripe المتكررة، فرض حصة التخزين، تنبيهات الاشتراك الدورية، صفحة billing، صفحات الخصوصية وشروط الاستخدام، وتحديث دليل الإطلاق وملف البيئة النموذجي.

## ما تم تنفيذه

| المجال | التنفيذ |
|---|---|
| Rate limiting | إضافة بصمة IP/User-Agent غير قابلة للعكس، ودعم Upstash Redis مع fallback داخل الذاكرة، وحدود منفصلة لتسجيل الدخول وQR وcheck-in وwebhooks. أُصلح أيضًا خطأ TypeScript الخاص بنوع `Duration`. |
| المصادقة | إغلاق مسار demo authentication في بيئة الإنتاج حتى عند تمرير `E2E_DEMO_MODE=true`، مع إزالة بيانات الدخول التجريبية من واجهة تسجيل الدخول. |
| QR والحضور | إلزام رمز QR الموقع، والتحقق من ملكية الدرس والأكاديمية، ورفض الطلبات غير الموقعة أو غير المرتبطة بالنطاق الصحيح. |
| رفع الملفات | فحص Magic Bytes، روابط مؤقتة، تحقق من نطاق الأكاديمية، وتنظيف الكائن المرفوع عند فشل التسجيل أو إنشاء الرابط، مع فحص حصة التخزين الفعلية داخل bucket `homework`. |
| Stripe وPaymob | التحقق من التوقيع، rate limiting، idempotency، ومعالجة أحداث الاشتراك المحدثة، والدفع المتأخر، وحذف الاشتراك، مع تحديث الحالة المركزية. |
| تنبيهات الفوترة | إضافة خدمة ومسار cron محمي بـ`CRON_SECRET` لإنشاء تنبيه داخل التطبيق قبل سبعة أيام من التجديد أو عند `past_due`، مع منع التكرار ضمن النافذة الزمنية. |
| billing | عرض حالة الاشتراك، تاريخ التجديد، علامة الإلغاء، واستخدام التخزين الفعلي داخل لوحة billing. |
| الوثائق القانونية | تحديث `/privacy` و`/terms` بصياغة تشغيلية عربية تغطي الحسابات والبيانات والاشتراكات والمدفوعات والإلغاء والاستخدام المقبول والدعم، مع إبقاء تنبيه المراجعة القانونية. |
| التشغيل والنشر | إضافة `vercel.json` لجدولة cron اليومية، وتحديث `.env.example` و`LAUNCH_GUIDE.md` بقائمة الضبط الإنتاجي. |

## التحقق والاختبارات

نجح البناء المحلي والبعيد. أظهر سجل Vercel أن عملية `npm run build` اكتملت، وأن TypeScript مرّ دون أخطاء، وأن 30 صفحة ثابتة تم توليدها، وأن النشر اكتمل بنجاح.[2]

نجحت اختبارات Vitest الأساسية: `cross-tenant.test.ts` بعدد 9 اختبارات، و`integration.test.ts` بعدد 11 اختبارًا، و`business-logic.test.ts` بعدد 24 اختبارًا. أما `cross-tenant-route.test.ts` فتم التعرف على أنه يحتاج خادم E2E وبيانات Supabase حقيقية؛ عند تشغيله دون الخادم المطلوب فشل بسبب `fetch failed` مع بقاء اختباراته التسعة في حالة skipped، لذلك لا ينبغي اعتباره اختبارًا إنتاجيًا ناجحًا حتى يتم تشغيله ببيئة E2E مكتملة.

على خادم production محلي مع `NODE_ENV=production`، تم التحقق من الرفض التالي:

| الحالة | النتيجة |
|---|---:|
| Demo login في الإنتاج رغم تمرير `E2E_DEMO_MODE=true` | `503` مع رسالة أن demo authentication معطل في الإنتاج |
| cron دون Authorization | `401` |
| cron مع secret محلي صحيح لكن دون إعداد قاعدة البيانات | `503`، وهو فشل مغلق متوقع |
| Stripe webhook دون توقيع صحيح | `400` |
| Paymob webhook دون توقيع صحيح | `400` |

آخر نشر Vercel مرتبط مباشرة بالـcommit `e8dd3656d5aa96b64f444e19d128708882673e2d` وحالته **READY** في الإنتاج، مع عنوان المعاينة الخاص بالنشر: [my-academy-cebm6pude-mohamed-yahya.vercel.app](https://my-academy-cebm6pude-mohamed-yahya.vercel.app).[1] كان deployment محميًا بـVercel SSO أثناء الفحص العام، ولذلك تم الاعتماد على حالة النشر وسجل البناء، ولم يتم الادعاء بإتمام فحص health العام من خارج جلسة Vercel.

## المدخلات المطلوبة من مالك المنصة

| الأولوية | المطلوب | أين يُضبط | ملاحظات |
|---|---|---|---|
| عاجلة | `E2E_DEMO_MODE=false` | Vercel Production | يجب أن يظل مغلقًا في الإنتاج. الكود الآن يرفض demo في الإنتاج حتى لو أُرسل المتغير خطأ، لكن ضبطه صراحةً يمنع الالتباس. |
| عاجلة | `QR_SESSION_SECRET` | Vercel Production | قيمة عشوائية سرية لا تقل عن 32 حرفًا؛ لا تُعاد استخدام `SESSION_SECRET` معها. |
| عاجلة | `STRIPE_WEBHOOK_SECRET` | Vercel Production | يُنسخ من Stripe Dashboard endpoint الصحيح، ويجب أن يطابق endpoint المنشور. |
| عاجلة عند استخدام Paymob | `PAYMOB_HMAC_SECRET` و`PAYMOB_HMAC_FIELD_ORDER` | Vercel Production | القيم والترتيب يجب أن يطابقا إعداد Paymob الفعلي. |
| عاجلة | مفاتيح Supabase الحالية | Vercel Production | التأكد من `SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` أو الأسماء المعتمدة في المشروع، وعدم وضع service role key في متصفح العميل. |
| مهمة | `CRON_SECRET` | Vercel Production | قيمة عشوائية طويلة؛ تستخدمها Vercel Cron لحماية `/api/cron/billing-notifications`. |
| مهمة | `UPSTASH_REDIS_REST_URL` و`UPSTASH_REDIS_REST_TOKEN` | Vercel Production | اختياريان، لكنهما مطلوبان لتوحيد rate limiting بين نسخ Vercel المتعددة. بدونها يعمل fallback داخل الذاكرة لكل instance. |
| مهمة | `RESEND_API_KEY` وبيانات البريد إن كانت التنبيهات البريدية مفعلة | Vercel Production | لا يلزم مزود جديد للتنبيهات الداخلية، لكن البريد الخارجي يحتاج بيانات المزود والتحقق من النطاق. |
| عاجلة | bucket `homework` في Supabase Storage | Supabase | يجب أن يكون Private، مع مراجعة سياسات Storage للتأكد من أن الوصول يتم عبر روابط مؤقتة فقط. |
| قبل الإطلاق التجاري | مراجعة قانونية | المالك/مستشار قانوني | صفحات privacy وterms تشغيلية وليست بديلاً عن مراجعة قانونية محلية، خصوصًا ما يتعلق بحماية البيانات والاشتراكات في مصر. |

## خطوات التفعيل التي يجب تنفيذها يدويًا

أولًا، أضف الأسرار المطلوبة إلى بيئة **Production** في Vercel، ثم أعد deployment أو استخدم إعادة نشر آخر commit بعد حفظ المتغيرات. ثانيًا، تحقق من Stripe Dashboard وPaymob Dashboard بأن endpoints تشير إلى النطاق الإنتاجي وأن أسرار التوقيع مطابقة. ثالثًا، طبّق migrations الموجودة في `supabase/` على مشروع Supabase الإنتاجي بالترتيب الموثق، مع التأكد من وجود جداول `subscriptions` و`billing_events` و`notifications` وقيود RLS ذات الصلة. رابعًا، اختبر cron يدويًا من Vercel أو بطلب داخلي يحمل `Authorization: Bearer <CRON_SECRET>`، ثم راجع ظهور تنبيه تجريبي في `/billing`.

لا ينبغي استخدام حسابات العرض أو بيانات demo مع عملاء حقيقيين، ولا ينبغي إرسال أي أسرار عبر المحادثة أو commit إلى Git. كما يجب إلغاء أي Personal Access Token كان قد ظهر في تاريخ المستودع، ثم استخدام secret جديد محدود الصلاحيات.

## الحالة النهائية

الكود موجود على `main`، والـworking tree نظيف بعد الـcommit، والنشر الإنتاجي الأخير **READY**. بقيت إجراءات إعداد خارجية لا يمكن تنفيذها بأمان دون قيم المالك: أسرار Vercel وStripe وPaymob وSupabase، التحقق من خصوصية bucket، والمراجعة القانونية النهائية.

## المراجع

[1]: https://vercel.com/mohamed-yahya/my-academy-eg/7JDpYai6Pm3qpnqJnJvExCgv5RkB "Vercel deployment for commit e8dd365"
[2]: https://github.com/Mohamedyahyamohamed/my-academy.eg/commit/e8dd365 "GitHub commit e8dd365"
[3]: https://github.com/Mohamedyahyamohamed/my-academy.eg "MYAcademy source repository"
