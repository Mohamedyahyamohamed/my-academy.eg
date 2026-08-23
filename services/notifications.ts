/**
 * Notifications service.
 */
import type { AppNotification, NotificationType, SessionUser } from "@/types";
import { collections } from "./data/store";
import { byAcademy, fetchTableRLS } from "./_shared";
import { currentAcademyId } from "./session";

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  const items = await fetchTableRLS<AppNotification>("notifications");
  return items
    .filter((n) => n.user_id === userId || n.user_id === null)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function unreadCount(userId: string): Promise<number> {
  const items = await fetchTableRLS<AppNotification>("notifications");
  return items.filter(
    (n) => (n.user_id === userId || n.user_id === null) && !n.read,
  ).length;
}

export interface WhatsAppLog {
  id: string;
  academy_id: string;
  parent_id: string | null;
  student_id: string | null;
  event_type: string;
  template_name: string | null;
  recipient_phone_last4: string | null;
  external_message_id: string | null;
  status: string;
  failure_reason: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export async function listWhatsAppLogs(user: SessionUser): Promise<WhatsAppLog[]> {
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return [];
  const rows = await fetchTableRLS<WhatsAppLog>("whatsapp_message_logs", user.academy_id);
  return rows.filter((row) => row.academy_id === user.academy_id).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 200);
}

export function markRead(id: string): void {
  const n = collections().notifications.find((x) => x.id === id);
  if (n) n.read = true;
}

export function markAllRead(userId: string): void {
  for (const n of collections().notifications) {
    if (n.user_id === userId || n.user_id === null) n.read = true;
  }
}

export function pushNotification(
  userId: string | null,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
): AppNotification {
  const n: AppNotification = {
    id: crypto.randomUUID(),
    academy_id: currentAcademyId(),
    user_id: userId,
    type,
    title,
    message,
    link: link ?? null,
    read: false,
    created_at: new Date().toISOString(),
  };
  collections().notifications.unshift(n);
  return n;
}
