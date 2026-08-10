"use server";

import { revalidatePath } from "next/cache";
import { MiscService, requireRole } from "@/services";
import { audit } from "@/services/audit";

export async function addNoteAction(studentId: string, content: string) {
  const user = requireRole("ADMIN", "TEACHER");
  await MiscService.addNote(studentId, user.id, user.full_name, content);
    void audit({ action: "note.create" });
  revalidatePath(`/students/${studentId}`);
}

export async function deleteNoteAction(studentId: string, noteId: string) {
  requireRole("ADMIN", "TEACHER");
  MiscService.deleteNote(noteId);
    void audit({ action: "note.delete" });
  revalidatePath(`/students/${studentId}`);
}
