# WhatsApp Cloud API — قواعد تنفيذ MY Academy

تمت مراجعة وثائق Meta الرسمية في 13 أغسطس 2026. سيبقى تكامل MY Academy في وضع العرض ما لم توجد متغيرات البيئة المطلوبة، ولن يرسل أي رسالة فعلية بصورة صامتة.

| قاعدة | أثرها في التنفيذ |
|---|---|
| يلزم الحصول على موافقة صريحة من المستلم قبل إرسال الرسائل. | نسجل تفضيل WhatsApp ووقت الموافقة، ولا نرسل تنبيهات تلقائية إلى رقم غير موافق. |
| الرسائل الحرة مسموحة فقط أثناء نافذة خدمة العميل التي تبلغ 24 ساعة بعد رسالته أو اتصاله. | كل تنبيه آلي خارج النافذة يستخدم قالب Meta معتمدًا. |
| طلب الإرسال المقبول لا يثبت التسليم؛ حالة التسليم تصل عبر webhook. | نسجل رقم الرسالة وحالة الإرسال، ونقبل تكرار webhook بطريقة idempotent. |
| قد يعيد Meta محاولة webhooks التي لا تتلقى HTTP 200 لمدة تصل إلى 7 أيام. | يجب أن يظل معالج webhook آمنًا ضد التكرار وألا ينفذ الإجراء مرتين. |
| حالة القوالب والجودة وحدود الرقم تظهر عبر Webhooks وWhatsApp Manager. | نعزل معرفات القوالب في متغيرات البيئة ونبقي المراقبة والتصعيد ضمن قائمة تفعيل المالك. |

## تنبيهات الإصدار الأول

نبدأ بثلاثة قوالب **Utility** فقط: تذكير الحصة، إشعار الغياب، وإشعار وجود متأخرات. لا تُرسل الرسائل التسويقية من هذا المسار. ولا تتضمن القوالب درجات تفصيلية أو أي بيانات شخصية حساسة أكثر مما يلزم.

## المراجع

1. [Meta — Service messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages)
2. [Meta — WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform)
3. [Meta — Webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)
