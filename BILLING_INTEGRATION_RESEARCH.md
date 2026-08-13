# ملاحظات بحث تكامل الفوترة

## Paymob

تؤكد وثائق Paymob أن مزود الخدمة يرسل إشعارات المعاملات عبر **Webhook / Callback**، وأن التحقق الأمني يعتمد على **HMAC**. يجب أن يستقبل التطبيق إشعار الدفع على مسار خادم عام، ويتحقق من التوقيع قبل تغيير حالة أي اشتراك أو فاتورة. لا يجوز اعتماد قيمة نجاح الدفع المرسلة من المتصفح.

المصادر الرسمية:

1. [Webhook (Callbacks) & HMAC — Paymob Developers](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac)
2. [Paymob APIs: Callback Security (HMAC)](https://developers.paymob.com/paymob-docs/integration-paths/apis)
3. [Webhook Testing Tool — Paymob Developers](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/webhook-testing-tool)

**قرار التصميم:** سيُجهّز MY Academy نقطة استقبال خادمية مخصصة للتحقق من HMAC، مع معالجة مكررة آمنة بالاعتماد على المعرّف الخارجي للمعاملة، لكن لن تُفعّل أي بوابة أو يُخزن سر فعلي قبل أن يربط المالك حساب Paymob.

## Stripe

تؤكد وثائق Stripe أن استقبال أحداث الاشتراك والدفع يتم عبر Webhook، وأنه يجب التحقق من توقيع `Stripe-Signature` باستخدام جسم الطلب الخام وسر نقطة الويب هوك. لذلك سيعالج التطبيق أحداث الاشتراك والفواتير على الخادم فقط وبصورة مكررة آمنة.

المصادر الرسمية:

1. [Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks)
2. [Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks)
3. [Stripe webhook signature verification](https://docs.stripe.com/webhooks/signature)

**قرار التصميم:** سيُجهّز مسار Stripe اختياريًا؛ يبقى غير فعّال ما لم يضف المالك مفاتيح Stripe وسر توقيع الويب هوك في متغيرات الإنتاج.

### ملاحظة تنفيذية

أظهر الاستخراج النصي لصفحة Paymob الرسمية تأكيد وجود Transaction Callbacks، لكن لم يعرض قائمة الحقول المرتبة اللازمة لحساب HMAC. لذلك سيعتمد مسار Paymob في هذه المرحلة على **مفتاح HMAC مُعدّ من البيئة** وعلى طبقة تحقق معزولة قابلة للتحديث؛ وسيُراجع ترتيب الحقول النهائي من لوحة Paymob/دليل الحساب عند الربط الفعلي بدلاً من تخمينه أو تفعيل بوابة بدعوى غير موثقة.

### ربط المعاملة في Paymob

توضح وثائق **Create Intention** أن `special_reference` يُعاد في رد المعاملة تحت `merchant_order_id`، وأن `extras` تُعاد ضمن `payment_key_claims`. لذلك سيضع التطبيق معرف الأكاديمية والخطة داخل مرجع خاص بصيغة يمكن التحقق منها، ولن يستخدم بريد العميل أو بيانات الواجهة لتحديد المستأجر. كما ستُستخدم `notification_url` لمسار الويب هوك الخادمي و`redirection_url` لصفحة نجاح مرئية لا تمنح اشتراكًا بذاتها.[^paymob-intention]

[^paymob-intention]: [Create Intention — Paymob Developers](https://developers.paymob.com/paymob-docs/intention-apis/create-intention)

تؤكد نتائج البحث في بوابة Paymob ومواد التكامل أن تحقق ردود المعاملات يستعمل **HMAC-SHA512** على حقول محددة وبترتيب ثابت. ستبقى قيمة التوقيع والتحقق المقارن بزمن ثابت ضمن طبقة منفصلة؛ ولن يعتمد التطبيق أي رد آتٍ من المتصفح أو ينشّط بوابة Paymob دون اختبار رد حقيقي من بيئة التاجر.[^paymob-hmac]

[^paymob-hmac]: [Webhook (Callbacks) & HMAC — Paymob Developers](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac)

## Paymob Unified Checkout verification (2026-08-13)

The official Checkout Experiences documentation states that Unified Checkout is a hosted redirection flow. The merchant backend must first create an Intention; Paymob returns a unique client secret which starts the hosted checkout. The exact checkout URL template, payment-method identifiers and the HMAC field-order must be copied from the merchant's active Paymob dashboard/API Explorer into environment variables before enabling live payments. Source: https://developers.paymob.com/paymob-docs/developers/checkout-experiences/overview

## Paymob Create Intention contract (verified 2026-08-13)

For Egypt, the documented base URL is `https://accept.paymob.com/`; creation is `POST /v1/intention/`, authorized with `Authorization: Token <secret_key>`. The required request fields are `amount` in piastres, `currency`, and `payment_methods`; documented correlation fields are `extras`, `special_reference`, `notification_url`, and `redirection_url`. The response exposes `intention_order_id`, `id`, `client_secret`, `extras`, and `special_reference`. Source: https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention
