"use server";

import { revalidatePath } from "next/cache";
import { MiscService, requireScopedRole } from "@/services";
import { audit } from "@/services/audit";

export async function addNoteAction(studentId: string, content: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  await MiscService.addNote(studentId, user.id, user.full_name, content);
    void audit({ action: "note.create" });
  revalidatePath(`/students/${studentId}`);
}

export async function deleteNoteAction(studentId: string, noteId: string) {
  await requireScopedRole("ADMIN", "TEACHER");
  await MiscService.deleteNote(noteId);
    void audit({ action: "note.delete" });
  revalidatePath(`/students/${studentId}`);
}
