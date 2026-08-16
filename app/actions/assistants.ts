"use server";
import { audit } from "@/services/audit";

import { revalidatePath } from "next/cache";
import { collections, persistInsert, persistDelete } from "@/services/data/store";
import { requireScopedRole, currentAcademyId } from "@/services";
import { resolveTeacherForGroups } from "@/services/groups";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

/** Assign an existing assistant (co-teacher) to a group. Owner teacher or admin only. */
export async function assignAssistantAction(groupId: string, teacherId: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (user.role === "TEACHER") {
    const teacher = await resolveTeacherForGroups(user.academy_id, user.id, user.email);
    const owns = teacher && collections().groups.find(
      (g) => g.id === groupId && g.academy_id === user.academy_id && g.teacher_id === teacher.id,
    );
    if (!owns) return { ok: false, error: "You can only manage your own groups." };
  }
  const exists = collections().groupAssistants.some(
    (ga) => ga.group_id === groupId && ga.teacher_id === teacherId,
  );
  if (exists) return { ok: false, error: "Already an assistant." };
  const row = { group_id: groupId, teacher_id: teacherId, assigned_at: new Date().toISOString() };
  collections().groupAssistants.push(row);
  void persistInsert("group_assistants", row);
  void audit({ action: "mutation" });
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export async function removeAssistantAction(groupId: string, teacherId: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (user.role === "TEACHER") {
    const teacher = await resolveTeacherForGroups(user.academy_id, user.id, user.email);
    const owns = teacher && collections().groups.find(
      (g) => g.id === groupId && g.academy_id === user.academy_id && g.teacher_id === teacher.id,
    );
    if (!owns) return { ok: false, error: "You can only manage your own groups." };
  }
  collections().groupAssistants = collections().groupAssistants.filter(
    (ga) => !(ga.group_id === groupId && ga.teacher_id === teacherId),
  );
  void persistDelete("group_assistants", { group_id: groupId, teacher_id: teacherId });
  void audit({ action: "mutation" });
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/**
 * A teacher (or admin) creates a brand-new assistant account with login,
 * and grants it access to the chosen groups (defaults to the teacher's own groups).
 * The assistant logs in as a TEACHER and sees exactly those groups.
 */
export async function createAssistantAction(input: {
  full_name: string;
  email: string;
  password: string;
  groupIds: string[];
}) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (!input.email || !input.password || !input.full_name)
    return { ok: false, error: "Name, email and password are required." };
  if (input.password.length < 6)
    return { ok: false, error: "Password must be at least 6 characters." };
  if (!input.groupIds.length)
    return { ok: false, error: "Select at least one group to share." };

  const academyId = user.academy_id ?? currentAcademyId();
  const selectedGroups = collections().groups.filter(
    (group) => input.groupIds.includes(group.id) && group.academy_id === academyId,
  );
  if (selectedGroups.length !== input.groupIds.length) {
    return { ok: false, error: "Some selected groups are outside your academy." };
  }

  // Teachers may only share groups they own or already assist with.
  if (user.role === "TEACHER") {
    const teacher = await resolveTeacherForGroups(academyId, user.id, user.email);
    if (!teacher) {
      return { ok: false, error: "حساب المدرّس مش متوصّل ببروفايل مدرّس. كلّم الأدمن يربطه." };
    }
    const allowed = new Set([
      ...selectedGroups.filter((group) => group.teacher_id === teacher.id).map((group) => group.id),
      ...collections().groupAssistants
        .filter((assistant) => assistant.teacher_id === teacher.id)
        .map((assistant) => assistant.group_id),
    ]);
    for (const gid of input.groupIds) {
      if (!allowed.has(gid)) return { ok: false, error: "ممكن تشارك الجروبات اللى معاك صلاحية عليها بس." };
    }
  }

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase not configured." };

  // 1. Auth user (TEACHER role).
  const { data, error } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, role: "TEACHER", academy_id: academyId },
  });
  if (error) return { ok: false, error: error.message };
  const uid = data.user.id;

  // 2. Profile + teacher record.
  const { error: profileError } = await client.from("profiles").upsert({
    id: uid, academy_id: academyId, email: input.email, role: "TEACHER",
    full_name: input.full_name, is_active: true,
  });
  if (profileError) {
    await client.auth.admin.deleteUser(uid);
    return { ok: false, error: `Could not create assistant profile: ${profileError.message}` };
  }
  const { error: membershipError } = await client.from("academy_memberships").upsert({
    academy_id: academyId, profile_id: uid, role: "TEACHER", status: "ACTIVE",
    joined_at: new Date().toISOString(),
  }, { onConflict: "academy_id,profile_id" });
  if (membershipError) {
    await client.auth.admin.deleteUser(uid);
    return { ok: false, error: `Could not grant assistant access: ${membershipError.message}` };
  }
  const [first, ...rest] = input.full_name.split(" ");
  const teacherRec = {
    id: crypto.randomUUID(), academy_id: academyId, profile_id: uid,
    first_name: first, last_name: rest.join(" ") || "-", email: input.email,
    phone: null, bio: "Assistant", is_active: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  collections().teachers.push(teacherRec as any);
  await persistInsert("teachers", teacherRec);

  // 3. Grant access to the chosen groups.
  const now = new Date().toISOString();
  for (const gid of input.groupIds) {
    const row = { group_id: gid, teacher_id: teacherRec.id, assigned_at: now };
    collections().groupAssistants.push(row);
    void persistInsert("group_assistants", row);
  }

  void audit({ action: "mutation" });
  revalidatePath("/teacher/assistants");
  return { ok: true };
}
