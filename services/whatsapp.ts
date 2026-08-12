/**
 * طبقة خدمات واتساب الخاصة بالأكاديمية.
 * تربط بين بيانات الطلاب/أولياء الأمور وواجهة WhatsApp Cloud API.
 *
 * كل الدوال best-effort: الواتساب مكمل للـ Push، وليس بديلًا.
 * أي خطأ يُبتلع بصمت حتى لا يفشل العملية الأساسية (حفظ درجة/دفعة/حضور).
 */
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import {
  isWhatsAppConfigured,
  normalizePhoneE164,
  sendWhatsAppText,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp";

/** اسم القالب الافتراضي للإشعارات (يمكن تغييره عبر WHATSAPP_NOTIFICATION_TEMPLATE). */
function defaultTemplate(): string | undefined {
  return process.env.WHATSAPP_NOTIFICATION_TEMPLATE;
}

function defaultLang(): string {
  return process.env.WHATSAPP_TEMPLATE_LANG || "ar";
}

/** جلب student_id المرتبط بدفعة معيّنة (من جدول payments). */
export async function getStudentIdByPayment(
  paymentId: string,
): Promise<string | null> {
  const client = nodeSupabaseClient();
  if (!client) return null;
  const { data } = await client
    .from("payments")
    .select("student_id")
    .eq("id", paymentId)
    .maybeSingle();
  return data?.student_id ?? null;
}

/** جلب أسم الطالب + اسم ولي الأمر (لصياغة الرسائل). */
async function getStudentAndParent(
  studentId: string,
): Promise<{ studentName: string | null; parentPhone: string | null }> {
  const client = nodeSupabaseClient();
  if (!client) return { studentName: null, parentPhone: null };
  const { data } = await client
    .from("students")
    .select("first_name,last_name,parent:parents!parent_id(first_name,last_name,phone)")
    .eq("id", studentId)
    .maybeSingle();
  const s = (data as any) || {};
  const studentName = [s.first_name, s.last_name].filter(Boolean).join(" ") || null;
  return { studentName, parentPhone: s.parent?.phone ?? null };
}

/**
 * إرسال إشعار واتساب لولي أمر طالب واحد.
 * لو فيه قالب معتمد مضبوط (WHATNOTIFICATION_TEMPLATE) يبعت النص الكامل
 * كمتغير داخل القالب. وإلا يبعت نصًا حرًا (يعمل في نافذة 24 ساعة).
 *
 * القالب الموصى به (UTILITY) نصّه:  إشعار من أكاديميتي:\n{{1}}
 */
export async function notifyParentWhatsApp(
  studentId: string,
  title: string,
  body: string,
): Promise<void> {
  if (!isWhatsAppConfigured()) return;
  try {
    const { parentPhone } = await getStudentAndParent(studentId);
    if (!parentPhone) return;
    const number = normalizePhoneE164(parentPhone);
    if (!number) return;

    const message = `${title}\n${body}`;
    const tmpl = defaultTemplate();
    if (tmpl) {
      // ابعت القالب مع نص الإشعار كمتحول {{1}} في نص القالب.
      await sendWhatsAppTemplate(parentPhone, tmpl, defaultLang(), [
        { type: "body", parameters: [{ type: "text", text: message }] },
      ]);
    } else {
      // نص حر — يعمل فقط إن راسل ولي الأمر الأكاديمية خلال آخر 24 ساعة.
      await sendWhatsAppText(parentPhone, message);
    }
  } catch {
    /* silent — best-effort */
  }
}

/**
 * إرسال إشعار واتساب لأولياء أمور مجموعة طلاب (بعد حفظ درجات/حضور مثلاً).
 */
export async function notifyParentsWhatsApp(
  studentIds: string[],
  title: string,
  bodyFn: () => string,
): Promise<void> {
  if (!isWhatsAppConfigured()) return;
  const ids = Array.from(new Set(studentIds.filter(Boolean)));
  // حدّد التزامن حتى لا نضغط على الـ rate limit (حدّ أقصى 100 لكل دفعة).
  await Promise.all(
    ids.slice(0, 100).map((id) => notifyParentWhatsApp(id, title, bodyFn())),
  );
}
