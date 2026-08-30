import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { liveTeacherStudentScope } from "@/services/students";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { setPortalSessionCookie, clearPortalSessionCookie, type PortalRole } from "@/lib/portal-session";
import { decryptPortalPassword, encryptPortalPassword } from "@/lib/portal-credentials";
import type { SessionUser } from "@/types";

const READABLE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function createReadablePassword(length = 8) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => READABLE_ALPHABET[byte % READABLE_ALPHABET.length]).join("");
}

function slugPart(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "").toLowerCase() || "student";
}

function virtualEmail(studentId: string, firstName: string, lastName: string) {
  return `${slugPart(firstName)}.${slugPart(lastName)}.${studentId.slice(0, 8)}@portal.myacademy.local`;
}

export interface GeneratedPortalCredentials {
  ok: true;
  email: string;
  password: string;
  mode: "created" | "reset";
}

export async function generatePortalCredentials(
  user: SessionUser,
  studentId: string,
  preferredEmail?: string | null,
  options: { forceReset?: boolean } = {},
): Promise<GeneratedPortalCredentials> {
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "TEACHER") throw new Error("لا تملك صلاحية إنشاء بيانات دخول البوابة.");
  const client = nodeSupabaseClient();
  if (!client) throw new Error("Supabase غير مهيأ.");
  if (user.role === "TEACHER") {
    const scopedStudents = await liveTeacherStudentScope(client, user.academy_id, user);
    if (!scopedStudents?.has(studentId)) throw new Error("لا يمكنك إنشاء بيانات دخول إلا لطلاب مجموعاتك المعيّنة.");
  }

  let query = client
    .from("students")
    .select("id,academy_id,first_name,last_name,portal_email")
    .eq("id", studentId);
  if (user.role !== "SUPER_ADMIN") query = query.eq("academy_id", user.academy_id);
  const { data: student, error: studentError } = await query.maybeSingle();
  if (studentError || !student) throw new Error("الطالب غير موجود في نطاق الأكاديمية.");

  const { data: stored } = await client
    .from("students")
    .select("portal_password_encrypted")
    .eq("id", student.id)
    .eq("academy_id", student.academy_id)
    .maybeSingle();
  const savedPassword = !options.forceReset ? decryptPortalPassword(stored?.portal_password_encrypted) : null;
  if (student.portal_email && savedPassword) {
    return { ok: true, email: student.portal_email, password: savedPassword, mode: "created" };
  }

  const requestedEmail = preferredEmail?.trim().toLowerCase() || "";
  const email = student.portal_email || requestedEmail || virtualEmail(student.id, student.first_name, student.last_name);
  const password = createReadablePassword();
  const hash = await bcrypt.hash(password, 12);
  if (!student.portal_email && requestedEmail) {
    const { data: duplicate } = await client
      .from("students")
      .select("id")
      .eq("portal_email", requestedEmail)
      .neq("id", student.id)
      .limit(1);
    if (duplicate?.length) throw new Error("البريد الإلكتروني مستخدم بالفعل لحساب بوابة آخر.");
  }
  const { error } = await client
    .from("students")
    .update({ portal_email: email, portal_password: hash, portal_password_encrypted: encryptPortalPassword(password) })
    .eq("id", student.id)
    .eq("academy_id", student.academy_id);
  if (error) {
    if (/duplicate|unique/i.test(error.message)) throw new Error("تعذر إنشاء بريد افتراضي فريد. أعد المحاولة.");
    throw new Error(`تعذر حفظ بيانات الدخول: ${error.message}`);
  }

  return { ok: true, email, password, mode: student.portal_email ? "reset" : "created" };
}

export type PortalLoginState = { ok: boolean; error?: string };

export async function portalLogin(formData: FormData): Promise<PortalLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!email || !password || (role !== "student" && role !== "parent")) {
    return { ok: false, error: "أدخل البريد وكلمة المرور واختر نوع الدخول." };
  }
  const limited = rateLimit(`portal-login:${email}`, LIMITS.login.max, LIMITS.login.window);
  if (!limited.allowed) return { ok: false, error: "محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى." };

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "الخدمة غير متاحة حاليًا." };
  const { data: student, error } = await client
    .from("students")
    .select("id,academy_id,portal_email,portal_password,parent_id,status,is_active")
    .eq("portal_email", email)
    .maybeSingle();
  if (error || !student || !student.portal_password || student.is_active === false || student.status === "ARCHIVED") {
    return { ok: false, error: "بيانات الدخول غير صحيحة أو الحساب غير مفعّل." };
  }
  if (role === "parent") {
    if (!student.parent_id) return { ok: false, error: "لا يوجد ولي أمر مرتبط بهذا الطالب حتى الآن." };
    const { data: parent } = await client.from("parents").select("id").eq("id", student.parent_id).eq("academy_id", student.academy_id).maybeSingle();
    if (!parent) return { ok: false, error: "لا يوجد ولي أمر مرتبط بهذا الطالب حتى الآن." };
  }
  const valid = await bcrypt.compare(password, student.portal_password);
  if (!valid) return { ok: false, error: "بيانات الدخول غير صحيحة أو الحساب غير مفعّل." };

  await setPortalSessionCookie({
    student_id: student.id,
    academy_id: student.academy_id,
    portal_email: email,
    role: role as PortalRole,
  });
  redirect(role === "parent" ? "/portal/parent" : "/portal/student");
}

export async function portalLogout() {
  await clearPortalSessionCookie();
  redirect("/portal/login");
}
