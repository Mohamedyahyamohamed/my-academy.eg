import QRCode from "qrcode";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { studentQrValue } from "@/lib/student-qr";
import {
  isWhatsAppLiveEnabled,
  normalizePhoneE164,
  sendWhatsAppImage,
  sendWhatsAppTemplate,
  sendWhatsAppTemplateWithImage,
} from "@/lib/whatsapp";

/** لا نرسل سوى تنبيهات تشغيلية Utility؛ لا يوجد إرسال تسويقي في هذا المسار. */
export type WhatsAppEventType =
  | "ATTENDANCE_ABSENCE"
  | "GRADE_POSTED"
  | "PAYMENT_RECORDED"
  | "STUDENT_QR"
  | "GENERAL";

const TEMPLATE_BY_EVENT: Record<WhatsAppEventType, string> = {
  ATTENDANCE_ABSENCE: "WHATSAPP_ATTENDANCE_TEMPLATE",
  GRADE_POSTED: "WHATSAPP_GRADE_TEMPLATE",
  PAYMENT_RECORDED: "WHATSAPP_PAYMENT_TEMPLATE",
  STUDENT_QR: "WHATSAPP_STUDENT_QR_TEMPLATE",
  GENERAL: "WHATSAPP_NOTIFICATION_TEMPLATE",
};

type ParentContact = {
  academyId: string;
  parentId: string;
  parentPhone: string | null;
  studentName: string | null;
};

function templateFor(eventType: WhatsAppEventType): string | null {
  return process.env[TEMPLATE_BY_EVENT[eventType]] || process.env.WHATSAPP_NOTIFICATION_TEMPLATE || null;
}

function templateLanguage(): string {
  return process.env.WHATSAPP_TEMPLATE_LANG || "ar";
}

function phoneLast4(phone: string | null | undefined): string | null {
  const normalized = normalizePhoneE164(phone);
  return normalized ? normalized.slice(-4) : null;
}

/** جلب student_id المرتبط بدفعة معيّنة (من جدول payments). */
export async function getStudentIdByPayment(paymentId: string): Promise<string | null> {
  const client = nodeSupabaseClient();
  if (!client) return null;
  const { data } = await client
    .from("payments")
    .select("student_id")
    .eq("id", paymentId)
    .maybeSingle();
  return data?.student_id ?? null;
}

/** جلب بيانات اتصال ولي الأمر داخل أكاديمية الطالب فقط. */
async function getStudentAndParent(studentId: string): Promise<ParentContact | null> {
  const client = nodeSupabaseClient();
  if (!client) return null;
  const { data } = await client
    .from("students")
    .select("academy_id,first_name,last_name,parent:parents!parent_id(id,phone)")
    .eq("id", studentId)
    .maybeSingle();
  const student = data as any;
  if (!student?.academy_id || !student?.parent?.id) return null;
  return {
    academyId: student.academy_id,
    parentId: student.parent.id,
    parentPhone: student.parent.phone ?? null,
    studentName: [student.first_name, student.last_name].filter(Boolean).join(" ") || null,
  };
}

async function parentHasWhatsAppOptIn(academyId: string, parentId: string): Promise<boolean> {
  const client = nodeSupabaseClient();
  if (!client) return false;
  const { data, error } = await client
    .from("whatsapp_preferences")
    .select("opted_in")
    .eq("academy_id", academyId)
    .eq("parent_id", parentId)
    .maybeSingle();
  // غياب الجدول أو السجل يعني عدم وجود موافقة؛ لا نرسل افتراضيًا.
  return !error && data?.opted_in === true;
}

async function logWhatsAppAttempt(input: {
  academyId: string;
  parentId: string | null;
  studentId: string;
  eventType: WhatsAppEventType;
  templateName?: string | null;
  phone?: string | null;
  status: "SKIPPED" | "ACCEPTED" | "FAILED";
  externalMessageId?: string;
  failureReason?: string;
}): Promise<void> {
  const client = nodeSupabaseClient();
  if (!client) return;
  try {
    await client.from("whatsapp_message_logs").insert({
      academy_id: input.academyId,
      parent_id: input.parentId,
      student_id: input.studentId,
      event_type: input.eventType,
      template_name: input.templateName ?? null,
      recipient_phone_last4: phoneLast4(input.phone),
      status: input.status,
      external_message_id: input.externalMessageId ?? null,
      failure_reason: input.failureReason ?? null,
      accepted_at: input.status === "ACCEPTED" ? new Date().toISOString() : null,
    });
  } catch {
    // يبقى سجل الإرسال ميزة مراقبة فقط، ولا يعطل العملية التعليمية الأساسية.
  }
}

/**
 * إرسال QR الطالب كصورة فعلية إلى الرقم المسجل للطالب أو ولي الأمر.
 * الإرسال best-effort ومفصول عن مسار إنشاء الطالب.
 */
export async function notifyStudentQrWhatsApp(
  studentId: string,
  consentGivenOverride = false,
): Promise<void> {
  const client = nodeSupabaseClient();
  if (!client) return;

  const { data } = await client
    .from("students")
    .select("academy_id,id,first_name,last_name,phone,consent_given,parent_id,parent:parents!parent_id(id,phone)")
    .eq("id", studentId)
    .maybeSingle();
  const student = data as any;
  if (!student?.academy_id || student.id !== studentId) return;

  const parent = Array.isArray(student.parent) ? student.parent[0] : student.parent;
  const mode = (process.env.WHATSAPP_QR_RECIPIENT || "student").toLowerCase();
  const recipientKind = mode === "parent" ? "parent" : "student";
  const recipientPhone = recipientKind === "parent" ? parent?.phone : student.phone;
  const parentId = parent?.id ?? student.parent_id ?? null;
  const studentName = [student.first_name, student.last_name].filter(Boolean).join(" ") || "الطالب";

  const log = (input: {
    status: "SKIPPED" | "ACCEPTED" | "FAILED";
    phone?: string | null;
    failureReason?: string;
    externalMessageId?: string;
    templateName?: string | null;
  }) => logWhatsAppAttempt({
    academyId: student.academy_id,
    parentId,
    studentId,
    eventType: "STUDENT_QR",
    phone: input.phone ?? recipientPhone,
    status: input.status,
    failureReason: input.failureReason,
    externalMessageId: input.externalMessageId,
    templateName: input.templateName,
  });

  if (process.env.WHATSAPP_QR_AUTO_SEND?.toLowerCase() !== "true") {
    await log({ status: "SKIPPED", failureReason: "Automatic student QR delivery is disabled" });
    return;
  }
  if (!isWhatsAppLiveEnabled()) {
    await log({ status: "SKIPPED", failureReason: "WhatsApp live mode is disabled" });
    return;
  }
  if (recipientKind === "student" && student.consent_given !== true && consentGivenOverride !== true) {
    await log({ status: "SKIPPED", failureReason: "Student WhatsApp consent is missing" });
    return;
  }
  if (recipientKind === "parent" && (!parentId || !(await parentHasWhatsAppOptIn(student.academy_id, parentId)))) {
    await log({ status: "SKIPPED", failureReason: "Parent WhatsApp opt-in is missing" });
    return;
  }
  const normalized = normalizePhoneE164(recipientPhone);
  if (!normalized) {
    await log({ status: "SKIPPED", failureReason: `The ${recipientKind} phone is missing or invalid` });
    return;
  }

  try {
    const qrPng = await QRCode.toBuffer(studentQrValue(studentId), {
      type: "png",
      width: 600,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    const qrMessage = `بطاقة QR الخاصة بالطالب ${studentName}. اعرضها للمدرس عند تسجيل الحضور.`;
    const qrTemplate = templateFor("STUDENT_QR");
    const result = qrTemplate
      ? await sendWhatsAppTemplateWithImage(
          normalized,
          qrPng,
          qrTemplate,
          templateLanguage(),
          studentName,
        )
      : await sendWhatsAppImage(normalized, qrPng, qrMessage);
    await log({
      status: result.ok ? "ACCEPTED" : "FAILED",
      externalMessageId: result.messageId,
      failureReason: result.error,
      templateName: qrTemplate,
    });
  } catch (error) {
    await log({ status: "FAILED", failureReason: (error as Error)?.message || "QR delivery failed" });
  }
}

/**
 * إرسال قالب Utility لولي أمر واحد. لا ترسل الدالة أي نص حر أو تفاصيل حساسة؛
 * القالب المعتمد يقود ولي الأمر إلى البوابة الآمنة لعرض التفاصيل.
 */
export async function notifyParentWhatsApp(
  studentId: string,
  _title: string,
  _body: string,
  eventType: WhatsAppEventType = "GENERAL",
): Promise<void> {
  try {
    const contact = await getStudentAndParent(studentId);
    if (!contact) return;

    if (!isWhatsAppLiveEnabled()) {
      await logWhatsAppAttempt({
        ...contact,
        studentId,
        eventType,
        status: "SKIPPED",
        failureReason: "WhatsApp live mode is disabled",
      });
      return;
    }

    if (!contact.parentPhone || !normalizePhoneE164(contact.parentPhone)) {
      await logWhatsAppAttempt({
        ...contact,
        studentId,
        eventType,
        status: "SKIPPED",
        failureReason: "Parent phone is missing or invalid",
      });
      return;
    }

    if (!(await parentHasWhatsAppOptIn(contact.academyId, contact.parentId))) {
      await logWhatsAppAttempt({
        ...contact,
        studentId,
        eventType,
        status: "SKIPPED",
        failureReason: "No recorded WhatsApp opt-in",
      });
      return;
    }

    const templateName = templateFor(eventType);
    if (!templateName) {
      await logWhatsAppAttempt({
        ...contact,
        studentId,
        eventType,
        status: "SKIPPED",
        failureReason: "No approved template is configured for this event",
      });
      return;
    }

    const result = await sendWhatsAppTemplate(contact.parentPhone, templateName, templateLanguage(), [
      { type: "body", parameters: [{ type: "text", text: contact.studentName || "ابنكم" }] },
    ]);
    await logWhatsAppAttempt({
      ...contact,
      studentId,
      eventType,
      templateName,
      status: result.ok ? "ACCEPTED" : "FAILED",
      externalMessageId: result.messageId,
      failureReason: result.error,
    });
  } catch {
    // best-effort: لا ينبغي لتنبيه خارجي أن يمنع تسجيل الحضور أو الدرجة أو الدفعة.
  }
}

/** إرسال تنبيه محدود السرعة إلى أولياء أمور عدة طلاب. */
export async function notifyParentsWhatsApp(
  studentIds: string[],
  title: string,
  bodyFn: () => string,
  eventType: WhatsAppEventType = "GENERAL",
): Promise<void> {
  const uniqueIds = Array.from(new Set(studentIds.filter(Boolean))).slice(0, 100);
  // دفعات صغيرة تمنع الاندفاع غير الضروري ولا تتجاوز حدود المزود بسرعة.
  for (let index = 0; index < uniqueIds.length; index += 5) {
    await Promise.all(
      uniqueIds.slice(index, index + 5).map((studentId) =>
        notifyParentWhatsApp(studentId, title, bodyFn(), eventType),
      ),
    );
  }
}
