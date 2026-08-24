"use server";

import { requireScopedRole } from "@/services";
import { askAIMentorForStudent, type AskAIMentorInput } from "@/services/ai-mentor";

export async function askAIMentor(input: AskAIMentorInput) {
  const user = await requireScopedRole("STUDENT");
  return askAIMentorForStudent(user, input);
}
