"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, GroupsService, LessonsService } from "@/services";
import type { GroupInput } from "@/services/groups";
import { audit } from "@/services/audit";

export async function createGroupAction(input: GroupInput) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const g = await GroupsService.createGroup({ ...input, academy_id: user.academy_id });
  if (g) {
    await LessonsService.createRecurringLessonsForGroup(g, user.academy_id);
  }
  void audit({ action: "group.create" });
  revalidatePath("/groups");
  revalidatePath("/lessons");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return g;
}

export async function updateGroupAction(id: string, input: Partial<GroupInput>) {
  await requireScopedRole("ADMIN");
  const g = GroupsService.updateGroup(id, input);
    void audit({ action: "group.update" });
  revalidatePath("/groups");
  revalidatePath(`/groups/${id}`);
  return g;
}

export async function deleteGroupAction(id: string) {
  await requireScopedRole("ADMIN");
  GroupsService.deleteGroup(id);
    void audit({ action: "group.delete" });
  revalidatePath("/groups");
  revalidatePath("/dashboard");
}

export async function addStudentToGroupAction(groupId: string, studentId: string) {
  await requireScopedRole("ADMIN", "TEACHER");
  const res = await GroupsService.addStudent(groupId, studentId);
  void audit({ action: "group.add_student" });
  revalidatePath(`/groups/${groupId}`);
  return res;
}

export async function removeStudentFromGroupAction(groupId: string, studentId: string) {
  await requireScopedRole("ADMIN", "TEACHER");
  GroupsService.removeStudent(groupId, studentId);
    void audit({ action: "group.remove_student" });
  revalidatePath(`/groups/${groupId}`);
}
