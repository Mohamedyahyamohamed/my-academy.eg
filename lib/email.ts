/**
 * Email service — sends real emails via Resend.
 * Uses onboarding@resend.dev as sender (change to your domain after verifying).
 */
import { Resend } from "resend";
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

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.log(`[email] (no Resend key) would send to ${to}: ${subject}`);
    return false;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    return true;
  } catch (error) {
    console.error("[email] send failed:", (error as Error).message);
    return false;
  }
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
}): Promise<boolean> {
  const greeting = input.recipientName ? `مرحبًا ${escapeHtml(input.recipientName)}` : "مرحبًا";
  const expiry = new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(input.expiresAt));
  const safeUrl = escapeHtml(input.inviteUrl);

  return send(
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
