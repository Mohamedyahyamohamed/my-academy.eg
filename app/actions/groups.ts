"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, GroupsService, isLimitedAssistant } from "@/services";
import type { GroupInput } from "@/services/groups";
import { audit } from "@/services/audit";
import { safeAction } from "@/lib/action-result";

export async function createGroupAction(input: GroupInput) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot create groups.");
  const { group: g, lessonCount } = await GroupsService.createGroupWithLessons(
    { ...input, academy_id: user.academy_id },
    user.academy_id,
    user.id,
  );
  void audit({ action: "group.create", metadata: { generated_lessons: lessonCount } });
  revalidatePath("/groups");
  revalidatePath("/lessons");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return g;
}

export async function updateGroupAction(id: string, input: Partial<GroupInput>) {
  await requireScopedRole("ADMIN");
  const g = await GroupsService.updateGroup(id, input);
    void audit({ action: "group.update" });
  revalidatePath("/groups");
  revalidatePath(`/groups/${id}`);
  return g;
}

export async function deleteGroupAction(id: string) {
  return safeAction(async () => {
    const user = await requireScopedRole("ADMIN", "TEACHER");
    if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot delete groups.");
    const result = await GroupsService.deleteGroup(id, user.academy_id, user);
    void audit({
      action: "group.delete",
      entity_type: "group",
      entity_id: id,
      metadata: { mode: result.mode, relation_count: result.relationCount },
    }, user);
    revalidatePath("/groups");
    revalidatePath(`/groups/${id}`);
    revalidatePath("/lessons");
    revalidatePath("/dashboard");
    return result;
  }, "تعذر حذف المجموعة. حاول مرة أخرى.", "GROUP_DELETE_FAILED");
}

export async function addStudentToGroupAction(groupId: string, studentId: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage group membership.");
  const res = await GroupsService.addStudent(groupId, studentId);
  void audit({ action: "group.add_student" });
  revalidatePath(`/groups/${groupId}`);
  return res;
}

export async function transferStudentGroupAction(studentId: string, fromGroupId: string, toGroupId: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) {
    return { ok: false as const, code: "ASSISTANT_NOT_ALLOWED", field: "transfer", message: "الحساب المساعد لا يملك صلاحية نقل الطلاب بين المجموعات." };
  }
  const result = await GroupsService.transferStudentGroup(studentId, fromGroupId, toGroupId);
  if (result.ok) {
    void audit({
      action: "group.transfer_student",
      entity_type: "student",
      entity_id: studentId,
      metadata: { from_group_id: fromGroupId, to_group_id: toGroupId },
    }, user);
    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/groups/${fromGroupId}`);
    revalidatePath(`/groups/${toGroupId}`);
    revalidatePath("/students");
    revalidatePath("/groups");
  }
  return result;
}

export async function removeStudentFromGroupAction(groupId: string, studentId: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage group membership.");
  await GroupsService.removeStudent(groupId, studentId);
    void audit({ action: "group.remove_student" });
  revalidatePath(`/groups/${groupId}`);
}
