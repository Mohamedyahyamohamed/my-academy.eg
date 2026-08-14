# 🔔 تكامل واتساب (WhatsApp Cloud API)

تم ربط النظام بـ **WhatsApp Cloud API** من Meta. الأكاديمية تبعت إشعارات
لأولياء الأمور عبر واتساب عند: تسجيل الدرجات، تسجيل الدفعات، وغياب الطلاب.

---

## ✅ اللي اتعمل

| الملف | الوظيفة |
|------|---------|
| `lib/whatsapp.ts` | المرسل الأساسي: قوالب + نص حر + تحويل أرقام لمصرية |
| `services/whatsapp.ts` | خدمات الأكاديمية: جلب موبايل ولي الأمر + إرسال موجّه |
| `app/api/whatsapp/test/route.ts` | endpoint للاختبار: `/api/whatsapp/test?to=2010xxxxxxxx` |
| `app/actions/grades.ts` | إشعار واتساب لأولياء الطلاب المُقيّمة درجاتهم |
| `app/actions/payments.ts` | إشعار واتساب لولي أمر الطالب بعد تسجيل دفعة |
| `app/actions/attendance.ts` | إشعار واتساب لأولياء الطلاب **الغائبين** |

---

## 🔑 متغيرات البيئة المطلوبة (Vercel → Settings → Environment Variables)

| المتغير | القيمة | إجباري؟ |
|---------|--------|---------|
| `WHATSAPP_TOKEN` | Access Token (دائم أو مؤقت) | ✅ نعم |
| `WHATSAPP_PHONE_NUMBER_ID` | `1259123917281557` | ✅ نعم |
| `WHATSAPP_NOTIFICATION_TEMPLATE` | اسم قالب معتمد (مثل `hello_world`) | اختياري |
| `WHATSAPP_TEMPLATE_LANG` | كود اللغة (افتراضي `ar`) | اختياري |
| `WHATSAPP_API_VERSION` | إصدار Graph API (افتراضي `v26.0`) | اختياري |
| `WHATSAPP_MODE` | `live` لتفعيل الإرسال الفعلي؛ القيمة الافتراضية الآمنة `demo` | ✅ للتفعيل |
| `WHATSAPP_QR_AUTO_SEND` | `true` لتسليم QR تلقائيًا عند إنشاء الطالب | ✅ للتفعيل |
| `WHATSAPP_QR_RECIPIENT` | `student` لإرسال QR لرقم الطالب، أو `parent` لرقم ولي الأمر | اختياري |
| `WHATSAPP_STUDENT_QR_TEMPLATE` | اسم قالب Utility معتمد له image header؛ يفضّل ضبطه للرسائل التي تبدأها الأكاديمية | اختياري، لكنه موصى به |

---

## 🪪 إرسال QR الطالب تلقائيًا

بعد إنشاء طالب جديد من شاشة الطلاب، يقرأ النظام رقم الهاتف المسجل في حقل الطالب ويرسل إليه صورة PNG تحتوي على نفس QR المستخدم في شاشة الحضور (`MA:<studentId>`). العملية لا تمنع حفظ الطالب إذا كان واتساب غير مضبوط أو فشل الإرسال، وتُسجل النتيجة في `whatsapp_message_logs` تحت الحدث `STUDENT_QR`.

لتفعيل ذلك في Vercel Production، اضبط `WHATSAPP_MODE=live` و`WHATSAPP_QR_AUTO_SEND=true`. الإعداد الافتراضي للمستلم هو `student`. ولحماية الإرسال، يجب أن تكون موافقة واتساب مسجلة في نموذج الطالب؛ وإذا اخترت `parent` فيجب أن يكون ولي الأمر لديه سجل opt-in فعال في `whatsapp_preferences`.

هذا المسار يستخدم رفع الوسيط إلى Meta ثم إرسال صورة، وبعدها يحاول حذف الوسيط من Meta. عند ضبط `WHATSAPP_STUDENT_QR_TEMPLATE` يستخدم النظام قالبًا معتمدًا يحتوي على `image header`، ويضع اسم الطالب في body parameter اختياري. إذا تُرك المتغير فارغًا يستخدم image message مباشرًا، وهو مناسب فقط عندما تسمح نافذة المحادثة بذلك. أنشئ القالب في WhatsApp Manager كنوع Utility، واجعل الصورة في Header، وأضف متغيرًا نصيًا في Body إذا أردت عرض اسم الطالب.

---

## 🧪 الاختبار

بعد ضبط متغيرات البيئة، افتح في المتصفح وأنت مسجّل دخول كـ ADMIN:

```
https://my-academy-eg.vercel.app/api/whatsapp/test?to=2010xxxxxxxx
```

استبدل `2010xxxxxxxx` برقمك (بدون + أو مسافات). النتيجة المتوقعة:

```json
{ "to": "2010xxxxxxxx", "ok": true, "messageId": "wamid.HBg..." }
```

وهتوصلك رسالة واتساب (قالب hello_world).

---

## 📝 ملاحظة مهمة: القوالب (Templates)

واتساب يفرّق بين نوعين من الرسائل:

1. **Business-initiated** (الأكاديمية تبدأ): **تتطلب قالب معتمد**.
2. **Service** (خلال 24 ساعة من رسالة العميل): نص حر مسموح.

بشكل افتراضي، إن لم يُضبط `WHATSAPP_NOTIFICATION_TEMPLATE`، النظام يرسل
نصًا حرًا — وهذا يعمل فقط لو ولي الأمر راسل الأكاديمية خلال آخر 24 ساعة.

### إنشاء قوالب مخصصة (للإشعارات الحقيقية)

1. افتح **WhatsApp Manager** → Account tools → **Message templates**.
2. اضغط **Create template** → النوع: **UTILITY**.
3. مثال لقالب "درجة جديدة" بالعربي:
   - الاسم: `grade_update`
   - اللغة: العربية
   - النص: `نتشرف بإعلامكم بأنه تم تسجيل درجات جديدة لابنكم/ابنتكم في منصة أكاديميتي.`
4. أرسل للمراجعة (تستغرق ساعات/أيام).
5. بعد الاعتماد: اضبط `WHATSAPP_NOTIFICATION_TEMPLATE=grade_update`.

---

## 🔧 الحصول على Access Token دائم

1. https://business.facebook.com/settings/users → **System Users**.
2. أضف System User (role: Admin) أو استخدم الموجود.
3. Add assets: Apps (Manage app) + WhatsApp Business Accounts (Manage phone numbers).
4. **Generate new token** → نسخه وضعه في `WHATSAPP_TOKEN`.
