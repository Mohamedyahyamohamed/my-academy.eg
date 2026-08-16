"use server";
import { audit } from "@/services/audit";

import { revalidatePath } from "next/cache";
import { requireScopedRole, HomeworkService } from "@/services";
import type { HomeworkInput } from "@/services/homework";

export async function createHomeworkAction(input: HomeworkInput) {
  const user = await requireScopedRole("TEACHER");
  const h = await HomeworkService.createHomework({
    ...input,
    academy_id: user.academy_id,
    teacher_profile_id: user.id,
    teacher_email: user.email,
  });
  // Push notification + email to parents about new homework.
  if (h) {
    const { collections } = await import("@/services/data/store");
    const { NotificationsService } = await import("@/services");
    const { sendPaymentReminder } = await import("@/lib/email");
    const roster = collections().groupStudents
      .filter((gs) => gs.group_id === input.group_id)
      .map((gs) => gs.student_id);
    for (const sid of roster) {
      const student = collections().students.find((s) => s.id === sid);
      const parent = student?.parent_id ? collections().parents.find((p) => p.id === student.parent_id) : null;
      if (parent?.email) {
        void sendPaymentReminder(parent.email, `${student?.first_name} ${student?.last_name}`, input.title, "homework").catch(() => {});
      }
      // In-app notification to student's parent profile if linked.
      if (parent?.profile_id) {
        NotificationsService.pushNotification(parent.profile_id, "homework_assigned", input.title, `New homework: ${input.title}`, "/student/homework");
      }
    }
  }
  void audit({ action: "mutation" });
  revalidatePath("/homework");
  return h;
}

export async function deleteHomeworkAction(id: string) {
  await requireScopedRole("TEACHER");
  HomeworkService.deleteHomework(id);
  void audit({ action: "mutation" });
  revalidatePath("/homework");
}

export async function reviewSubmissionAction(
  submissionId: string,
  feedback: string,
  grade?: number,
) {
  const user = await requireScopedRole("TEACHER");
  HomeworkService.reviewSubmission(submissionId, feedback, grade);
  // Notify student's parent about reviewed homework.
  const { collections } = await import("@/services/data/store");
  const { NotificationsService } = await import("@/services");
  const sub = collections().submissions.find((s) => s.id === submissionId);
  if (sub) {
    const student = collections().students.find((s) => s.id === sub.student_id);
    if (student?.parent_id) {
      const parent = collections().parents.find((p) => p.id === student.parent_id);
      if (parent?.profile_id) {
        NotificationsService.pushNotification(parent.profile_id, "homework_reviewed", "Homework reviewed", `Feedback: ${feedback.slice(0, 50)}`, "/student/homework");
      }
    }
  }
  void audit({ action: "mutation" });
  revalidatePath("/homework");
}

export async function submitHomeworkAction(
  homeworkId: string,
  studentId: string,
  content: string,
  fileUrl?: string,
) {
  await requireScopedRole("STUDENT");
  HomeworkService.submitHomework(homeworkId, studentId, content, fileUrl);
  void audit({ action: "mutation" });
  revalidatePath("/student/homework");
}
