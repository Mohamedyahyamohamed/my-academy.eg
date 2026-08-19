/**
 * Parent ↔ Teacher messaging.
 * Scoped: sender and recipient must be in the same academy.
 */
import { collections } from "./data/store";
import { requireRole } from "./session";
import { byAcademy, teacherStudentScope } from "./_shared";
import { persistInsert } from "./data/store";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

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

type User = ReturnType<typeof requireRole>;
type Contact = { id: string; full_name: string; role: string; academy_id?: string };

function sortByNewest(items: Message[]) {
  return items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

function messageWithNames(row: any, profiles: Map<string, Contact>): Message {
  return {
    id: row.id,
    academy_id: row.academy_id,
    sender_id: row.sender_id,
    sender_role: row.sender_role,
    sender_name: profiles.get(row.sender_id)?.full_name ?? row.sender_name ?? "",
    recipient_id: row.recipient_id,
    recipient_name: profiles.get(row.recipient_id)?.full_name ?? row.recipient_name ?? "",
    student_id: row.student_id ?? null,
    body: row.body,
    read: Boolean(row.read),
    created_at: row.created_at,
  };
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

function teacherIdForProfile(profileId: string, academyId: string): string | null {
  return collections().teachers.find((t) => t.academy_id === academyId && t.profile_id === profileId)?.id ?? null;
}

/** True when two teacher profiles are connected through a group-assistant assignment. */
function teachersAreLinked(profileA: string, profileB: string, academyId: string): boolean {
  const a = teacherIdForProfile(profileA, academyId);
  const b = teacherIdForProfile(profileB, academyId);
  if (!a || !b || a === b) return false;
  return collections().groupAssistants.some((assignment) => {
    if (assignment.teacher_id !== a && assignment.teacher_id !== b) return false;
    const group = collections().groups.find((g) => g.id === assignment.group_id && g.academy_id === academyId);
    if (!group) return false;
    return (assignment.teacher_id === a && group.teacher_id === b) || (assignment.teacher_id === b && group.teacher_id === a);
  });
}

async function liveContacts(user: User): Promise<Contact[] | null> {
  const admin = nodeSupabaseClient();
  if (!admin) return null;

  const profilesRes = await admin
    .from("profiles")
    .select("id, full_name, role, academy_id")
    .eq("academy_id", user.academy_id)
    .neq("id", user.id);
  if (profilesRes.error) return null;

  const profiles = (profilesRes.data ?? []) as Contact[];
  if (user.role === "ADMIN") return profiles;

  const [teachersRes, parentsRes, studentsRes, groupsRes] = await Promise.all([
    admin.from("teachers").select("id, profile_id, academy_id").eq("academy_id", user.academy_id),
    admin.from("parents").select("id, profile_id, academy_id").eq("academy_id", user.academy_id),
    admin.from("students").select("id, parent_id, academy_id").eq("academy_id", user.academy_id),
    admin.from("groups").select("id, teacher_id, academy_id").eq("academy_id", user.academy_id),
  ]);
  if (teachersRes.error || parentsRes.error || studentsRes.error || groupsRes.error) return null;

  const teachers = (teachersRes.data ?? []) as any[];
  const parents = (parentsRes.data ?? []) as any[];
  const students = (studentsRes.data ?? []) as any[];
  const groups = (groupsRes.data ?? []) as any[];
  const groupIds = groups.map((g) => g.id);
  const [groupStudentsRes, groupAssistantsRes] = await Promise.all([
    groupIds.length ? admin.from("group_students").select("group_id, student_id").in("group_id", groupIds) : Promise.resolve({ data: [], error: null } as any),
    groupIds.length ? admin.from("group_assistants").select("group_id, teacher_id").in("group_id", groupIds) : Promise.resolve({ data: [], error: null } as any),
  ]);
  if (groupStudentsRes.error || groupAssistantsRes.error) return null;

  const groupStudents = (groupStudentsRes.data ?? []) as any[];
  const groupAssistants = (groupAssistantsRes.data ?? []) as any[];
  const teacherByProfile = new Map(teachers.filter((t) => t.profile_id).map((t) => [t.profile_id, t]));
  const parentByProfile = new Map(parents.filter((p) => p.profile_id).map((p) => [p.profile_id, p]));
  const groupsByTeacher = new Map<string, any[]>();
  for (const group of groups) {
    const list = groupsByTeacher.get(group.teacher_id) ?? [];
    list.push(group);
    groupsByTeacher.set(group.teacher_id, list);
  }
  const groupIdsForTeacher = (teacherId: string) => new Set([
    ...(groupsByTeacher.get(teacherId) ?? []).map((g) => g.id),
    ...groupAssistants.filter((ga) => ga.teacher_id === teacherId).map((ga) => ga.group_id),
  ]);
  const studentIdsForGroups = (ids: Set<string>) => new Set(
    groupStudents.filter((gs) => ids.has(gs.group_id)).map((gs) => gs.student_id),
  );

  if (user.role === "PARENT") {
    const parent = parentByProfile.get(user.id);
    const children = new Set(students.filter((s) => s.parent_id === parent?.id).map((s) => s.id));
    const teacherIds = new Set<string>();
    for (const gs of groupStudents) {
      if (!children.has(gs.student_id)) continue;
      const group = groups.find((g) => g.id === gs.group_id);
      if (group) {
        teacherIds.add(group.teacher_id);
        groupAssistants.filter((ga) => ga.group_id === group.id).forEach((ga) => teacherIds.add(ga.teacher_id));
      }
    }
    return profiles.filter((p) => p.role === "ADMIN" || (p.role === "TEACHER" && teacherIds.has(teacherByProfile.get(p.id)?.id)));
  }

  const teacher = teacherByProfile.get(user.id);
  if (!teacher) return profiles.filter((p) => p.role === "ADMIN");
  const scopedGroupIds = groupIdsForTeacher(teacher.id);
  const scopedStudentIds = studentIdsForGroups(scopedGroupIds);
  const linkedTeacherIds = new Set<string>();
  for (const ga of groupAssistants) {
    const group = groups.find((g) => g.id === ga.group_id);
    if (!group) continue;
    if (ga.teacher_id === teacher.id) linkedTeacherIds.add(group.teacher_id);
    if (group.teacher_id === teacher.id) linkedTeacherIds.add(ga.teacher_id);
  }
  const parentIds = new Set(students.filter((s) => scopedStudentIds.has(s.id)).map((s) => s.parent_id).filter(Boolean));
  return profiles.filter((p) =>
    p.role === "ADMIN" ||
    (p.role === "PARENT" && parentIds.has(parentByProfile.get(p.id)?.id)) ||
    (p.role === "TEACHER" && linkedTeacherIds.has(teacherByProfile.get(p.id)?.id)),
  );
}

/** Send a message. */
export async function sendMessage(
  recipientId: string,
  body: string,
  studentId?: string | null,
): Promise<Message | null> {
  const user = requireRole("ADMIN", "TEACHER", "PARENT");
  if (!body.trim()) return null;

  const recipient = (await getContacts(user)).find((p) => p.id === recipientId);
  if (!recipient || recipient.academy_id !== user.academy_id) return null;

  const senderStudentIds = user.role === "TEACHER"
    ? (teacherStudentScope() ?? new Set<string>())
    : user.role === "PARENT"
      ? parentStudentIds(user.id, user.academy_id)
      : new Set<string>();
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
export async function getInbox(userOverride?: User): Promise<Message[]> {
  const user = userOverride ?? requireRole("ADMIN", "TEACHER", "PARENT");
  const admin = nodeSupabaseClient();
  if (admin) {
    const [messagesRes, profilesRes] = await Promise.all([
      admin.from("messages").select("id, academy_id, sender_id, sender_role, recipient_id, student_id, body, read, created_at").eq("academy_id", user.academy_id).eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(100),
      admin.from("profiles").select("id, full_name, role, academy_id").eq("academy_id", user.academy_id),
    ]);
    if (!messagesRes.error && !profilesRes.error) {
      const profiles = new Map<string, Contact>((profilesRes.data ?? []).map((p: any) => [p.id, p as Contact] as [string, Contact]));
      return sortByNewest((messagesRes.data ?? []).map((row: any) => messageWithNames(row, profiles)));
    }
  }
  const all = ((collections() as any).messages ?? []) as Message[];
  return sortByNewest(all.filter((m) => m.academy_id === user.academy_id && m.recipient_id === user.id));
}

/** Sent messages for the current user. */
export async function getSentMessages(userOverride?: User): Promise<Message[]> {
  const user = userOverride ?? requireRole("ADMIN", "TEACHER", "PARENT");
  const admin = nodeSupabaseClient();
  if (admin) {
    const [messagesRes, profilesRes] = await Promise.all([
      admin.from("messages").select("id, academy_id, sender_id, sender_role, recipient_id, student_id, body, read, created_at").eq("academy_id", user.academy_id).eq("sender_id", user.id).order("created_at", { ascending: false }).limit(100),
      admin.from("profiles").select("id, full_name, role, academy_id").eq("academy_id", user.academy_id),
    ]);
    if (!messagesRes.error && !profilesRes.error) {
      const profiles = new Map<string, Contact>((profilesRes.data ?? []).map((p: any) => [p.id, p as Contact] as [string, Contact]));
      return sortByNewest((messagesRes.data ?? []).map((row: any) => messageWithNames(row, profiles)));
    }
  }
  const all = ((collections() as any).messages ?? []) as Message[];
  return sortByNewest(all.filter((m) => m.academy_id === user.academy_id && m.sender_id === user.id));
}

/** Unread count. */
export async function unreadMessageCount(userOverride?: User): Promise<number> {
  return (await getInbox(userOverride)).filter((m) => !m.read).length;
}

/** Get contacts (people the user can message). */
export async function getContacts(userOverride?: User): Promise<Contact[]> {
  const user = userOverride ?? requireRole("ADMIN", "TEACHER", "PARENT");
  const live = await liveContacts(user);
  if (live) return live;
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
      p.role === "ADMIN" ||
      (p.role === "PARENT" && [...parentStudentIds(p.id, user.academy_id)].some((id) => students.has(id))) ||
      (p.role === "TEACHER" && teachersAreLinked(user.id, p.id, user.academy_id)),
    );
  }
  // Admin → everyone in the current academy.
  return profiles;
}
