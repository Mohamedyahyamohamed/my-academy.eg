"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, isLimitedAssistant } from "@/services";
import { collections, invalidateStore } from "@/services/data/store";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { audit } from "@/services/audit";
import { currentTeacherId } from "@/services/session";

export interface ImportRow {
  first_name: string;
  last_name: string;
  phone?: string;
  grade?: string;
  school?: string;
  parent_name?: string;
  parent_phone?: string;
}

const BATCH_SIZE = 50;

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

/**
 * Bulk import students (+ optional parents) from parsed CSV rows.
 * Uses the service-role client directly so we can check + report errors.
 * Parent and student writes are batched to keep 100+ row imports within the
 * serverless request budget while preserving pending parental consent.
 */
export async function importStudentsAction(rows: ImportRow[], requestedAcademyId?: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) {
    return { ok: false, error: "حساب المساعد لا يملك صلاحية استيراد الطلاب." };
  }

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase not configured." };

  // Platform owners do not necessarily have an academy_id in their session.
  // They must select the target tenant explicitly; regular users stay bound to
  // the authenticated academy context and cannot override it from the client.
  let aid: string;
  if (user.role === "SUPER_ADMIN") {
    aid = requestedAcademyId?.trim() ?? "";
    if (!aid) return { ok: false, error: "اختر الأكاديمية المستهدفة قبل الاستيراد." };
    const { data: academy, error: academyError } = await client
      .from("academies")
      .select("id,is_active")
      .eq("id", aid)
      .maybeSingle();
    if (academyError || !academy) return { ok: false, error: "الأكاديمية المختارة غير موجودة." };
    if (academy.is_active === false) return { ok: false, error: "لا يمكن الاستيراد إلى أكاديمية غير نشطة." };
  } else {
    aid = user.academy_id ?? "";
    if (!aid) return { ok: false, error: "لا يوجد سياق أكاديمية صالح لحسابك." };
  }

  let ownerTeacherId: string | null = null;
  if (user.role === "TEACHER") {
    const { data: workspace } = await client
      .from("academies")
      .select("workspace_type")
      .eq("id", aid)
      .maybeSingle();
    if (workspace?.workspace_type === "TEACHER") ownerTeacherId = currentTeacherId();
  }

  if (!rows || rows.length === 0) return { ok: false, error: "مفيش بيانات للاستيراد." };
  if (rows.length > 1000) return { ok: false, error: "الحد الأقصى للاستيراد في المرة الواحدة هو 1000 طالب." };

  const norm = (value?: string | null) => (value ?? "").trim().toLowerCase();
  const keyOf = (firstName: string, lastName: string, phone?: string | null) =>
    `${norm(firstName)}|${norm(lastName)}|${norm(phone)}`;
  const parentKeyOf = (name: string, phone?: string | null) => {
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ") || "-";
    const phoneKey = norm(phone);
    return {
      key: phoneKey ? `phone:${phoneKey}` : `name:${norm(firstName)}|${norm(lastName)}`,
      firstName,
      lastName,
      phoneKey,
    };
  };

  const { data: existingStudents } = await client
    .from("students")
    .select("first_name,last_name,phone")
    .eq("academy_id", aid);
  const seen = new Set(
    (existingStudents ?? []).map((student: any) =>
      keyOf(student.first_name, student.last_name, student.phone),
    ),
  );

  const { data: existingParents } = await client
    .from("parents")
    .select("id,first_name,last_name,phone")
    .eq("academy_id", aid)
    .limit(2000);
  const parentCache = new Map<string, string>();
  for (const parent of existingParents ?? []) {
    const phoneKey = norm(parent.phone);
    const nameKey = `${norm(parent.first_name)}|${norm(parent.last_name)}`;
    if (phoneKey) parentCache.set(`phone:${phoneKey}`, parent.id);
    if (nameKey) parentCache.set(`name:${nameKey}`, parent.id);
  }

  const now = new Date().toISOString();
  const errors: string[] = [];
  const accepted: Array<{ row: ImportRow; rowNumber: number; parentKey?: string }> = [];
  let skippedDup = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2;
    if (!row.first_name?.trim() || !row.last_name?.trim()) {
      errors.push(`صف ${rowNumber}: ناقص الاسم`);
      continue;
    }

    const key = keyOf(row.first_name, row.last_name, row.phone);
    if (seen.has(key)) {
      skippedDup++;
      continue;
    }
    seen.add(key);

    accepted.push({
      row,
      rowNumber,
      parentKey: row.parent_name?.trim()
        ? parentKeyOf(row.parent_name, row.parent_phone).key
        : undefined,
    });
  }

  // Build unique new parents in memory, then insert them in batches.
  const newParentByKey = new Map<string, { key: string; id: string; rowNumbers: number[]; record: Record<string, unknown> }>();
  for (const item of accepted) {
    if (!item.parentKey || parentCache.has(item.parentKey) || newParentByKey.has(item.parentKey)) continue;
    const details = parentKeyOf(item.row.parent_name ?? "", item.row.parent_phone);
    const id = crypto.randomUUID();
    newParentByKey.set(item.parentKey, {
      key: item.parentKey,
      id,
      rowNumbers: [item.rowNumber],
      record: {
        id,
        academy_id: aid,
        profile_id: null,
        first_name: details.firstName,
        last_name: details.lastName,
        email: `p.${id.slice(0, 8)}@parent.local`,
        phone: item.row.parent_phone?.trim() || null,
        occupation: null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  for (const item of accepted) {
    if (!item.parentKey) continue;
    const pending = newParentByKey.get(item.parentKey);
    if (pending && !pending.rowNumbers.includes(item.rowNumber)) pending.rowNumbers.push(item.rowNumber);
  }

  const parentFailures = new Set<string>();
  for (const batch of chunks([...newParentByKey.values()], BATCH_SIZE)) {
    const response = await client.from("parents").insert(batch.map((item) => item.record));
    if (response.error) {
      // Fall back to row-level inserts only for a failed batch, preserving a
      // useful error per affected row without making the normal path slow.
      for (const item of batch) {
        const single = await client.from("parents").insert(item.record);
        if (single.error) {
          parentFailures.add(item.id);
          for (const rowNumber of item.rowNumbers) {
            errors.push(`صف ${rowNumber}: ولي الأمر: ${single.error.message}`);
          }
        }
      }
    }
    for (const item of batch) {
      if (!parentFailures.has(item.id)) {
        parentCache.set(item.key, item.id);
        const parent = item.record as any;
        collections().parents.push(parent);
      }
    }
  }

  const studentRecords: Array<{ id: string; record: Record<string, unknown>; rowNumber: number }> = [];
  for (const item of accepted) {
    let parentId: string | null = null;
    if (item.parentKey) {
      const pending = newParentByKey.get(item.parentKey);
      parentId = parentCache.get(item.parentKey) ?? pending?.id ?? null;
      if (pending && parentFailures.has(pending.id)) continue;
    }

    const id = crypto.randomUUID();
    studentRecords.push({
      rowNumber: item.rowNumber,
      id,
      record: {
        id,
        academy_id: aid,
        owner_teacher_id: ownerTeacherId,
        first_name: item.row.first_name.trim(),
        last_name: item.row.last_name.trim(),
        phone: item.row.phone?.trim() || null,
        email: null,
        date_of_birth: null,
        gender: null,
        parent_id: parentId,
        school: item.row.school?.trim() || null,
        grade: item.row.grade?.trim() || null,
        notes: null,
        // Imported students remain inactive until a parent approves consent.
        status: "INACTIVE",
        consent_given: false,
        consent_at: null,
        consent_by: null,
        consent_version: null,
        enrolled_at: now,
        created_at: now,
        updated_at: now,
      },
    });
  }

  let created = 0;
  for (const batch of chunks(studentRecords, BATCH_SIZE)) {
    const response = await client.from("students").insert(batch.map((item) => item.record));
    if (!response.error) {
      created += batch.length;
      for (const item of batch) collections().students.push(item.record as any);
      continue;
    }

    // Keep partial-row diagnostics for unexpected schema/constraint errors.
    for (const item of batch) {
      const single = await client.from("students").insert(item.record);
      if (single.error) errors.push(`صف ${item.rowNumber}: ${single.error.message}`);
      else {
        created++;
        collections().students.push(item.record as any);
      }
    }
  }

  invalidateStore();
  revalidatePath("/students");
  revalidatePath("/dashboard");
  void audit({
    action: "student.import",
    entity_type: "student",
    metadata: { created, skipped_duplicates: skippedDup, error_count: errors.length },
  });
  revalidatePath("/analytics");
  return { ok: true, created, skippedDup, errors };
}
