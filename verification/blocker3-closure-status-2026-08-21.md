# تقرير حالة BLOCKER 3 — Private File Upload

**التاريخ:** 21 أغسطس 2026  
**المشروع:** MYAcademy — Production  
**الرابط:** https://my-academy-eg.vercel.app  
**القرار الحالي:** **BLOCKER 3 — CLOSED**

## الملخص التنفيذي

راجع Gemini Pro تنفيذ وأدلة رفع الملفات الخاصة، وكان قراره الأصلي **NO-GO** لأن بعض أدلة التشغيل الحية في Production لم تكن مكتملة. بعد تلك المراجعة، أُنجزت اختبارات Runtime لعزل Teacher وAssistant، ونُظّفت بيانات الاختبار الاصطناعية، ووُحّد حد bucket الواجبات مع عقد التطبيق عند 10MiB. اكتملت الآن أدلة التشغيل المتبقية: تشغيل Cron ناجح، Failure Injection حي يثبت `registryRetained=true`، ورفض رفع ملف 10MiB+1 من جلسة طالب مصادق عليها دون إنشاء submission.

> أُغلِق BLOCKER 3 بعد اكتمال الأدلة التشغيلية الحية المحددة. هذا لا يعلن أن المنصة كلها `READY`؛ بل يثبت إغلاق حاجز رفع الملفات الخاصة فقط.

## نتيجة مراجعة Gemini

المراجعة محفوظة في [محادثة Gemini Pro](https://gemini.google.com/app/be9254e05f223da8). وقد صنّفت MIME/Signature Spoofing كـ PASS، لكنها طلبت أدلة إضافية على حدود الصلاحية، وحد 10MiB الخادمي، وتشغيل Cron، وسلوك النظام عند فشل حذف Storage.

| المجال | الحالة بعد العمل الحالي | الدليل أو الملاحظة |
|---|---|---|
| عزل المستأجرين A/B | مثبت في الاتجاهات الموثقة | طلبات Runtime سابقة أعادت HTTP 404 عبر المستأجرين |
| Student A2 إلى ملف Student A1 | مثبت في الدليل المنشور | طلب Student 2 أعاد HTTP 404 في Deployment موثق |
| Teacher خارج نطاق المجموعة | مثبت Runtime | طلب تنزيل الملف `afc00000-0000-4000-8000-000000000202` أعاد `{"error":"File is unavailable"}` بدل الملف |
| Assistant خارج نطاق المدرس | مثبت Runtime | طلب تنزيل الملف `afc00000-0000-4000-8000-000000000201` أعاد `{"error":"File is unavailable"}` بدل الملف |
| Teacher/Assistant داخل النطاق الصحيح | مثبت | طلب سابق أعاد HTTP 200 للملف المسموح به |
| MIME/Signature Spoofing | PASS | الرفض الخادمي ظهر برسالة `Uploaded object failed file validation` مع عدم إنشاء file_id أو كائن متروك |
| حد 10MiB من واجهة المستخدم | PASS Runtime | ملف `10,485,761` بايت رُفض برسالة `File size must be 10 MB or less.` من جلسة Student 1، وتحقق DB أعاد `[]` للـsubmissions |
| حد 10MiB الخادمي | PASS بالكود + عدم تغيير | `createHomeworkUploadIntent` و`finalizeHomeworkUpload` يفرضان الحد الخادمي؛ مسار الواجهة أوقف الملف قبل signed upload ولم يُنشئ سجلًا أو كائنًا |
| تنظيف الـfixtures | PASS | كائن Storage غير موجود (`NoSuchKey`) وسجلا `files` و`homework` الاصطناعيان حُذفا، والتحقق أعاد `[]` |
| Cron التنظيف الدوري | PASS تشغيل يدوي | بعد تدوير السر، أعاد Production HTTP 200 مع `ok:true, scanned:1, removed:1, failed:0` |
| Failure Injection حي | PASS Production | أعاد HTTP 200 مع `simulatedStorageFailure:true` و`registryRetained:true` و`removed:0` |

## التغييرات المنفذة

تم إبقاء مسار الرفع المتوافق مع حد طلبات Vercel، مع الحفاظ على التحقق النهائي الخادمي في مرحلة finalize. محاولة نقل ملف الواجب كاملًا إلى Server Action لم تكن مناسبة؛ فقد اصطدمت بطبقة حد حجم الطلب في Vercel قبل وصول الطلب إلى منطق الرفض، ولذلك تم التراجع الآمن عن ذلك الجزء بدل ترك Production على مسار غير قابل للاستخدام.

تم توحيد إعداد bucket `homework` من `10,000,000` بايت إلى **10,485,760 بايت**، أي 10MiB بالضبط وفق عقد التطبيق. أُضيفت migration قابلة لإعادة التطبيق في `supabase/migrations/202608211805_homework_bucket_10mib.sql` ضمن [commit 63a8467](https://github.com/Mohamedyahyamohamed/my-academy.eg/commit/63a8467381632a86b4e071b563efdf82126a4877)، وظهر النشر المقابل في Vercel بحالة **READY** ضمن [Deployment](https://vercel.com/mohamed-yahya/my-academy-eg/J7L3Vd3tJsPcdawVYpKkaJHCaaFZ).

كما تم اختبار نطاق الصلاحيات بحسابي Teacher وAssistant على fixtures اصطناعية فقط. بعد ذلك حُذفت سجلات `homework_submissions` و`files` و`homework` و`groups` الخاصة بالـfixtures، وأزيل كائنان محددان من bucket `homework`. تحقق الفحص النهائي من عدم بقاء سجلات أو كائنات من هذه fixtures، ولم تُعدّل بيانات العملاء.

## فحوص البناء وProduction

| الفحص | النتيجة |
|---|---:|
| `pnpm exec vitest run` | 130 اختبارًا ناجحًا، 0 متجاوز |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm build` | PASS |
| `GET /` | HTTP 200 |
| `GET /api/health` | HTTP 200 |
| `GET /api/cron/cleanup-homework-files` بدون secret | HTTP 401 |
| آخر نشر Production للـmigration | READY |

تعني نتيجة HTTP 401 أن مسار Cron محمي. وقد أضيف لاحقًا دليل تشغيل يدوي صحيح بعد تدوير السر، فأعاد المسار `HTTP 200` مع `ok:true, scanned:1, removed:1, failed:0`. وبالمثل، يظل نجاح البناء والاختبارات الآلية مكملًا لا بديلًا عن أدلة Runtime.

## الفجوات اللازمة قبل الإغلاق

لا توجد فجوات متبقية ضمن نطاق BLOCKER 3. تم تنفيذ اختبار 10MiB+1 من جلسة Student 1 المصادق عليها، وتحقق DB من عدم إنشاء submission، كما تم تنفيذ Cron وFailure Injection في Production على fixture اصطناعي فقط.

## الحكم النهائي

**BLOCKER 3 — CLOSED.** اكتملت أدلة العزل، حد 10MiB، MIME/Signature، تنظيف الملفات اليتيمة، تشغيل Cron، وسلوك الاحتفاظ بسجل registry عند فشل Storage. لم تُعدّل بيانات العملاء ولم تُرسل WhatsApp/Email. هذا الحكم لا يساوي إعلان المنصة كلها `READY`؛ بل يخص حاجز رفع الملفات الخاصة فقط.

## المراجع

[1]: https://gemini.google.com/app/be9254e05f223da8 "مراجعة Gemini Pro لـ BLOCKER 3"
[2]: https://github.com/Mohamedyahyamohamed/my-academy.eg/commit/63a8467381632a86b4e071b563efdf82126a4877 "Commit توحيد حد bucket عند 10MiB"
[3]: https://vercel.com/mohamed-yahya/my-academy-eg/J7L3Vd3tJsPcdawVYpKkaJHCaaFZ "نشر Vercel Production بحالة READY"
[4]: https://my-academy-eg.vercel.app "Production MYAcademy"
[5]: https://github.com/Mohamedyahyamohamed/my-academy.eg/commit/a5bfd4b8d5b514da8880f9093e7b80000544b3ac "إصلاح Failure Injection"
[6]: https://github.com/Mohamedyahyamohamed/my-academy.eg/commit/2612ef3bca5f50b0b883237a7c2756a79bfbf28f "إزالة مسار Failure Injection المؤقت"
