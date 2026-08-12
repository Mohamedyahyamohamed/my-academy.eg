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
| `WHATSAPP_API_VERSION` | إصدار Graph API (افتراضي `v21.0`) | اختياري |

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
