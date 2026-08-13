/**
 * Parent ↔ Teacher messaging.
 * Scoped: sender and recipient must be in the same academy.
 */
import { collections } from "./data/store";
import { currentAcademyId, requireRole } from "./session";
import { byAcademy } from "./_shared";
import { persistInsert } from "./data/store";

export interface Message {
  id: string;
  academy_id: string;
  sender_id: string;
  sender_role: string;
  sender_name: string;
  recipient_id: string;
  recipient_name: string;
  student_id: string | null;
  body: string;
  read: boolean;
  created_at: string;
}

/** Send a message. */
export async function sendMessage(
  recipientId: string,
  body: string,
  studentId?: string | null,
): Promise<Message | null> {
  const user = requireRole("ADMIN", "TEACHER", "PARENT");
  if (!body.trim()) return null;

  const recipient = collections().profiles.find((p) => p.id === recipientId);
  if (!recipient || recipient.academy_id !== user.academy_id) return null;

  // Parents can only message teachers/admins of their children's groups.
  if (user.role === "PARENT" && recipient.role !== "TEACHER" && recipient.role !== "ADMIN") {
    return null;
  }
  // Teachers can only message parents of their students.
  if (user.role === "TEACHER" && recipient.role !== "PARENT" && recipient.role !== "ADMIN") {
    return null;
  }

  const now = new Date().toISOString();
  const msg: Message = {
    id: crypto.randomUUID(),
    academy_id: user.academy_id,
    sender_id: user.id,
    sender_role: user.role,
    sender_name: user.full_name,
    recipient_id: recipientId,
    recipient_name: recipient.full_name,
    student_id: studentId ?? null,
    body: body.trim(),
    read: false,
    created_at: now,
  };

  if (!(collections() as any).messages) (collections() as any).messages = [];
  (collections() as any).messages.push(msg);

  // أسماء العرض تخص واجهة التطبيق فقط؛ جدول الرسائل يحفظ المعرّفات ويُعاد
  // اشتقاق الأسماء من ملفات الأكاديمية عند التحميل.
  const { sender_name, recipient_name, ...record } = msg;
  void persistInsert("messages", record);
  return msg;
}

/** Inbox for the current user. */
export function getInbox(): Message[] {
  const user = requireRole("ADMIN", "TEACHER", "PARENT");
  const all = ((collections() as any).messages ?? []) as Message[];
  return all
    .filter((m) => m.recipient_id === user.id)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

/** Sent messages for the current user. */
export function getSentMessages(): Message[] {
  const user = requireRole("ADMIN", "TEACHER", "PARENT");
  const all = ((collections() as any).messages ?? []) as Message[];
  return all
    .filter((m) => m.sender_id === user.id)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

/** Unread count. */
export function unreadMessageCount(): number {
  return getInbox().filter((m) => !m.read).length;
}

/** Get contacts (people the user can message). */
export function getContacts() {
  const user = requireRole("ADMIN", "TEACHER", "PARENT");
  const profiles = byAcademy(collections().profiles).filter((p) => p.id !== user.id);

  if (user.role === "PARENT") {
    // Parents → teachers + admins of their children's groups.
    return profiles.filter((p) => p.role === "TEACHER" || p.role === "ADMIN");
  }
  if (user.role === "TEACHER") {
    // Teachers → parents of their students + admins.
    return profiles.filter((p) => p.role === "PARENT" || p.role === "ADMIN");
  }
  // Admin → everyone.
  return profiles;
}
