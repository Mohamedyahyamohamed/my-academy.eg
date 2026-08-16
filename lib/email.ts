/**
 * Email service — sends real emails via Resend.
 * Uses onboarding@resend.dev as sender (change to your domain after verifying).
 */
import { Resend } from "resend";
import QRCode from "qrcode";
import { APP_CONFIG } from "@/lib/constants";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || "MY Academy <onboarding@resend.dev>";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

function roleLabel(role: string): string {
  return ({
    ADMIN: "مدير أكاديمية",
    TEACHER: "مدرّس",
    PARENT: "ولي أمر",
    STUDENT: "طالب",
  } as Record<string, string>)[role] || role;
}

type InviteEmailResult = {
  sent: boolean;
  errorCode?: "not_configured" | "sender_domain_unverified" | "provider_error";
};

async function sendDetailed(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: Buffer }>,
): Promise<InviteEmailResult> {
  if (!resend) {
    console.log(`[email] (no Resend key) would send to ${to}: ${subject}`);
    return { sent: false, errorCode: "not_configured" };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(attachments?.length ? { attachments } : {}),
    });
    if (error) {
      const message = `${error.name ?? ""} ${error.message ?? ""}`.toLowerCase();
      const errorCode = message.includes("resend.dev") || message.includes("domain") || message.includes("from address")
        ? "sender_domain_unverified"
        : "provider_error";
      console.error("[email] send failed:", error.message);
      return { sent: false, errorCode };
    }
    return { sent: true };
  } catch (error) {
    console.error("[email] send failed:", (error as Error).message);
    return { sent: false, errorCode: "provider_error" };
  }
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  return (await sendDetailed(to, subject, html)).sent;
}

export async function sendStudentQrEmail(input: {
  email: string;
  studentName: string;
  studentId: string;
}): Promise<InviteEmailResult> {
  const qrValue = `MA:${input.studentId}`;
  const qrPng = await QRCode.toBuffer(qrValue, { type: "png", width: 600, margin: 2 });
  const safeName = escapeHtml(input.studentName);

  return sendDetailed(
    input.email,
    `كود QR الخاص بالطالب ${input.studentName} — ${APP_CONFIG.name}`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;line-height:1.7;color:#0f172a">
      <h2>مرحبًا ${safeName}</h2>
      <p>مرفق في هذه الرسالة كود QR الخاص بحسابك في <strong>${escapeHtml(APP_CONFIG.name)}</strong>.</p>
      <p>احتفظ بالصورة لاستخدامها عند تسجيل الحضور.</p>
      <p style="color:#64748b;font-size:13px;margin-top:24px">إذا لم تتوقع هذه الرسالة، تواصل مع إدارة الأكاديمية.</p>
    </div>`,
    [{ filename: "my-academy-student-qr.png", content: qrPng }],
  );
}

export async function sendWelcomeEmail(email: string, name: string, role: string): Promise<void> {
  await send(
    email,
    `مرحبًا بك في ${APP_CONFIG.name}`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>مرحبًا ${escapeHtml(name)}!</h2>
      <p>حسابك في <strong>${escapeHtml(APP_CONFIG.name)}</strong> جاهز بصفتك <strong>${escapeHtml(roleLabel(role))}</strong>.</p>
      <p>سجّل الدخول ببريدك الإلكتروني وكلمة المرور للبدء.</p>
      <p style="color:#64748b;font-size:14px;margin-top:24px">${escapeHtml(APP_CONFIG.name)}</p>
    </div>`,
  );
}

/**
 * Delivers a one-time invite URL. The raw token is deliberately present only in
 * this message and the immediate server-action response; the database stores a
 * SHA-256 hash exclusively.
 */
export async function sendAcademyInviteEmail(input: {
  email: string;
  recipientName?: string;
  academyName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
}): Promise<InviteEmailResult> {
  const greeting = input.recipientName ? `مرحبًا ${escapeHtml(input.recipientName)}` : "مرحبًا";
  const expiry = new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(input.expiresAt));
  const safeUrl = escapeHtml(input.inviteUrl);

  return sendDetailed(
    input.email,
    `دعوة للانضمام إلى ${input.academyName} على ${APP_CONFIG.name}`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;line-height:1.7;color:#0f172a">
      <h2>${greeting}</h2>
      <p>تمت دعوتك للانضمام إلى <strong>${escapeHtml(input.academyName)}</strong> على منصة <strong>${escapeHtml(APP_CONFIG.name)}</strong> بصفتك <strong>${escapeHtml(roleLabel(input.role))}</strong>.</p>
      <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px;padding:12px 22px;font-weight:700">قبول الدعوة وإنشاء الحساب</a></p>
      <p>تنتهي صلاحية هذا الرابط في <strong>${escapeHtml(expiry)}</strong> بتوقيت القاهرة. إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل الرسالة بأمان.</p>
      <p style="color:#64748b;font-size:13px;word-break:break-all">إذا لم يعمل الزر، انسخ الرابط التالي في المتصفح:<br />${safeUrl}</p>
    </div>`,
  );
}

/**
 * @deprecated New accounts must be provisioned through academy invitations.
 * Kept temporarily for backwards-compatible imports only; it never transmits a
 * password and directs the recipient to the standard sign-in flow.
 */
export async function sendInviteEmail(
  email: string,
  name: string,
  _password: string,
  role: string,
): Promise<void> {
  await send(
    email,
    `تم تجهيز حسابك في ${APP_CONFIG.name}`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>مرحبًا ${escapeHtml(name)}</h2>
      <p>تم تجهيز حسابك في <strong>${escapeHtml(APP_CONFIG.name)}</strong> بصفتك <strong>${escapeHtml(roleLabel(role))}</strong>.</p>
      <p>تواصل مع إدارة الأكاديمية للحصول على رابط الدعوة الآمن لتعيين كلمة مرورك الأولى.</p>
    </div>`,
  );
}

export async function sendPasswordResetEmail(email: string, name: string): Promise<void> {
  await send(
    email,
    `إعادة تعيين كلمة المرور — ${APP_CONFIG.name}`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>مرحبًا ${escapeHtml(name)}</h2>
      <p>تلقينا طلبًا لإعادة تعيين كلمة المرور.</p>
      <p>تواصل مع إدارة الأكاديمية أو استخدم مسار «نسيت كلمة المرور» في الموقع.</p>
      <p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان.</p>
    </div>`,
  );
}

/** Send a real, one-time password recovery link generated by Supabase. */
export async function sendPasswordRecoveryEmail(email: string, resetUrl: string): Promise<boolean> {
  const safeUrl = escapeHtml(resetUrl);
  return send(
    email,
    `رابط استعادة كلمة المرور — ${APP_CONFIG.name}`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;line-height:1.7;color:#0f172a">
      <h2>استعادة كلمة المرور</h2>
      <p>تلقينا طلبًا لإنشاء كلمة مرور جديدة لحسابك في <strong>${escapeHtml(APP_CONFIG.name)}</strong>.</p>
      <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;border-radius:8px;padding:12px 22px;font-weight:700">إنشاء كلمة مرور جديدة</a></p>
      <p style="color:#64748b;font-size:13px;word-break:break-all">إذا لم يعمل الزر، انسخ الرابط التالي في المتصفح:<br />${safeUrl}</p>
      <p style="color:#64748b;font-size:13px">إذا لم تطلب استعادة كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.</p>
    </div>`,
  );
}

export async function sendSubscriptionSuspensionEmail(input: {
  email: string;
  academyName: string;
  status: "past_due" | "expired" | "canceled";
  language?: "ar" | "en";
  billingUrl?: string;
}): Promise<boolean> {
  const english = input.language === "en";
  const statusLabel = english
    ? ({ past_due: "past due", expired: "expired", canceled: "canceled" } as Record<string, string>)[input.status]
    : ({ past_due: "متأخر السداد", expired: "منتهي", canceled: "ملغى" } as Record<string, string>)[input.status];
  const billingUrl = input.billingUrl || `${process.env.NEXT_PUBLIC_APP_URL || "https://my-academy-eg.vercel.app"}/billing`;
  const safeUrl = escapeHtml(billingUrl);
  const subject = english
    ? `Service suspended for ${input.academyName} — ${APP_CONFIG.name}`
    : `إيقاف خدمة ${input.academyName} — ${APP_CONFIG.name}`;
  const html = english
    ? `<div dir="ltr" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;line-height:1.7;color:#0f172a">
      <h2>Subscription service suspended</h2>
      <p>The subscription for <strong>${escapeHtml(input.academyName)}</strong> is now <strong>${escapeHtml(statusLabel)}</strong>, so platform access has been suspended for this academy.</p>
      <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;border-radius:8px;padding:12px 22px;font-weight:700">Review subscription</a></p>
      <p>If you have already completed payment, please allow the payment provider to confirm it or contact platform support.</p>
    </div>`
    : `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;line-height:1.7;color:#0f172a">
      <h2>تم إيقاف خدمة الاشتراك</h2>
      <p>أصبح اشتراك <strong>${escapeHtml(input.academyName)}</strong> في حالة <strong>${escapeHtml(statusLabel)}</strong>، لذلك تم إيقاف الوصول إلى المنصة لهذه الأكاديمية مؤقتًا.</p>
      <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;border-radius:8px;padding:12px 22px;font-weight:700">مراجعة الاشتراك</a></p>
      <p>إذا كنت قد أتممت السداد بالفعل، يرجى انتظار تأكيد بوابة الدفع أو التواصل مع دعم المنصة.</p>
    </div>`;
  return send(input.email, subject, html);
}

export async function sendPaymentReminder(
  email: string,
  studentName: string,
  amount: string,
  month: string,
): Promise<void> {
  await send(
    email,
    `تذكير بسداد دفعة — ${APP_CONFIG.name}`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>تذكير بالسداد</h2>
      <p>هذه رسالة تذكير بأن على <strong>${escapeHtml(studentName)}</strong> دفعة مستحقة بقيمة <strong>${escapeHtml(amount)}</strong> عن شهر <strong>${escapeHtml(month)}</strong>.</p>
      <p>يرجى إتمام السداد في أقرب وقت مناسب.</p>
      <p style="color:#64748b;margin-top:24px">${escapeHtml(APP_CONFIG.name)}</p>
    </div>`,
  );
}
