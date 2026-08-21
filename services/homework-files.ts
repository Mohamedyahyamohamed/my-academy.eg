import type { SessionUser } from "@/types";
import { hasAcademyWideScope } from "@/lib/permissions";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { resolveTeacherForGroups } from "@/services/groups";

export type AuthorizedHomeworkFile = {
  id: string;
  academy_id: string;
  owner_id: string;
  name: string;
  storage_path: string;
  size: number;
  mime_type: string;
  homework_id: string;
  student_id: string;
  group_id: string;
};

/**
 * New private homework objects use exactly this tenant/homework/student/uuid.ext
 * layout. Keeping the complete relationship in the path prevents a valid file
 * registry ID from being substituted for another student's or homework's file.
 */
export function isHomeworkStoragePath(
  path: string,
  academyId: string,
  homeworkId?: string,
  studentId?: string,
): boolean {
  if (!path || !academyId || path.includes("..")) return false;
  const segments = path.split("/");
  if (segments.length !== 4 || segments[0] !== academyId) return false;
  if (homeworkId && segments[1] !== homeworkId) return false;
  if (studentId && segments[2] !== studentId) return false;
  return /^[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/i.test(segments[3]);
}

/**
 * Resolve a homework attachment only after re-checking every relationship in
 * the authenticated academy. No client-supplied academy, homework, student, or
 * storage path is trusted by the download route.
 */
export async function getAuthorizedHomeworkFile(fileId: string, user: SessionUser): Promise<AuthorizedHomeworkFile | null> {
  if (!fileId || !user.academy_id) return null;
  const client = nodeSupabaseClient();
  if (!client) return null;

  const { data: file, error: fileError } = await client
    .from("files")
    .select("id, academy_id, owner_id, name, url, size, mime_type")
    .eq("id", fileId)
    .eq("academy_id", user.academy_id)
    .maybeSingle();
  if (fileError || !file || typeof file.url !== "string") return null;
  if (!isHomeworkStoragePath(file.url, user.academy_id)) return null;

  const { data: submission, error: submissionError } = await client
    .from("homework_submissions")
    .select("homework_id, student_id")
    .eq("file_id", file.id)
    .limit(1)
    .maybeSingle();
  if (submissionError || !submission) return null;

  const [{ data: homework }, { data: student }] = await Promise.all([
    client.from("homework").select("id, academy_id, group_id").eq("id", submission.homework_id).eq("academy_id", user.academy_id).maybeSingle(),
    client.from("students").select("id, academy_id, parent_id, email").eq("id", submission.student_id).eq("academy_id", user.academy_id).maybeSingle(),
  ]);
  if (!homework || !student || homework.academy_id !== file.academy_id) return null;
  if (!isHomeworkStoragePath(file.url, user.academy_id, homework.id, student.id)) return null;

  let allowed = hasAcademyWideScope(user.role);
  if (!allowed && user.role === "STUDENT") {
    allowed = student.email?.toLowerCase() === user.email.toLowerCase();
  }
  if (!allowed && user.role === "PARENT") {
    const { data: parentByProfile } = await client
      .from("parents")
      .select("id")
      .eq("academy_id", user.academy_id)
      .eq("profile_id", user.id)
      .maybeSingle();
    const parent = parentByProfile ?? (await client
      .from("parents")
      .select("id")
      .eq("academy_id", user.academy_id)
      .ilike("email", user.email)
      .maybeSingle()).data;
    allowed = Boolean(parent?.id && student.parent_id === parent.id);
  }
  if (!allowed && user.role === "TEACHER") {
    const { data: group } = await client
      .from("groups")
      .select("id, teacher_id, academy_id")
      .eq("id", homework.group_id)
      .eq("academy_id", user.academy_id)
      .maybeSingle();
    const teacher = await resolveTeacherForGroups(user.academy_id, user.id, user.email);
    if (group && teacher) {
      allowed = group.teacher_id === teacher.id;
      if (!allowed) {
        const { data: assistantLink } = await client
          .from("group_assistants")
          .select("group_id")
          .eq("group_id", group.id)
          .eq("teacher_id", teacher.id)
          .maybeSingle();
        allowed = Boolean(assistantLink);
      }
    }
  }
  if (!allowed) return null;

  return {
    id: file.id,
    academy_id: file.academy_id,
    owner_id: file.owner_id,
    name: file.name,
    storage_path: file.url,
    size: file.size,
    mime_type: file.mime_type,
    homework_id: homework.id,
    student_id: student.id,
    group_id: homework.group_id,
  };
}
