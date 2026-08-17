"use server";

import { revalidatePath } from "next/cache";
import { MiscService, requireScopedRole, isLimitedAssistant } from "@/services";
import { audit } from "@/services/audit";

export async function addNoteAction(studentId: string, content: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage student notes.");
  await MiscService.addNote(studentId, user.id, user.full_name, content);
    void audit({ action: "note.create" });
  revalidatePath(`/students/${studentId}`);
}

export async function deleteNoteAction(studentId: string, noteId: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage student notes.");
  await MiscService.deleteNote(noteId);
    void audit({ action: "note.delete" });
  revalidatePath(`/students/${studentId}`);
}
