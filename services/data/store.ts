/**
 * In-memory data store (development/demo backend).
 *
 * When Supabase is configured, this acts as a WRITE-THROUGH CACHE: data is
 * loaded from Supabase into memory on first access (reads stay fast) and every
 * mutation is mirrored to Supabase so it persists across restarts.
 *
 * When Supabase is NOT configured, it's a pure in-memory seeded store.
 */
import { createSeedData, type SeedData } from "./seed";

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

/** Shared singleton across hot-reloads in dev. */
export const db: LocalDB =
  globalThis.__MY_ACADEMY_DB__ ?? (globalThis.__MY_ACADEMY_DB__ = new LocalDB());

/** Convenience getter for the current collections. */
export const collections = () => db.data;

/* ----------------------------------------------------------------- */
/* Supabase write-through cache                                       */
/* ----------------------------------------------------------------- */

/**
 * Ensure the in-memory store is hydrated from Supabase.
 * ALWAYS re-hydrates on every request — guarantees fresh data on Vercel.
 */
export async function ensureStoreLoaded(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await hydrateFromSupabase();
}

/** No-op (always re-hydrate now). Kept for backward compat. */
export function invalidateStore() {}

async function hydrateFromSupabase(): Promise<void> {
  try {
    const client = getAdminClient();
    if (!client) return;
    const { data } = await client
      .from("academies")
      .select("*")
      .order("created_at")
      .limit(1)
      .single();
    if (!data) return;
    const a = data as any;

    const pick = async (table: string) =>
      (await client.from(table).select("*")).data ?? [];

    const [courses, teachers, parents, students, groups, groupStudents, lessons,
      attendance, payments, transactions, exams, grades, homework, submissions,
      notifications, notes, files, profiles] = await Promise.all([
      pick("courses"), pick("teachers"), pick("parents"), pick("students"),
      pick("groups"), pick("group_students"), pick("lessons"), pick("attendance"),
      pick("payments"), pick("payment_transactions"), pick("exams"), pick("grades"),
      pick("homework"), pick("homework_submissions"), pick("notifications"),
      pick("notes"), pick("files"), pick("profiles"),
    ]);
    // group_assistants may not exist yet (added by supabase/assistants.sql) — best-effort.
    let groupAssistants: any[] = [];
    try {
      groupAssistants = (await client.from("group_assistants").select("*")).data ?? [];
    } catch {
      groupAssistants = [];
    }
    // audit_logs may not exist yet (added by supabase/audit-logs.sql) — best-effort.
    let auditLogs: any[] = [];
    try {
      auditLogs = (await client.from("audit_logs").select("*").limit(500).order("created_at", { ascending: false }))?.data ?? [];
    } catch {
      auditLogs = [];
    }

    db.data = {
      academies: [a],
      profiles: profiles as any,
      courses: courses as any,
      teachers: teachers as any,
      parents: parents as any,
      students: students as any,
      groups: groups as any,
      groupStudents: (groupStudents as any[]).map((g) => ({
        group_id: g.group_id,
        student_id: g.student_id,
        joined_at: g.joined_at,
      })),
      groupAssistants: (groupAssistants as any[]).map((g) => ({
        group_id: g.group_id,
        teacher_id: g.teacher_id,
        assigned_at: g.assigned_at,
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
    };
  } catch (e) {
    // Fall back to seed data if hydration fails.
    console.error("store hydrate failed:", (e as Error)?.message);
  }
}

import { isSupabaseConfigured } from "../supabase/config";

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
  } catch (e) {
    console.error(`persistInsert ${table} EXCEPTION:`, (e as Error)?.message);
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
  } catch (e) {
    console.error(`persistUpdate ${table} EXCEPTION:`, (e as Error)?.message);
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
    let q = client.from(table).delete();
    for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
    const { error } = await q;
    if (error) {
      console.error(
        `persistDelete ${table} FAILED [${error.code}]: ${error.message}`,
        filters,
      );
    }
  } catch (e) {
    console.error(`persistDelete ${table} EXCEPTION:`, (e as Error)?.message);
  }
}
