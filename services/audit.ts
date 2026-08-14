/**
 * Audit log service — records sensitive operations.
 * Persists to Postgres (write-through) and in-memory cache.
 */
import { collections } from "./data/store";
import { currentAcademyId } from "./session";
import { headers } from "next/headers";

export interface AuditEntry {
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_data?: any;
  new_data?: any;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  academy_id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_data: any;
  new_data: any;
  metadata: any;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Log an audit entry. Reads the current user + academy from the session.
 * Best-effort: never throws (don't break the main operation).
 */
export async function audit(entry: AuditEntry, actor?: { id: string; role: string }): Promise<void> {
  try {
    const now = new Date().toISOString();
    let ip: string | null = null;
    let ua: string | null = null;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      ua = h.get("user-agent") ?? null;
    } catch {}

    const log: AuditLog = {
      id: crypto.randomUUID(),
      academy_id: currentAcademyId(),
      actor_user_id: actor?.id ?? null,
      actor_role: actor?.role ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      old_data: entry.old_data ?? null,
      new_data: entry.new_data ?? null,
      metadata: entry.metadata ?? {},
      ip,
      user_agent: ua,
      created_at: now,
    };

    // In-memory
    if (!collections().auditLogs) (collections() as any).auditLogs = [];
    collections().auditLogs.push(log as any);

    // Persist to Supabase (best-effort)
    try {
      const { persistInsert } = await import("./data/store");
      await persistInsert("audit_logs", {
        academy_id: log.academy_id,
        actor_user_id: log.actor_user_id,
        actor_role: log.actor_role,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        old_data: log.old_data,
        new_data: log.new_data,
        metadata: log.metadata,
        ip: log.ip,
        user_agent: log.user_agent,
      });
    } catch {}
  } catch {
    // Never let audit logging break the main operation.
  }
}

/** List audit logs for the current academy (admin only). */
export function listAuditLogs(
  filters: { search?: string; action?: string; entity_type?: string; actor?: string; page?: number; pageSize?: number } = {},
  academyId?: string,
) {
  let items = ((collections() as any).auditLogs ?? []) as AuditLog[];
  const aid = academyId ?? currentAcademyId();
  items = items.filter((l) => l.academy_id === aid);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter((l) =>
      l.action.toLowerCase().includes(q) ||
      (l.entity_type ?? "").toLowerCase().includes(q) ||
      (l.entity_id ?? "").toLowerCase().includes(q),
    );
  }
  if (filters.action && filters.action !== "ALL") items = items.filter((l) => l.action === filters.action);
  if (filters.entity_type && filters.entity_type !== "ALL") items = items.filter((l) => l.entity_type === filters.entity_type);
  items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const total = items.length;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 30;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
