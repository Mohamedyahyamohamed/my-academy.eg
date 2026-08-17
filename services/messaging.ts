/**
 * Parent ↔ Teacher messaging.
 * Scoped: sender and recipient must be in the same academy.
 */
import { collections } from "./data/store";
import { requireRole } from "./session";
import { byAcademy, teacherStudentScope } from "./_shared";
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

function parentStudentIds(parentProfileId: string, academyId: string): Set<string> {
  const parentIds = new Set(
    collections().parents
      .filter((p) => p.academy_id === academyId && (p.profile_id === parentProfileId || p.email.toLowerCase() === collections().profiles.find((profile) => profile.id === parentProfileId)?.email?.toLowerCase()))
      .map((p) => p.id),
  );
  return new Set(
    collections().students
      .filter((s) => s.academy_id === academyId && !!s.parent_id && parentIds.has(s.parent_id))
      .map((s) => s.id),
  );
}

function teacherProfileTeachesStudent(teacherProfileId: string, studentIds: Set<string>, academyId: string): boolean {
  const teacher = collections().teachers.find(
    (t) => t.academy_id === academyId && t.profile_id === teacherProfileId,
  );
  if (!teacher || studentIds.size === 0) return false;
  const groupIds = new Set(
    collections().groups
      .filter((g) => g.academy_id === academyId && g.teacher_id === teacher.id)
      .map((g) => g.id),
  );
  for (const assistant of collections().groupAssistants) {
    if (assistant.teacher_id === teacher.id && collections().groups.some((g) => g.id === assistant.group_id && g.academy_id === academyId)) {
      groupIds.add(assistant.group_id);
    }
  }
  return collections().groupStudents.some((gs) => groupIds.has(gs.group_id) && studentIds.has(gs.student_id));
}

function teacherSharesStudentWithParent(teacherProfileId: string, parentProfileId: string, academyId: string): boolean {
  return teacherProfileTeachesStudent(teacherProfileId, parentStudentIds(parentProfileId, academyId), academyId);
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

  const senderStudentIds = user.role === "TEACHER"
    ? (teacherStudentScope() ?? new Set<string>())
    : user.role === "PARENT"
      ? parentStudentIds(user.id, user.academy_id)
      : new Set<string>();

  // Parents can contact only teachers of their children, or an academy admin.
  if (user.role === "PARENT") {
    if (recipient.role === "TEACHER" && !teacherSharesStudentWithParent(recipient.id, user.id, user.academy_id)) return null;
    if (recipient.role !== "TEACHER" && recipient.role !== "ADMIN") return null;
  }
  // Teachers can contact only parents of their assigned students, or an academy admin.
  if (user.role === "TEACHER") {
    if (recipient.role === "PARENT") {
      const recipientStudentIds = parentStudentIds(recipient.id, user.academy_id);
      if (![...recipientStudentIds].some((id) => senderStudentIds.has(id))) return null;
    } else if (recipient.role !== "ADMIN") {
      return null;
    }
  }
  // If a student context is supplied, it must belong to the sender's permitted scope.
  if (studentId && !senderStudentIds.has(studentId)) return null;

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
  await persistInsert("messages", record);
  return msg;
}

/** Inbox for the current user. */
export function getInbox(userOverride?: ReturnType<typeof requireRole>): Message[] {
  const user = userOverride ?? requireRole("ADMIN", "TEACHER", "PARENT");
  const all = ((collections() as any).messages ?? []) as Message[];
  return all
    .filter((m) => m.recipient_id === user.id)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

/** Sent messages for the current user. */
export function getSentMessages(userOverride?: ReturnType<typeof requireRole>): Message[] {
  const user = userOverride ?? requireRole("ADMIN", "TEACHER", "PARENT");
  const all = ((collections() as any).messages ?? []) as Message[];
  return all
    .filter((m) => m.sender_id === user.id)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

/** Unread count. */
export function unreadMessageCount(userOverride?: ReturnType<typeof requireRole>): number {
  return getInbox(userOverride).filter((m) => !m.read).length;
}

/** Get contacts (people the user can message). */
export function getContacts(userOverride?: ReturnType<typeof requireRole>) {
  const user = userOverride ?? requireRole("ADMIN", "TEACHER", "PARENT");
  const profiles = byAcademy(collections().profiles, user.academy_id).filter((p) => p.id !== user.id);

  if (user.role === "PARENT") {
    const children = parentStudentIds(user.id, user.academy_id);
    return profiles.filter((p) =>
      p.role === "ADMIN" || (p.role === "TEACHER" && teacherProfileTeachesStudent(p.id, children, user.academy_id)),
    );
  }
  if (user.role === "TEACHER") {
    const students = teacherStudentScope() ?? new Set<string>();
    return profiles.filter((p) =>
      p.role === "ADMIN" || (p.role === "PARENT" && [...parentStudentIds(p.id, user.academy_id)].some((id) => students.has(id))),
    );
  }
  // Admin → everyone in the current academy.
  return profiles;
}
