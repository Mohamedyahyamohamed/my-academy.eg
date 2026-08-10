"use server";
import { revalidatePath } from "next/cache";
import { requireRole, currentAcademyId } from "@/services";
import { collections, invalidateStore } from "@/services/data/store";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

export interface ImportRow {
  first_name: string; last_name: string; phone?: string;
  grade?: string; school?: string; parent_name?: string; parent_phone?: string;
}

export async function importStudentsAction(rows: ImportRow[]) {
  const user = requireRole("ADMIN", "TEACHER");
  void user;
  const aid = currentAcademyId();
  if (!aid) return { ok: false, error: "لا توجد أكاديمية." };
  if (!rows || rows.length === 0) return { ok: false, error: "مفيش بيانات للاستيراد." };

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase not configured." };

  const now = new Date().toISOString();
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowErr = (m: string) => errors.push(`صف ${i + 2}: ${m}`);

    if (!r.first_name?.trim() || !r.last_name?.trim()) {
      rowErr("ناقص الاسم");
      continue;
    }

    let parentId: string | null = null;
    if (r.parent_name?.trim()) {
      const parts = r.parent_name.trim().split(/\s+/);
      const pemail = `${(parts[0] || "p").replace(/[^a-zA-Z0-9]/g, "x")}.${i}@parent.local`;
      const parent = {
        id: crypto.randomUUID(), academy_id: aid, profile_id: null,
        first_name: parts[0], last_name: parts.slice(1).join(" ") || "-",
        email: pemail, phone: r.parent_phone?.trim() || null, occupation: null,
        created_at: now, updated_at: now,
      };
      const pr = await client.from("parents").upsert(parent);
      if (pr.error) { rowErr(`ولي الأمر: ${pr.error.message}`); continue; }
      collections().parents.push(parent as any);
      parentId = parent.id;
    }

    const student = {
      id: crypto.randomUUID(), academy_id: aid,
      first_name: r.first_name.trim(), last_name: r.last_name.trim(),
      phone: r.phone?.trim() || null, email: null, date_of_birth: null, gender: null,
      parent_id: parentId, school: r.school?.trim() || null, grade: r.grade?.trim() || null,
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
  return { ok: true, created, errors };
}
