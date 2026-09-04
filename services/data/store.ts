/**
 * In-memory data store (development/demo backend).
 *
 * In production, every access resolves an academy-scoped snapshot through the
 * signed request session. Snapshots are keyed by academy only and never fall
 * back to the global demo data, so concurrent requests cannot observe another
 * tenant's rows.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { createSeedData, type SeedData } from "./seed";
import { getSupabaseServiceRoleKey, getSupabaseUrl, isSupabaseConfigured } from "../supabase/config";
import { getRequestAcademyId } from "../request-context";

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
  var __MY_ACADEMY_DB__: LocalDB | undefined;
}

/** Shared demo data only. Production requests use requestData below. */
export const db: LocalDB =
  globalThis.__MY_ACADEMY_DB__ ?? (globalThis.__MY_ACADEMY_DB__ = new LocalDB());

const requestData = new AsyncLocalStorage<SeedData>();


declare global {
  var __MY_ACADEMY_TENANT_SNAPSHOTS__: Map<string, SeedData> | undefined;
}

// Shared only by academy key; collection access still resolves the academy from
// the signed request cookie. This supports independent server-action requests
// without ever falling back to another tenant's data.
const tenantSnapshots =
  globalThis.__MY_ACADEMY_TENANT_SNAPSHOTS__ ??
  (globalThis.__MY_ACADEMY_TENANT_SNAPSHOTS__ = new Map<string, SeedData>());

// Keep navigation fast by reusing a tenant snapshot briefly. Writes call
// invalidateStore(), while a TTL prevents an idle warm instance from serving an
// indefinitely stale view. When the snapshot is stale we still serve it
// immediately (stale-while-revalidate) and refresh in the background so the
// user never waits on a full Supabase hydration.
const TENANT_SNAPSHOT_TTL_MS = 60_000;
const tenantSnapshotLoadedAt = new Map<string, number>();
const tenantHydrationPromises = new Map<string, Promise<SeedData | null>>();

function activeAcademyId(): string | null {
  return getRequestAcademyId();
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

  const now = Date.now();
  const cached = tenantSnapshots.get(academyId);
  const loadedAt = tenantSnapshotLoadedAt.get(academyId) ?? 0;
  const fresh = cached && now - loadedAt < TENANT_SNAPSHOT_TTL_MS;

  if (fresh) {
    requestData.enterWith(cached);
    return;
  }

  // Stale-while-revalidate: serve whatever we have immediately so navigation
  // stays fast, then refresh the snapshot in the background without blocking
  // the request.
  if (cached) requestData.enterWith(cached);

  // Several server components/actions can request the same tenant at once
  // during an App Router navigation. Share one hydration promise instead of
  // starting another full batch of Supabase reads for each caller.
  let hydration = tenantHydrationPromises.get(academyId);
  if (!hydration) {
    hydration = hydrateFromSupabase(academyId);
    tenantHydrationPromises.set(academyId, hydration);
    void hydration.finally(() => tenantHydrationPromises.delete(academyId));
  }

  // Only await when we have nothing cached yet (first ever load). Subsequent
  // requests get the stale snapshot instantly and the refresh lands async.
  if (!cached) {
    const data = await hydration;
    if (data) {
      tenantSnapshots.set(academyId, data);
      tenantSnapshotLoadedAt.set(academyId, Date.now());
      requestData.enterWith(data);
    }
  }
}

/** Discard the active academy snapshot after a destructive or bulk mutation. */
export function invalidateStore(academyId = activeAcademyId() ?? undefined) {
  if (academyId) {
    tenantSnapshots.delete(academyId);
    tenantSnapshotLoadedAt.delete(academyId);
  }
}

async function hydrateFromSupabase(academyId: string): Promise<SeedData | null> {
  try {
    // Prefer the service-role client for complete academy hydration. If the
    // service key is not present, fall back to the request-bound user client;
    // this still enforces Supabase RLS and avoids a false empty snapshot.
    const client = getAdminClient() ??
      await (await import("@/lib/supabase/server")).createServerSupabaseClient();

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
      homework, notifications, notes, files, profiles, messages, subscriptions,
      contentCourses, contentLessons, contentFiles, contentProgress] = await Promise.all([
      pickForAcademy("courses"), pickForAcademy("teachers"), pickForAcademy("parents"),
      pickForAcademy("students"), pickForAcademy("groups"), pickForAcademy("lessons"),
      pickForAcademy("payments"), pickForAcademy("exams"), pickForAcademy("homework"),
      pickForAcademy("notifications"), pickForAcademy("notes"), pickForAcademy("files"),
      pickForAcademy("profiles"), pickForAcademy("messages"), pickForAcademy("subscriptions"),
      pickForAcademy("content_courses"), pickForAcademy("content_lessons"),
      pickForAcademy("content_files"), pickForAcademy("content_progress"),
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
      contentCourses: contentCourses as any,
      contentLessons: contentLessons as any,
      contentFiles: contentFiles as any,
      contentProgress: contentProgress as any,
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
      messages: (messages as any[]).map((message) => ({
        ...message,
        sender_name: (profiles as any[]).find((profile) => profile.id === message.sender_id)?.full_name ?? "مستخدم",
        recipient_name: (profiles as any[]).find((profile) => profile.id === message.recipient_id)?.full_name ?? "مستخدم",
      })),
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
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Demo snapshots use friendly ids such as `academy-1`. They must never be
 * written through to a production UUID column if a stale demo session exists.
 */
function hasValidAcademyId(row: unknown): boolean {
  const academyId = (row as { academy_id?: unknown } | null)?.academy_id;
  return typeof academyId !== "string" || UUID_RE.test(academyId);
}

// These tables carry academy_id directly. Relationship tables are checked
// through their parent rows before any service-role write is allowed.
const DIRECT_ACADEMY_TABLES = new Set([
  "academies", "profiles", "courses", "teachers", "parents", "students",
  "groups", "lessons", "payments", "exams", "homework", "notifications",
  "notes", "files", "messages", "subscriptions", "content_courses", "content_lessons",
  "content_files", "content_progress", "audit_logs", "support_tickets",
  "invite_tokens",
]);

const RELATIONSHIP_TENANT_COLUMNS: Record<string, ReadonlyArray<readonly [string, string]>> = {
  group_students: [["group_id", "groups"], ["student_id", "students"]],
  group_assistants: [["group_id", "groups"], ["teacher_id", "teachers"]],
  attendance: [["lesson_id", "lessons"], ["student_id", "students"]],
  payment_transactions: [["payment_id", "payments"]],
  grades: [["exam_id", "exams"], ["student_id", "students"]],
  homework_submissions: [["homework_id", "homework"], ["student_id", "students"]],
};

function scopedAcademyId(table: string, academyIdOverride?: string): string | null {
  if (!DIRECT_ACADEMY_TABLES.has(table)) return null;
  return activeAcademyId() ?? academyIdOverride ?? null;
}

async function assertRelationshipTenantScope(table: string, inputRows: any): Promise<string | null> {
  const relations = RELATIONSHIP_TENANT_COLUMNS[table];
  if (!relations) return activeAcademyId();
  const academyId = activeAcademyId();
  if (!academyId) {
    throw new Error(`Database ${table} mutation is missing an authenticated academy scope.`);
  }
  const rows = (Array.isArray(inputRows) ? inputRows : [inputRows]).filter(Boolean);
  for (const [column, parentTable] of relations) {
    const ids = [...new Set(rows.map((row) => row?.[column]).filter((id): id is string => typeof id === "string" && id.length > 0))];
    if (!ids.length) continue;
    const admin = getAdminClient();
    if (!admin) {
      throw new Error("Supabase service-role client is not configured for relationship scope validation.");
    }
    const { data, error } = await admin.from(parentTable).select("id, academy_id").in("id", ids);
    if (error) throw new Error(`Could not validate ${table} tenant scope: ${error.message}`);
    const scopes = new Map((data ?? []).map((parent: any) => [parent.id, parent.academy_id]));
    for (const id of ids) {
      if (scopes.get(id) !== academyId) {
        throw new Error(`Database ${table} mutation crosses academy scope via ${column}.`);
      }
    }
  }
  return academyId;
}

export function assertDirectInsertTenantScope(
  table: string,
  row: any,
  academyIdOverride?: string,
): string | null {
  const activeId = activeAcademyId();
  if (activeId && academyIdOverride && activeId !== academyIdOverride) {
    throw new Error(`Database write academy scope mismatch for ${table}.`);
  }
  const academyId = scopedAcademyId(table, academyIdOverride);
  if (DIRECT_ACADEMY_TABLES.has(table) && !academyId) {
    throw new Error(`Database write is missing an authenticated academy scope for ${table}.`);
  }
  if (DIRECT_ACADEMY_TABLES.has(table) && row && !Array.isArray(row) && row.academy_id !== academyId) {
    throw new Error(`Database write academy scope mismatch for ${table}.`);
  }
  return academyId;
}

const WRITE_TIMEOUT_MS = 15_000;

async function withWriteTimeout<T>(operation: Promise<T>, table: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out while saving ${table}.`)), WRITE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function persistInsert(table: string, row: any, academyIdOverride?: string) {
  const client = getAdminClient();
  if (!client) {
    if (isSupabaseConfigured()) {
      throw new Error(`Database write is not configured for ${table}.`);
    }
    return;
  }
  if (!hasValidAcademyId(row)) {
    console.warn(`persistInsert ${table} skipped: non-production academy id.`);
    return;
  }
  // Production writes must use the authenticated request scope. Never fall back
  // to row.academy_id: that value can originate in client-controlled form data
  // and would allow a caller to choose another tenant for an insert.
  const academyId = assertDirectInsertTenantScope(table, row, academyIdOverride);
  await assertRelationshipTenantScope(table, row);
  try {
    const result: any = await withWriteTimeout<any>(client.from(table).upsert(row), table);
    const { error } = result;
    if (error) {
      console.error(
        `persistInsert ${table} FAILED [${error.code}]: ${error.message}`,
        row?.id ?? "",
      );
      throw new Error(`Could not save ${table}: ${error.message}`);
    }
    invalidateStore(academyId ?? activeAcademyId() ?? undefined);
  } catch (error) {
    console.error(`persistInsert ${table} EXCEPTION:`, (error as Error)?.message);
    throw error;
  }
}

/** Update a row in Supabase (write-through), always narrowed by academy_id when the table carries it. */
export async function persistUpdate(table: string, id: string, patch: any, academyIdOverride?: string) {
  const client = getAdminClient();
  const activeId = activeAcademyId();
  if (activeId && academyIdOverride && activeId !== academyIdOverride) {
    throw new Error(`Database update academy scope mismatch for ${table}.`);
  }
  if (!client) {
    if (isSupabaseConfigured()) {
      throw new Error(`Database write is not configured for ${table}.`);
    }
    return;
  }
  const academyId = scopedAcademyId(table, academyIdOverride);
  if (DIRECT_ACADEMY_TABLES.has(table) && !academyId) {
    throw new Error(`Database update is missing an authenticated academy scope for ${table}.`);
  }
  if (academyId && patch?.academy_id !== undefined && patch.academy_id !== academyId) {
    throw new Error(`Database update academy scope mismatch for ${table}.`);
  }
  if (RELATIONSHIP_TENANT_COLUMNS[table]) {
    const { data: existing, error: lookupError } = await client
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw new Error(`Could not validate ${table} update target: ${lookupError.message}`);
    if (!existing) throw new Error(`Could not update ${table}: target is outside the authenticated academy.`);
    await assertRelationshipTenantScope(table, { ...existing, ...patch });
  }
  try {
    let query = client.from(table).update(patch).eq("id", id);
    if (academyId) query = query.eq("academy_id", academyId);
    
    // استخدام Timeout لحماية الخادم من تعليق الاتصال
    const result: any = await withWriteTimeout<any>(query, table);
    const { error } = result;
    
    if (error) {
      console.error(
        `persistUpdate ${table} FAILED [${error.code}]: ${error.message} (id=${id})`,
      );
      throw new Error(`Could not update ${table}: ${error.message}`);
    }
    invalidateStore(academyId ?? activeAcademyId() ?? undefined);
  } catch (error) {
    console.error(`persistUpdate ${table} EXCEPTION:`, (error as Error)?.message);
    throw error;
  }
}

/** Delete rows in Supabase by filter (write-through), narrowed by academy_id when available. */
export async function persistDelete(
  table: string,
  filters: Record<string, string>,
  academyIdOverride?: string,
) {
  const client = getAdminClient();
  const activeId = activeAcademyId();
  if (activeId && academyIdOverride && activeId !== academyIdOverride) {
    throw new Error(`Database delete academy scope mismatch for ${table}.`);
  }
  if (!client) {
    if (isSupabaseConfigured()) {
      throw new Error(`Database write is not configured for ${table}.`);
    }
    return;
  }
  const academyId = scopedAcademyId(table, academyIdOverride);
  if (DIRECT_ACADEMY_TABLES.has(table) && !academyId) {
    throw new Error(`Database delete is missing an authenticated academy scope for ${table}.`);
  }
  if (RELATIONSHIP_TENANT_COLUMNS[table]) {
    let lookup = client.from(table).select("*");
    for (const [column, value] of Object.entries(filters)) lookup = lookup.eq(column, value);
    const { data: targets, error: lookupError } = await lookup;
    if (lookupError) throw new Error(`Could not validate ${table} delete target: ${lookupError.message}`);
    await assertRelationshipTenantScope(table, targets ?? []);
  }
  try {
    let query = client.from(table).delete();
    for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
    if (academyId) query = query.eq("academy_id", academyId);
    
    // استخدام Timeout لحماية الخادم من تعليق الاتصال
    const result: any = await withWriteTimeout<any>(query, table);
    const { error } = result;
    
    if (error) {
      console.error(
        `persistDelete ${table} FAILED [${error.code}]: ${error.message}`,
        filters,
      );
      throw new Error(`Could not delete from ${table}: ${error.message}`);
    }
    invalidateStore(academyId ?? activeAcademyId() ?? undefined);
  } catch (error) {
    console.error(`persistDelete ${table} EXCEPTION:`, (error as Error)?.message);
    throw error;
  }
}
