"use server";

import { revalidatePath } from "next/cache";
import { requireRole, StudentsService } from "@/services";
import type { StudentInput } from "@/services/students";

export async function createStudentAction(input: StudentInput) {
  console.log("[createStudentAction] START", { first: input.first_name, last: input.last_name, parent_id: input.parent_id });
  try {
    const user = requireRole("ADMIN", "TEACHER");
    console.log("[createStudentAction] user OK:", user.email, "academy:", user.academy_id);
    const student = await StudentsService.createStudent(input);
    console.log("[createStudentAction] CREATED OK:", student.id);
    await import("@/services/audit").then((m) => m.audit(
      { action: "student.create", entity_type: "student", entity_id: student.id, new_data: { name: `${student.first_name} ${student.last_name}` } },
      user,
    ));
    revalidatePath("/students");
    revalidatePath("/dashboard");
    return student;
  } catch (e) {
    console.error("[createStudentAction] FAILED:", (e as Error)?.message);
    throw e;
  }
}

export async function updateStudentAction(id: string, input: Partial<StudentInput>) {
  console.log("[updateStudentAction] START", { id, first: input.first_name });
  try {
    const user = requireRole("ADMIN", "TEACHER");
    const student = StudentsService.updateStudent(id, input);
    console.log("[updateStudentAction] UPDATED:", student?.id ?? "NOT FOUND");
    if (student) {
      await import("@/services/audit").then((m) => m.audit(
        { action: "student.update", entity_type: "student", entity_id: id, new_data: input },
        user,
      ));
    }
    revalidatePath("/students");
    revalidatePath(`/students/${id}`);
    revalidatePath("/dashboard");
    return student;
  } catch (e) {
    console.error("[updateStudentAction] FAILED:", (e as Error)?.message);
    throw e;
  }
}

export async function archiveStudentAction(id: string) {
  const user = requireRole("ADMIN", "TEACHER");
  StudentsService.setStudentStatus(id, "ARCHIVED");
  await import("@/services/audit").then((m) => m.audit(
    { action: "student.archive", entity_type: "student", entity_id: id },
    user,
  ));
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
}

export async function restoreStudentAction(id: string) {
  requireRole("ADMIN", "TEACHER");
  StudentsService.setStudentStatus(id, "ACTIVE");
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
}
