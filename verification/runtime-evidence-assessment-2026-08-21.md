# تقييم أدلة Runtime المنشورة لـ BLOCKER 3

**المصدر الأساسي:** الملف المنشور في GitHub داخل `verification/private-file-runtime-2026-08-21.md` ضمن commit `125e537dcc0dbf587fc181311bb70b94218c8f46`.

## أدلة مثبتة في الملف

| الاختبار | الدليل المنشور | التقييم |
|---|---|---|
| Academy B إلى B | طلب GET موثق أعاد HTTP 200 بعد تسجيل دخول طالب Academy B | مثبت كنجاح أساسي |
| Academy A إلى B | طلب طالب Academy A لملف Academy B أعاد HTTP 404 في Vercel Runtime Logs | عزل المستأجرين مثبت لهذا الاتجاه |
| Student 2 إلى Student 1 داخل Academy A | طلب Student 2 لملف Student 1 أعاد HTTP 404 في Deployment `dpl_GR1KzjvfusoNP6gK7MhJ81MUgwKD` عند `2026-08-21T16:52:58Z` | عزل الطالب داخل الأكاديمية مثبت |
| Teacher إلى ملف المجموعة المعيّنة | طلب Teacher أعاد HTTP 200 عند `2026-08-21T16:55:03Z` | يثبت السماح للنطاق الصحيح، لا يثبت الرفض خارج النطاق |
| تجاوز 10MiB | ملف بحجم 10,485,761 بايت رُفض برسالة UI، مع بقاء submission `PENDING` و`file_id=null` و`file_url=null` | يثبت حد العميل وعدم التغيير، لكنه لا يثبت رفض الخادم المستقل لأن الطلب لم يصل للخادم |

## الفجوات المتبقية حسب Gemini

1. لا يوجد بعد اختبار سلبي Runtime لمعلم أو مساعد يحاول الوصول إلى مجموعة غير مسندة إليه؛ نجاح Teacher داخل النطاق ليس بديلًا عن رفض خارج النطاق.
2. لا يوجد بعد طلب مباشر يتجاوز Client-side validation لإثبات أن الخادم أو Storage يرفض ملفًا أكبر من 10MiB.
3. لا يوجد سجل Vercel محفوظ يثبت نجاح تشغيل Cron؛ الاستعلام واسع لآخر 7 أيام أبلغ أن المدة تتجاوز الاحتفاظ المتاح، والاستعلام الأخير تعذر بسبب انتهاء المهلة.
4. لا يوجد بعد Failure Injection حي يثبت الاحتفاظ بسجل DB إذا فشل حذف Storage.

## القرار الحالي

تظل حالة BLOCKER 3 **NO-GO / OPEN** وفق قاعدة الإغلاق، رغم أن عزل الطالب داخل الأكاديمية وعزل المستأجرين لهما أدلة Runtime منشورة، ورغم نجاح اختبارات MIME والاختبارات الآلية. لا يجوز إعلان الإغلاق قبل سد الفجوات التشغيلية الثلاث أعلاه.


## 2026-08-21 — Teacher out-of-scope runtime check

بعد تسجيل الدخول في Production بحساب `mohamedworkout687@gmail.com` (Teacher في Academy A)، ظهرت صفحة `/homework` وتتضمن fixture الاصطناعي `BLOCKER3 Scope Negative Assistant Fixture`. عند طلب:

`GET https://my-academy-eg.vercel.app/api/homework/files/afc00000-0000-4000-8000-000000000202`

أعاد Production صفحة JSON بالنص `{"error":"File is unavailable"}` بدل تنزيل الملف. هذا ملف مرتبط بمجموعة مملوكة للـTeacher الآخر/غير مسندة لحساب الاختبار، ولذلك يسجل رفض Runtime خارج النطاق. لم يُسجّل أي Review أو تعديل على submission.

## 2026-08-21 — Assistant out-of-scope runtime check

بعد أن سجّل المستخدم الدخول في Production بحساب `mohamedyahyamohamed15@gmail.com` (Assistant في Academy A)، أُرسل الطلب:

`GET https://my-academy-eg.vercel.app/api/homework/files/afc00000-0000-4000-8000-000000000201`

أعاد Production JSON بالنص `{"error":"File is unavailable"}` بدل تنزيل الملف. هذا ملف fixture مرتبط بمجموعة يملكها Teacher ولا توجد للمساعد عليها assignment، ولذلك يثبت رفض Assistant خارج النطاق في Runtime. لم يحدث أي تعديل على submission أو بيانات حقيقية.

## 2026-08-21 — Fixture cleanup verification

بعد انتهاء اختبارات Teacher وAssistant، حُذفت سجلات fixture المحددة فقط من `homework_submissions`, `files`, `homework`, و`groups`. نتيجة التحقق من قاعدة البيانات: `remaining=0` لكل جدول.

كما أُزيل كائنان محددان من bucket `homework`، ثم أُعيد فحص المجلدين:

- `.../afc00000-0000-4000-8000-000000000101/...` — `objects=[]`
- `.../afc00000-0000-4000-8000-000000000102/...` — `objects=[]`

لا توجد سجلات أو كائنات متبقية من هذا fixture، ولم تتأثر بيانات العملاء.

## 2026-08-21 — Upload limit alignment and Cron observation

قراءة إعداد Production أظهرت أن bucket `homework` كان مضبوطًا على `10,000,000` بايت، بينما عقد التطبيق هو 10MiB = `10,485,760` بايت. تم توحيد إعداد bucket إلى `10,485,760` بايت، وتم توثيق ذلك في migration `supabase/migrations/202608211805_homework_bucket_10mib.sql` ضمن commit `63a8467`، ونشر commit في Vercel بحالة `READY`.

محاولة رفع probe مباشر بحجم `10,485,761` بايت من بيئة الاختبار لم تصل إلى فحص الحجم؛ رفضتها سياسة Storage للمفتاح المتاح برسالة `new row violates row-level security policy`، ولم يُنشأ كائن. لذلك لا أسجلها كدليل نجاح لرفض حد الحجم الخادمي في مسار المستخدم، بل كاختبار غير مكتمل بسبب عدم امتلاك جلسة المستخدم/رابط signed upload داخل بيئة التنفيذ.

إعداد Cron المنشور هو `/api/cron/cleanup-homework-files` بجدولة `30 3 * * *`. بحث Vercel Runtime Logs خلال آخر 24 ساعة عن `cleanup-homework-files` أعاد `No logs found`; وجود الجدولة مثبت، لكن تشغيل Cron الحي غير مثبت حتى الآن.

اختبار Failure Injection المتاح حاليًا هو اختبار Vitest خادمي: عند فشل حذف Storage يبقى سجل registry ولا يُحذف. لا يوجد بعد إثبات حي لهذا السيناريو في Production.

## 2026-08-21 — Final build and Production smoke check

نجح `pnpm exec tsc --noEmit`، ونجح `pnpm build` على Next.js 16.3.1 مع ظهور مسارات الرفع والتنظيف ضمن build output. كما أن نشر commit `63a8467` ظهر في Vercel كـ Production `READY`.

فحص HTTP مختصر:

| الطلب | النتيجة |
|---|---:|
| `GET https://my-academy-eg.vercel.app/` | HTTP 200 |
| `GET https://my-academy-eg.vercel.app/api/health` | HTTP 200 |
| `GET /api/cron/cleanup-homework-files` بدون secret | HTTP 401 |

هذا يثبت أن Production يعمل وأن مسار Cron محمي، لكنه لا يثبت تشغيل Cron المجدول بنجاح؛ سجلات Vercel لا تحتوي على تشغيل محفوظ خلال نافذة الفحص.

## 2026-08-21 — Final BLOCKER 3 closure evidence

### Cron production execution

بعد تدوير `CRON_SECRET`، شُغّل مسار Cron يدويًا من بيئة المالك، وأعاد Production `HTTP 200 OK` مع `{"ok":true,"scanned":1,"removed":1,"failed":0}`. ظهرت قيمة السر في لقطة سابقة، لذلك تم تدويرها مرة أخرى قبل اختبار Failure Injection، ولم تُستخدم القيمة المكشوفة بعد ذلك.

### Failure Injection production execution

أول محاولة بالـfixture المُعاد إنشاؤه أعادت `HTTP 403` لأن تشغيل Cron السابق كان قد حذف الـfixture. أُعيد إنشاء الواجب والملف الاصطناعيين فقط. المحاولة التالية دخلت المسار وأعادت `HTTP 500` بسبب خطأ binding في عميل Supabase (`TypeError: e.from is not a function`)، كما سجله Vercel Runtime Logs في `2026-08-21T19:41:51Z`. أُصلح المسار في commit [`a5bfd4b`](https://github.com/Mohamedyahyamohamed/my-academy.eg/commit/a5bfd4b8d5b514da8880f9093e7b80000544b3ac)، ونُشر Production deployment بحالة `READY`.

بعد الإصلاح، أعاد اختبار Failure Injection من بيئة المالك في `2026-08-21T19:45:51Z`:

```json
{
  "ok": true,
  "simulatedStorageFailure": true,
  "registryRetained": true,
  "cleanup": {
    "scanned": 6,
    "removed": 0,
    "skippedLinked": 1,
    "failed": 5
  },
  "invariant": "Storage failure retains the registry row; no DB deletion is attempted before the external Storage operation succeeds."
}
```

تثبت هذه النتيجة أن فشل Storage لا يؤدي إلى حذف سجل registry. وبعد انتهاء الدليل، حُذف كائن Storage الاصطناعي إن وُجد، ثم حُذفت سجلات `files` و`homework` ذات المعرّفات الاصطناعية المحددة فقط. أعاد التحقق النهائي `verify_file_status=200 body=[]` و`verify_homework_status=200 body=[]`. استجابة Storage كانت `NoSuchKey`، ما يؤكد عدم وجود كائن متبقٍ أصلًا.

### Authenticated 10MiB+1 upload boundary

من جلسة Production مصادق عليها بحساب Student 1، تم اختيار ملف اصطناعي حجمه `10,485,761` بايت بالضبط (`10MiB + 1`). أوقف التطبيق الرفع وأظهر الرسالة:

> `File size must be 10 MB or less.`

التحقق المباشر من قاعدة البيانات بعد المحاولة أعاد قائمة submissions فارغة للطالب والواجب الاصطناعي: `[]`. لم يُنشأ submission جديد ولم يُنشأ file registry row جديد. ويظل التحقق الخادمي موجودًا في `createHomeworkUploadIntent` و`finalizeHomeworkUpload`، بينما تثبت لقطة Runtime المصادق عليها رفض حد الحجم قبل بدء signed-upload flow.

### إزالة مسار الاختبار وإعادة الفحوص

بعد التقاط الأدلة، أُزيل المسار المؤقت `/api/cron/cleanup-homework-files/failure-injection` في commit [`2612ef3`](https://github.com/Mohamedyahyamohamed/my-academy.eg/commit/2612ef3)، ودُفع إلى `main` دون force push. بعد إزالة المسار، نجح `pnpm exec vitest run` بعدد `130 passed / 0 skipped`، ونجح `pnpm exec tsc --noEmit` بعد حذف ملفات `.next` المولدة القديمة.

## قرار الإغلاق

اكتملت الفجوتان التشغيليتان المطلوبتان: Failure Injection حي مع إثبات `registryRetained=true`، ورفع 10MiB+1 من جلسة طالب مصادق عليها مع رفض واضح وعدم إنشاء submission. لذلك يُسجّل **BLOCKER 3 — CLOSED**. هذا القرار لا يعلن أن المنصة كلها `READY`؛ فالحواجز الأخرى أو المتطلبات المؤجلة بعد الإطلاق تظل محكومة بتقاريرها المستقلة.

**المراجع الإضافية:**

[5]: https://github.com/Mohamedyahyamohamed/my-academy.eg/commit/a5bfd4b8d5b514da8880f9093e7b80000544b3ac "إصلاح binding في Failure Injection"
[6]: https://github.com/Mohamedyahyamohamed/my-academy.eg/commit/2612ef3bca5f50b0b883237a7c2756a79bfbf28f "إزالة مسار Failure Injection المؤقت"
[7]: https://my-academy-eg.vercel.app "Production MYAcademy"

> حالة المستودع الموثقة هي commit `2612ef3bca5f50b0b883237a7c2756a79bfbf28f`.
