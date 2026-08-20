"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { audit } from "@/services/audit";
import { getCurrentUser, requireScopedRole } from "@/services/session";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

const CONSENT_VERSION = "1.0";
const REQUEST_TTL_DAYS = 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Admin-only link generation. It deliberately returns a link instead of
 * sending an email or WhatsApp message, so QA can test without contacting a
 * real recipient.
 */
export async function createParentConsentRequestAction(input: {
  studentId: string;
  parentEmail?: string;
}) {
  const actor = await requireScopedRole("ADMIN");
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase is not configured." };

  const { data: student, error: studentError } = await client
    .from("students")
    .select("id,academy_id,parent_id,consent_given")
    .eq("id", input.studentId)
    .eq("academy_id", actor.academy_id)
    .maybeSingle();
  if (studentError || !student) return { ok: false, error: "الطالب غير موجود في أكاديميتك." };
  if (student.consent_given === true) return { ok: false, error: "تم تسجيل الموافقة لهذا الطالب بالفعل." };

  let parentEmail = normalizeEmail(input.parentEmail || "");
  if (!parentEmail && student.parent_id) {
    const { data: parent } = await client
      .from("parents")
      .select("email")
      .eq("id", student.parent_id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();
    parentEmail = normalizeEmail(parent?.email || "");
  }
  if (!parentEmail || !parentEmail.includes("@")) {
    return { ok: false, error: "أدخل بريد ولي الأمر قبل إنشاء رابط الموافقة." };
  }

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await client.from("parent_consent_requests").insert({
    academy_id: actor.academy_id,
    student_id: student.id,
    parent_id: student.parent_id,
    parent_email: parentEmail,
    token_hash: hashToken(token),
    consent_version: CONSENT_VERSION,
    expires_at: expiresAt,
    created_by: actor.id,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });
  if (error) return { ok: false, error: `تعذّر إنشاء طلب الموافقة: ${error.message}` };

  await audit({
    action: "student.consent_request.create",
    entity_type: "student",
    entity_id: student.id,
    metadata: {
        expires_at: expiresAt,
        parent_email: parentEmail,
        consent_version: CONSENT_VERSION,
        source: "admin-generated-parent-consent-link",
      },
  }, actor);
  return { ok: true, url: `${appUrl()}/consent/${token}`, expiresAt };
}

/** Public approval step reached through a one-time link. */
export async function approveParentConsentAction(input: {
  token: string;
  parentEmail: string;
}) {
  const client = nodeSupabaseClient();
  if (!client || !input.token || input.token.length < 32) {
    return { ok: false, error: "رابط الموافقة غير صالح." };
  }
  const parentEmail = normalizeEmail(input.parentEmail);
  if (!parentEmail || !parentEmail.includes("@")) {
    return { ok: false, error: "أدخل بريد ولي الأمر الصحيح." };
  }

  const { data: request, error: requestError } = await client
    .from("parent_consent_requests")
    .select("id,academy_id,student_id,parent_id,parent_email,consent_version,expires_at,used_at,students(email)")
    .eq("token_hash", hashToken(input.token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (requestError || !request) return { ok: false, error: "الرابط غير صالح أو منتهي أو مستخدم." };
  if (normalizeEmail(request.parent_email || "") !== parentEmail) {
    return { ok: false, error: "البريد لا يطابق البريد المسجل لولي الأمر." };
  }

  const currentUser = getCurrentUser();
  const sessionParentId = currentUser?.email && normalizeEmail(currentUser.email) === parentEmail
    ? currentUser.id
    : null;
  const { data: parentActor } = request.parent_id
    ? await client
        .from("parents")
        .select("id,profile_id,email")
        .eq("id", request.parent_id)
        .eq("academy_id", request.academy_id)
        .maybeSingle()
    : { data: null };
  const consentBy = parentActor?.profile_id || sessionParentId;
  const now = new Date().toISOString();

  const { data: updatedStudent, error: studentError } = await client
    .from("students")
    .update({
      status: "ACTIVE",
      consent_given: true,
      consent_at: now,
      consent_by: consentBy,
      consent_version: request.consent_version || CONSENT_VERSION,
      updated_at: now,
    })
    .eq("id", request.student_id)
    .eq("academy_id", request.academy_id)
    .eq("consent_given", false)
    .select("id")
    .maybeSingle();
  if (studentError || !updatedStudent) return { ok: false, error: "تعذّر تحديث حالة الطالب." };

  const { error: usedError } = await client
    .from("parent_consent_requests")
    .update({ used_at: now, approved_by_email: parentEmail, approved_by_profile_id: consentBy, updated_at: now })
    .eq("id", request.id)
    .is("used_at", null);
  if (usedError) return { ok: false, error: "تم تسجيل الموافقة، لكن تعذّر إغلاق رابط الموافقة." };

  const studentRelation = Array.isArray((request as any).students) ? (request as any).students[0] : (request as any).students;
  const studentEmail = normalizeEmail(studentRelation?.email || "");
  const { data: studentProfile } = studentEmail
    ? await client
        .from("profiles")
        .select("id")
        .eq("academy_id", request.academy_id)
        .eq("role", "STUDENT")
        .eq("email", studentEmail)
        .maybeSingle()
    : { data: null };
  if (studentProfile) {
    await client
      .from("academy_memberships")
      .update({ status: "ACTIVE", updated_at: now })
      .eq("academy_id", request.academy_id)
      .eq("profile_id", studentProfile.id)
      .eq("role", "STUDENT")
      .eq("status", "INVITED");
    await client.from("profiles").update({ is_active: true, updated_at: now }).eq("id", studentProfile.id).eq("academy_id", request.academy_id);
  }

  await audit({
    action: "student.consent.approve",
    entity_type: "student",
    entity_id: request.student_id,
      metadata: {
        consent_at: now,
        consent_by: consentBy,
        parent_id: request.parent_id,
        approved_by_email: parentEmail,
        consent_version: request.consent_version || CONSENT_VERSION,
        request_id: request.id,
        source: "parent-consent-link",
      },
  }, consentBy ? { id: consentBy, role: "PARENT" } : undefined);
  revalidatePath(`/students/${request.student_id}`);
  revalidatePath("/students");
  return { ok: true, studentId: request.student_id, consentAt: now, consentBy };
}
