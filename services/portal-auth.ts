import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { setPortalSessionCookie, clearPortalSessionCookie, type PortalRole } from "@/lib/portal-session";
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

export async function generatePortalCredentials(user: SessionUser, studentId: string): Promise<GeneratedPortalCredentials> {
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") throw new Error("بيانات الدخول الافتراضية متاحة لمالك الأكاديمية فقط.");
  const client = nodeSupabaseClient();
  if (!client) throw new Error("Supabase غير مهيأ.");

  let query = client
    .from("students")
    .select("id,academy_id,first_name,last_name,portal_email")
    .eq("id", studentId);
  if (user.role !== "SUPER_ADMIN") query = query.eq("academy_id", user.academy_id);
  const { data: student, error: studentError } = await query.maybeSingle();
  if (studentError || !student) throw new Error("الطالب غير موجود في نطاق الأكاديمية.");

  const email = student.portal_email || virtualEmail(student.id, student.first_name, student.last_name);
  const password = createReadablePassword();
  const hash = await bcrypt.hash(password, 12);
  const { error } = await client
    .from("students")
    .update({ portal_email: email, portal_password: hash })
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
