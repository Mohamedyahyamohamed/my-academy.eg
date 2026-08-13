/**
 * In-memory data store (development/demo backend).
 *
 * In production, every access resolves an academy-scoped snapshot through the
 * signed request session. Snapshots are keyed by academy only and never fall
 * back to the global demo data, so concurrent requests cannot observe another
 * tenant's rows.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { createSeedData, type SeedData } from "./seed";
import { isSupabaseConfigured } from "../supabase/config";
import { SESSION_COOKIE } from "@/lib/auth";
import { readSignedSession } from "@/lib/session-cookie";

class LocalDB {
  data: SeedData;

  constructor() {
    this.data = createSeedData();
  }

  reset() {
    this.data = createSeedData();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __MY_ACADEMY_DB__: LocalDB | undefined;
}

/** Shared demo data only. Production requests use requestData below. */
export const db: LocalDB =
  globalThis.__MY_ACADEMY_DB__ ?? (globalThis.__MY_ACADEMY_DB__ = new LocalDB());

const requestData = new AsyncLocalStorage<SeedData>();

declare global {
  // eslint-disable-next-line no-var
  var __MY_ACADEMY_TENANT_SNAPSHOTS__: Map<string, SeedData> | undefined;
}

// Shared only by academy key; collection access still resolves the academy from
// the signed request cookie. This supports independent server-action requests
// without ever falling back to another tenant's data.
const tenantSnapshots =
  globalThis.__MY_ACADEMY_TENANT_SNAPSHOTS__ ??
  (globalThis.__MY_ACADEMY_TENANT_SNAPSHOTS__ = new Map<string, SeedData>());

function activeAcademyId(): string | null {
  try {
    return readSignedSession(cookies().get(SESSION_COOKIE)?.value)?.academy_id ?? null;
  } catch {
    return null;
  }
}

function emptyData(): SeedData {
  const data = createSeedData();
  for (const key of Object.keys(data) as Array<keyof SeedData>) {
    const value = data[key];
    if (Array.isArray(value)) (value as unknown[]).length = 0;
  }
  return data;
}

/**
 * Return the current request's scoped data snapshot. In production, calls that
 * bypass ensureStoreLoaded fail closed with an empty snapshot rather than demo
 * data or another tenant's cached rows.
 */
export const collections = (): SeedData => {
  if (!isSupabaseConfigured()) return db.data;
  const academyId = activeAcademyId();
  if (!academyId) return emptyData();
  return requestData.getStore() ?? tenantSnapshots.get(academyId) ?? emptyData();
};

/* ----------------------------------------------------------------- */
/* Supabase request-scoped hydration                                 */
/* ----------------------------------------------------------------- */

/**
 * Load the signed-in academy's data for the current server request.
 * Pre-auth callers intentionally receive no production snapshot; login resolves
 * its profile and membership directly through Supabase instead.
 */
export async function ensureStoreLoaded(academyId?: string): Promise<void> {
  if (!isSupabaseConfigured() || !academyId) return;
  const data = await hydrateFromSupabase(academyId);
  if (data) {
    tenantSnapshots.set(academyId, data);
    requestData.enterWith(data);
  }
}

/** Discard the active academy snapshot after a destructive or bulk mutation. */
export function invalidateStore(academyId = activeAcademyId() ?? undefined) {
  if (academyId) tenantSnapshots.delete(academyId);
}

async function hydrateFromSupabase(academyId: string): Promise<SeedData | null> {
  try {
    const client = getAdminClient();
    if (!client) return null;

    const { data: academy, error: academyError } = await client
      .from("academies")
      .select("*")
      .eq("id", academyId)
      .maybeSingle();
    if (academyError || !academy) {
      if (academyError) console.error("academy hydration failed:", academyError.message);
      return null;
    }

    const pickForAcademy = async (table: string): Promise<any[]> => {
      const { data, error } = await client.from(table).select("*").eq("academy_id", academyId);
      if (error) {
        console.error(`store hydrate ${table} failed:`, error.message);
        return [];
      }
      return data ?? [];
    };
    const pickForIds = async (table: string, column: string, ids: string[]): Promise<any[]> => {
      if (!ids.length) return [];
      const { data, error } = await client.from(table).select("*").in(column, ids);
      if (error) {
        console.error(`store hydrate ${table} failed:`, error.message);
        return [];
      }
      return data ?? [];
    };

    const [courses, teachers, parents, students, groups, lessons, payments, exams,
      homework, notifications, notes, files, profiles, subscriptions] = await Promise.all([
      pickForAcademy("courses"), pickForAcademy("teachers"), pickForAcademy("parents"),
      pickForAcademy("students"), pickForAcademy("groups"), pickForAcademy("lessons"),
      pickForAcademy("payments"), pickForAcademy("exams"), pickForAcademy("homework"),
      pickForAcademy("notifications"), pickForAcademy("notes"), pickForAcademy("files"),
      pickForAcademy("profiles"), pickForAcademy("subscriptions"),
    ]);

    const groupIds = groups.map((group) => group.id as string);
    const lessonIds = lessons.map((lesson) => lesson.id as string);
    const paymentIds = payments.map((payment) => payment.id as string);
    const examIds = exams.map((exam) => exam.id as string);
    const homeworkIds = homework.map((item) => item.id as string);

    const [groupStudents, groupAssistants, attendance, transactions, grades, submissions] = await Promise.all([
      pickForIds("group_students", "group_id", groupIds),
      pickForIds("group_assistants", "group_id", groupIds),
      pickForIds("attendance", "lesson_id", lessonIds),
      pickForIds("payment_transactions", "payment_id", paymentIds),
      pickForIds("grades", "exam_id", examIds),
      pickForIds("homework_submissions", "homework_id", homeworkIds),
    ]);

    // Optional tables are deployed by separate migrations. Keep their absence
    // non-fatal while preserving the academy predicate when available.
    let auditLogs: any[] = [];
    try {
      const { data, error } = await client
        .from("audit_logs")
        .select("*")
        .eq("academy_id", academyId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!error) auditLogs = data ?? [];
    } catch {
      auditLogs = [];
    }

    return {
      academies: [academy] as any,
      profiles: profiles as any,
      courses: courses as any,
      teachers: teachers as any,
      parents: parents as any,
      students: students as any,
      groups: groups as any,
      groupStudents: (groupStudents as any[]).map((row) => ({
        group_id: row.group_id,
        student_id: row.student_id,
        joined_at: row.joined_at,
      })),
      groupAssistants: (groupAssistants as any[]).map((row) => ({
        group_id: row.group_id,
        teacher_id: row.teacher_id,
        assigned_at: row.assigned_at,
      })),
      lessons: lessons as any,
      attendance: attendance as any,
      payments: payments as any,
      transactions: transactions as any,
      exams: exams as any,
      grades: grades as any,
      homework: homework as any,
      submissions: submissions as any,
      notifications: notifications as any,
      notes: notes as any,
      files: files as any,
      auditLogs: auditLogs as any,
      subscriptions: subscriptions as any,
    };
  } catch (error) {
    console.error("store hydrate failed:", (error as Error)?.message);
    return null;
  }
}

let _adminClient: any = null;
function getAdminClient() {
  if (_adminClient) return _adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // ws polyfill for Node < 22 (supabase-js realtime)
  try {
    const { WebSocket: WS } = require("ws");
    (globalThis as any).WebSocket = (globalThis as any).WebSocket || WS;
  } catch {}
  const { createClient } = require("@supabase/supabase-js");
  _adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
}

/**
 * Insert/upsert a row to Supabase (write-through).
 * IMPORTANT: checks `.error` and logs loudly — silent failures here previously
 * caused "Add/Edit student does nothing" bugs (writes returned a PostgrestError
 * that was never inspected).
 */
export async function persistInsert(table: string, row: any) {
  const client = getAdminClient();
  if (!client) return;
  try {
    const { error } = await client.from(table).upsert(row);
    if (error) {
      console.error(
        `persistInsert ${table} FAILED [${error.code}]: ${error.message}`,
        row?.id ?? "",
      );
    }
  } catch (error) {
    console.error(`persistInsert ${table} EXCEPTION:`, (error as Error)?.message);
  }
}

/** Update a row in Supabase (write-through). Logs errors loudly. */
export async function persistUpdate(table: string, id: string, patch: any) {
  const client = getAdminClient();
  if (!client) return;
  try {
    const { error } = await client.from(table).update(patch).eq("id", id);
    if (error) {
      console.error(
        `persistUpdate ${table} FAILED [${error.code}]: ${error.message} (id=${id})`,
      );
    }
  } catch (error) {
    console.error(`persistUpdate ${table} EXCEPTION:`, (error as Error)?.message);
  }
}

/** Delete rows in Supabase by filter (write-through). Logs errors loudly. */
export async function persistDelete(
  table: string,
  filters: Record<string, string>,
) {
  const client = getAdminClient();
  if (!client) return;
  try {
    let query = client.from(table).delete();
    for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
    const { error } = await query;
    if (error) {
      console.error(
        `persistDelete ${table} FAILED [${error.code}]: ${error.message}`,
        filters,
      );
    }
  } catch (error) {
    console.error(`persistDelete ${table} EXCEPTION:`, (error as Error)?.message);
  }
}
