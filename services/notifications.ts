/**
 * Notifications service.
 */
import type { AppNotification, NotificationType } from "@/types";
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
