# دليل اختبار دور Teacher — 19 أغسطس 2026

## `/teacher`

تم الدخول بحساب Teacher تجريبي، وظهرت لوحة عربية RTL بعنوان أحمد حسن. ظهرت إجراءات وروابط الحضور، الحصص، المجموعات، الطلاب، الواجبات، المحتوى التعليمي، الدرجات، الرسائل والدعم. ظهرت أرقام تشغيلية: 5 مجموعات، 12 طالبًا، وحصتان قادمتان. لم تُرسل رسالة ولم يُنشأ أو يُعدّل سجل.

## `/groups`

فتح المسار بنجاح داخل الجلسة. ظهرت 5 مجموعات تخص المعلم، من بينها QR Demo - Active Now وQR Demo - Later Today وQR Demo - Tomorrow وDemo Group 01 - Morning وDemo Group 09 - Morning. ظهر زر `مجموعة جديدة`، ولم يتم الضغط عليه. التوقيتات ظهرت بصيغة 12 ساعة بالعربية في البطاقات، مع بعض أسماء الأيام الإنجليزية داخل بيانات الديمو.

## `/lessons`

فتح المسار بنجاح وظهرت أدوات `إضافة حصة` والبحث والتصفية (`كل الحصص`، `القادمة`، `السابقة`). لكن القائمة نفسها عرضت `لا توجد حصص بعد` رغم ظهور حصص قادمة على لوحة `/teacher`. هذه ملاحظة وظيفية تحتاج تحقيقًا؛ لم يتم الضغط على `إضافة حصة` ولم يتم تغيير أي بيانات.

## `/attendance`

فتح المسار بنجاح. ظهر رابط `امسح أكواد الطلاب (QR)`، وقائمة المجموعات الخمس، وقائمة الحصص. واجهة الحضور تطلب اختيار المجموعة ثم الحصة قبل بدء التسجيل. لم يتم اختيار حصة أو تسجيل حضور لتجنب تعديل بيانات الإنتاج، لذلك اختبار أول scan والتكرار وwrong group/offline ما زال Blocked إلى اختبار ميداني آمن.

## `/homework`

فتح المسار بنجاح. ظهرت أزرار `إضافة واجب` والبحث والتصفية حسب المجموعة، مع قائمة المجموعات الخمس. ظهرت رسالة `لا توجد واجبات بعد`. لم يتم إنشاء واجب أو إرسال إشعار.

## `/teacher/content`

فتح المسار بنجاح. ظهرت دورتان، 5 مجموعات، و0 دروس. ظهرت دورة `QA Upload Test Course 2026-08-17` كمسودة ودورة `Operating Demo Course` كمنشورة. ظهرت واجهة إنشاء دورة تحتوي عنوانًا ووصفًا واختيار مجموعة وخيار النشر الفوري. لم يتم الضغط على `إنشاء الدورة` ولم يتم رفع ملف.

## `/grades`

فتح المسار بنجاح وظهرت أزرار `اختبار جديد` ورسالة `لا توجد اختبارات بعد`. لم يتم إنشاء اختبار أو إدخال درجة.

## `/students`

فتح المسار بنجاح. ظهرت أدوات `استيراد من Excel` و`حسابات الطلاب` و`حسابات الأهالي` و`إضافة طالب`، والبحث والتصفية بالحالة والمجموعة. ظهرت الصفحة `1–8 من 12` طالبًا، مع إجراءات عرض/تعديل/أرشفة. لم يتم الضغط على أي إجراء تغييري أو تنفيذ استيراد.


## `/students/import`

فتح المسار بنجاح. الواجهة تذكر `ارفع ملف CSV أو الصق البيانات`، وتعرض input من نوع file، وزر تنزيل قالب Excel، ومربع لصق، وزر `استيراد الطلاب`. التعليمات تذكر الأعمدة `first_name,last_name,phone,grade,school,parent_name,parent_phone` والحد الأقصى 1000 طالب للعملية. لا يوجد اختيار XLSX مباشر؛ المطلوب حفظ Excel كـCSV. لم يتم رفع أو استيراد أي ملف.


## `/messages`

فتح المسار بنجاح وظهرت رسالة `لا توجد جهات اتصال بعد`. لم تتم كتابة أو إرسال أي رسالة، لذلك لا يوجد دليل تسليم Email أو WhatsApp من هذه الجلسة.


## `/api/search`

داخل جلسة المعلم، `GET /api/search?q=full-smoke-nonexistent-20260819` أعاد `{"results":[]}`. هذا يثبت استجابة JSON scoped للاستعلام الاصطناعي؛ لم يتم البحث عن بيانات شخصية.


## تبديل اللغة

تم الضغط على زر `EN` داخل لوحة المعلم. تحولت عناصر التنقل والعناوين المساعدة إلى الإنجليزية (`Dashboard`, `My Groups`, `Lessons`, `Attendance`, `Homework`, `Educational Content`, `Grades`, `Students`, `Messages`, `Help & Support`)، لكن محتوى لوحة البيانات وبعض العناوين والتواريخ بقي بالعربية. النتيجة: **Partial / Localization defect**؛ التبديل يعمل دون إعادة تسجيل الدخول، لكنه ليس ترجمة كاملة للصفحة. لم يتم تعديل بيانات.


إعادة التبديل إلى العربية نجحت. ملاحظة تصحيحية: نتيجة العرض النصي بعد النقر الأول كانت لقطة مختلطة بسبب إعادة التصيير؛ عند التبديل إلى الإنجليزية ظهرت لوحة المعلم باللغة الإنجليزية فعليًا (`MY Academy — Run your academy with clarity and ease`, `Welcome`, `Quick actions`, `My groups`, `Upcoming lessons`, `Average attendance`, والتواريخ بصيغة `AM/PM`). ثم عادت العربية بنجاح. **Language switch: Pass على لوحة المعلم.**


## مراجعة رفع الملفات — code path

`app/actions/upload.ts` يفرض حدًا فعليًا قدره 10MB لملفات homework، ويرفض الملف الفارغ أو الأكبر، ويتحقق من signature وامتداد ونوع PDF/PNG/JPEG/WEBP. كما يفرض `academy_id` على homework/group/student، ويتحقق من enrollment، ويستخدم مسار Storage يبدأ بـ`{academy_id}/...`، ويسجل الملف مع `academy_id`، وينشئ signed URL لمدة ساعة، ويزيل الملف إذا فشل تسجيله أو إنشاء الرابط. لذلك اختبار runtime للرفع والعزل ما زال مطلوبًا، كما أن دعم 500MB غير متحقق لهذا المسار.


## استيراد الطلاب — code path

واجهة `/students/import` تقبل ملف `.csv` أو لصق النص فقط؛ عبارة Excel في العنوان تعني الحفظ من Excel بصيغة CSV، وليس رفع XLSX أصليًا. الحد المعلن والمفروض هو 1000 صف في العملية، مع منع التكرار بالاسم/الهاتف، إنشاء ولي أمر اصطناعي عند الحاجة، وإرجاع `created` و`skippedDup` و`errors` لكل صف. العملية ليست transaction واحدة؛ قد تُنشئ بعض الصفوف ثم تُرجع أخطاء للصفوف الأخرى. لم أشغّل استيراد 100+ على الإنتاج لأنه سيضيف بيانات فعلية؛ يحتاج بيئة اختبار أو fixture مخصص قبل إثبات عدم فقدان البيانات.


## QR attendance

المسار `/attendance/scan` فتح بنجاح داخل جلسة Teacher. ظهرت أزرار «مسح سريع (الدرس الجاري)»، «اختيار الدرس يدويًا»، و«ابدأ المسح بالكاميرا»، مع سجل حضور فارغ. لم يتم تشغيل الكاميرا أو تسجيل حضور؛ اختبار أول مسح/تكرار/مجموعة خاطئة/offline/refresh ما زال Blocked ويحتاج هاتفًا فعليًا وQR اصطناعيًا في جلسة اختبار.


## Billing بحساب Teacher

المسار `/billing` فتح بنجاح، وعرض الخطة الحالية المجانية وحدود الطلاب/المجموعات/التخزين، وخيارات مدرس أساسي واحترافي وبلس. لم أضغط «اختيار الخطة» ولم أبدأ checkout، لذلك الدفع والـwebhook ما زالا غير مثبتين runtime في هذا الفحص.


## Role boundary: Teacher → `/parent`

محاولة فتح `https://my-academy-eg.vercel.app/parent?full-smoke=20260819` أثناء جلسة Teacher أعادت المتصفح إلى `/teacher`، وبقيت بيانات المعلم فقط ظاهرة. لم تُعرض لوحة Parent ولم يحدث أي تعديل.

## 2026-08-19 — Billing Sandbox attempt

- Session: authenticated Teacher (`/teacher`), workspace shown as an independent teacher.
- Action: with user confirmation, selected the Basic Teacher plan (99 EGP/month) to initiate a Sandbox checkout only; no card details were entered and no payment was confirmed.
- Result: the button entered a loading state, then returned to `/billing` with the Arabic error `الخطة المحددة غير متاحة لنوع مساحة العمل الحالية.`
- Safety: no payment page opened, no card entered, no transaction confirmed, and no subscription changed.
- Functional status: **FAIL/BLOCKED for this account type**. The complete checkout plus webhook flow remains unproven; either paid plans are intentionally restricted to academy workspaces or billing eligibility/plan mapping needs correction and testing with an eligible academy-owner account.

## 2026-08-19 — QR and import boundaries

- QR scan UI loaded at `/attendance/scan`; camera/manual controls were visible, but physical camera scan and attendance write were not executed.
- Student import UI loaded; the production surface accepts CSV/paste and documents a 1000-row limit; direct `.xlsx` upload was not present.
- Upload code review documented a 10MB application validation cap despite the configured larger request-body allowance; large-file runtime and Storage isolation remain unproven.

## 2026-08-19 — Role boundary

- Authenticated Teacher opening `/parent` was redirected to `/teacher`; no Parent dashboard was exposed.
- Authenticated Teacher opening `/billing` could view billing, but plan selection was rejected by workspace-type eligibility before checkout.

## 2026-08-19 — Localization

- Teacher navigation switched to English and back to Arabic without a new login. Navigation translated successfully; the final browser evidence records the Teacher dashboard switch as Pass, while complete translation of every route remains unproven.

## 2026-08-19 — Safe negative integration checks

- Unauthenticated/synthetic invalid requests to protected push, WhatsApp, and webhook surfaces were rejected without sending messages or changing records. Positive delivery and webhook activation remain unproven because they require a configured Sandbox transaction/message flow.
