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
 * يبعت القالب الافتراضي (academy_notice) باسم الطالب كمتحول {{student_name}}.
 * القالب ده شامل لكل الإشعارات (درجات/مصاريف/غياب) — واتساب يبعت "تنبيه"
 * للولي بالدخول للتطبيق للاطلاع على التفاصيل.
 *
 * القالب الموصى به (Utility، عربي):
 *   لديكم إشعار جديد بخصوص ابنكم {{student_name}} على منصة أكاديميتي.
 *   برجاء الدخول إلى التطبيق للاطلاع على التفاصيل.
 */
export async function notifyParentWhatsApp(
  studentId: string,
  title: string,
  body: string,
): Promise<void> {
  if (!isWhatsAppConfigured()) return;
  try {
    const { parentPhone, studentName } = await getStudentAndParent(studentId);
    if (!parentPhone) return;
    const number = normalizePhoneE164(parentPhone);
    if (!number) return;

    const tmpl = defaultTemplate() || "academy_notice";
    // ابعت اسم الطالب كمتغير {{1}} داخل القالب (المتغيرات موضعية).
    await sendWhatsAppTemplate(parentPhone, tmpl, defaultLang(), [
      { type: "body", parameters: [{ type: "text", text: studentName || "ابنكم" }] },
    ]);
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
