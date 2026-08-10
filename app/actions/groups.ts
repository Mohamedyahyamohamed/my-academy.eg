"use server";

import { revalidatePath } from "next/cache";
import { requireRole, GroupsService } from "@/services";
import type { GroupInput } from "@/services/groups";
import { audit } from "@/services/audit";

export async function createGroupAction(input: GroupInput) {
  requireRole("ADMIN", "TEACHER");
  const g = await GroupsService.createGroup(input);
    void audit({ action: "group.create" });
  revalidatePath("/groups");
  revalidatePath("/dashboard");
  return g;
}

export async function updateGroupAction(id: string, input: Partial<GroupInput>) {
  requireRole("ADMIN");
  const g = GroupsService.updateGroup(id, input);
    void audit({ action: "group.update" });
  revalidatePath("/groups");
  revalidatePath(`/groups/${id}`);
  return g;
}

export async function deleteGroupAction(id: string) {
  requireRole("ADMIN");
  GroupsService.deleteGroup(id);
    void audit({ action: "group.delete" });
  revalidatePath("/groups");
  revalidatePath("/dashboard");
}

export async function addStudentToGroupAction(groupId: string, studentId: string) {
  requireRole("ADMIN", "TEACHER");
  GroupsService.addStudent(groupId, studentId);
    void audit({ action: "group.add_student" });
  revalidatePath(`/groups/${groupId}`);
}

export async function removeStudentFromGroupAction(groupId: string, studentId: string) {
  requireRole("ADMIN", "TEACHER");
  GroupsService.removeStudent(groupId, studentId);
    void audit({ action: "group.remove_student" });
  revalidatePath(`/groups/${groupId}`);
}
