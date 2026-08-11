"use server";
import { revalidatePath } from "next/cache";
import { requireRole, currentAcademyId } from "@/services";
import { collections, invalidateStore } from "@/services/data/store";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { STUDENT_DEFAULT_PASSWORD } from "@/lib/auth";

export interface ImportRow {
  first_name: string; last_name: string; phone?: string;
  grade?: string; school?: string; parent_name?: string; parent_phone?: string;
}

/**
 * Bulk import students (+ optional parents) with LOGIN ACCOUNTS.
 */
export async function importStudentsAction(rows: ImportRow[]) {
  const user = requireRole("ADMIN", "TEACHER");
  void user;
  const aid = currentAcademyId();
  if (!aid) return { ok: false, error: "لا توجد أكاديمية." };
  if (!rows || rows.length === 0) return { ok: false, error: "مفيش بيانات للاستيراد." };

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase not configured." };

  // ── منع التكرار ──
  const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
  const keyOf = (fn: string, ln: string, ph?: string | null) =>
    `${norm(fn)}|${norm(ln)}|${norm(ph)}`;
  const { data: existing } = await client
    .from("students")
    .select("first_name,last_name,phone")
    .eq("academy_id", aid);
  const seen = new Set(
    (existing ?? []).map((s: any) => keyOf(s.first_name, s.last_name, s.phone)),
  );

  const now = new Date().toISOString();
  let created = 0;
  let accounts = 0;
  let skippedDup = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowErr = (m: string) => errors.push(`صف ${i + 2}: ${m}`);

    if (!r.first_name?.trim() || !r.last_name?.trim()) {
      rowErr("ناقص الاسم");
      continue;
    }

    // فحص التكرار
    const key = keyOf(r.first_name, r.last_name, r.phone);
    if (seen.has(key)) {
      skippedDup++;
      continue;
    }
    seen.add(key);

    // ولي الأمر (لو موجود)
    let parentId: string | null = null;
    if (r.parent_name?.trim()) {
      const parts = r.parent_name.trim().split(/\s+/);
      const pid = crypto.randomUUID();
      const pemail = `p.${pid.slice(0, 8)}@parent.local`;
      const parent = {
        id: pid, academy_id: aid, profile_id: null,
        first_name: parts[0], last_name: parts.slice(1).join(" ") || "-",
        email: pemail, phone: r.parent_phone?.trim() || null, occupation: null,
        created_at: now, updated_at: now,
      };
      const pr = await client.from("parents").upsert(parent);
      if (pr.error) { rowErr(`ولي الأمر: ${pr.error.message}`); continue; }
      collections().parents.push(parent as any);
      parentId = parent.id;
    }

    // ── حساب الدخول للطالب (إيميل فريد + باسورد افتراضي) ──
    const sid = crypto.randomUUID();
    const loginEmail =
      `${r.first_name.trim()}.${r.last_name.trim()}`.replace(/[^a-zA-Z0-9.]/g, "").toLowerCase() +
      `.${sid.slice(0, 4)}@student.local`;
    let authOk = false;
    try {
      const { data: aData, error: aErr } = await client.auth.admin.createUser({
        email: loginEmail,
        password: STUDENT_DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: `${r.first_name.trim()} ${r.last_name.trim()}`, role: "STUDENT" },
      });
      if (!aErr && aData.user) {
        await client.from("profiles").upsert({
          id: aData.user.id, academy_id: aid, email: loginEmail, role: "STUDENT",
          full_name: `${r.first_name.trim()} ${r.last_name.trim()}`, is_active: true,
        });
        authOk = true;
        accounts++;
      } else if (aErr) {
        rowErr(`حساب الدخول: ${aErr.message} (الطالب هيتسجّل بدون حساب)`);
      }
    } catch (e) {
      rowErr(`حساب الدخول استثناء: ${(e as Error)?.message}`);
    }

    // سجل الطالب (بالإيميل عشان الـ portal يربطه)
    const student = {
      id: sid, academy_id: aid,
      first_name: r.first_name.trim(), last_name: r.last_name.trim(),
      phone: r.phone?.trim() || null,
      email: authOk ? loginEmail : null,
      date_of_birth: null, gender: null, parent_id: parentId,
      school: r.school?.trim() || null, grade: r.grade?.trim() || null,
      notes: null, status: "ACTIVE", enrolled_at: now, created_at: now, updated_at: now,
    };
    const sr = await client.from("students").upsert(student);
    if (sr.error) { rowErr(sr.error.message); continue; }
    collections().students.push(student as any);
    created++;
  }

  invalidateStore();
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { ok: true, created, accounts, skippedDup, errors };
}