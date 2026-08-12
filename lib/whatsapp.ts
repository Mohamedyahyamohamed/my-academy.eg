/**
 * WhatsApp Cloud API integration (Meta Graph API).
 *
 * ملاحظة: الرسائل التي تبدأ من الأكاديمية (business-initiated) تتطلب قالبًا
 * معتمدًا (message template) من Meta. الرسائل النصية الحرة تعمل فقط خلال
 * نافذة الـ 24 ساعة بعد أن يراسل العميل الأكاديمية أولًا.
 *
 * Environment variables (set on Vercel → Settings → Environment Variables):
 *   WHATSAPP_TOKEN             — System User access token (دائم) أو test token (مؤقت)
 *   WHATSAPP_PHONE_NUMBER_ID   — Phone Number ID من لوحة Meta
 *   WHATSAPP_API_VERSION       — إصدار Graph API (default: "v21.0")
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

function getCreds() {
  return {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  };
}

/** هل تم ضبط مفاتيح الواتساب في البيئة؟ */
export function isWhatsAppConfigured(): boolean {
  const { token, phoneNumberId } = getCreds();
  return Boolean(token && phoneNumberId);
}

/**
 * تحويل رقم الموبايل لصيغة E.164 (أرقام فقط، بدون + أو مسافات).
 * يدعم الصيغ المصرية الشائعة:
 *   01012345678  -> 201012345678
 *   +201012345678 -> 201012345678
 *   00201012345678 -> 201012345678
 *   201012345678 -> 201012345678
 * واتساب API يتوقع الرقم بهذه الصيغة.
 */
export function normalizePhoneE164(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  let p = phone.trim();
  if (!p) return null;

  // احتفظ بعلامة + إذا كانت موجودة، ثم احذف كل ما عدا الأرقام.
  p = p.replace(/[^\d]/g, "");
  if (!p) return null;

  // 00 كود دولي -> احذفه واحتفظ برقم الدولة.
  if (p.startsWith("00")) {
    p = p.substring(2);
  }
  // رقم مصري محلي يبدأ بـ 0 (مثل 010..) -> أضف 20 واحذف الصفر.
  if (p.length >= 10 && p.startsWith("0")) {
    p = "20" + p.substring(1);
  }
  // رقم مصري بدون كود دولة (10 أرقام تبدأ بـ 1 مثل 10x..).
  if (p.length === 10 && p.startsWith("1")) {
    p = "20" + p;
  }
  return p;
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

async function postMessage(payload: Record<string, unknown>): Promise<SendResult> {
  const { token, phoneNumberId } = getCreds();
  if (!token || !phoneNumberId) {
    return {
      ok: false,
      error:
        "WhatsApp not configured (missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID).",
    };
  }
  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, messaging_product: "whatsapp" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        JSON.stringify(data?.error || data);
      console.error("[whatsapp] send failed:", errMsg);
      return { ok: false, error: String(errMsg) };
    }
    return { ok: true, messageId: data?.messages?.[0]?.id };
  } catch (e) {
    console.error("[whatsapp] send error:", (e as Error)?.message);
    return { ok: false, error: (e as Error)?.message };
  }
}

/**
 * إرسال رسالة نصية حرة. تعمل فقط ضمن نافذة الـ 24 ساعة
 * (بعد أن يراسل المستلم الأكاديمية أولًا). للإشعارات التي تبدأها
 * الأكاديمية استخدم sendWhatsAppTemplate().
 */
export async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<SendResult> {
  const number = normalizePhoneE164(to);
  if (!number) return { ok: false, error: "Invalid phone number" };
  return postMessage({ to: number, type: "text", text: { body } });
}

/**
 * إرسال رسالة قالب (template). القوالب يجب أن تكون معتمدة في
 * WhatsApp Manager. القالب الافتراضي المدمج هو hello_world.
 *
 * لإنشاء قوالب مخصصة:
 *   WhatsApp Manager → Account tools → Message templates → Create template
 *   النوع: UTILITY (للإشعارات). بعد الاعتماد استخدم اسم القالب هنا.
 *
 * @param to             رقم المستلم
 * @param templateName   اسم القالب المعتمد (default: "hello_world")
 * @param languageCode   كود اللغة (مثال: "ar"، "en_US")
 * @param components     متغيرات القالب (header/body parameters)
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName = "hello_world",
  languageCode = "en_US",
  components?: unknown[],
): Promise<SendResult> {
  const number = normalizePhoneE164(to);
  if (!number) return { ok: false, error: "Invalid phone number" };
  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: languageCode },
  };
  if (components) template.components = components;
  return postMessage({ to: number, type: "template", template });
}
