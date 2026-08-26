import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import type { PortalSession } from "@/lib/portal-session";

export interface PortalDashboardData {
  student: {
    id: string;
    academy_id: string;
    first_name: string;
    last_name: string;
    grade: string | null;
    parent_id: string | null;
  };
  academyName: string;
  parentName: string | null;
  groups: Array<{ id: string; name: string; course_id: string | null }>;
  lessons: any[];
  attendance: any[];
  exams: any[];
  grades: any[];
  homework: any[];
  submissions: any[];
  payments: any[];
  contentFiles: any[];
}

export async function getPortalDashboard(session: PortalSession): Promise<PortalDashboardData | null> {
  const client = nodeSupabaseClient();
  if (!client) return null;

  const { data: student, error: studentError } = await client
    .from("students")
    .select("id,academy_id,first_name,last_name,grade,parent_id,status,is_active")
    .eq("id", session.student_id)
    .eq("academy_id", session.academy_id)
    .eq("is_active", true)
    .neq("status", "ARCHIVED")
    .maybeSingle();
  if (studentError || !student) return null;

  const [{ data: academy }, { data: parent }] = await Promise.all([
    client.from("academies").select("name").eq("id", session.academy_id).maybeSingle(),
    student.parent_id ? client.from("parents").select("first_name,last_name").eq("id", student.parent_id).eq("academy_id", session.academy_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { data: memberships, error: membershipError } = await client
    .from("group_students")
    .select("group_id")
    .eq("student_id", session.student_id)
    .limit(1000);
  if (membershipError) return null;
  const groupIds = [...new Set((memberships ?? []).map((row: any) => row.group_id).filter(Boolean))];
  if (!groupIds.length) {
    return {
      student,
      academyName: academy?.name ?? "MYAcademy",
      parentName: parent ? `${parent.first_name} ${parent.last_name}` : null,
      groups: [], lessons: [], attendance: [], exams: [], grades: [], homework: [], submissions: [], payments: [], contentFiles: [],
    };
  }

  const [{ data: groups }, { data: lessons }, { data: exams }, { data: homework }, { data: courses }, { data: payments }] = await Promise.all([
    client.from("groups").select("id,name,course_id").eq("academy_id", session.academy_id).in("id", groupIds).limit(1000),
    client.from("lessons").select("*").eq("academy_id", session.academy_id).in("group_id", groupIds).order("date", { ascending: false }).limit(2000),
    client.from("exams").select("*").eq("academy_id", session.academy_id).in("group_id", groupIds).order("date", { ascending: false }).limit(1000),
    client.from("homework").select("*").eq("academy_id", session.academy_id).in("group_id", groupIds).order("deadline", { ascending: true }).limit(1000),
    client.from("content_courses").select("id,title").eq("academy_id", session.academy_id).in("group_id", groupIds).eq("is_published", true).limit(1000),
    client.from("payments").select("id,amount_due,amount_paid,status,due_date,created_at").eq("academy_id", session.academy_id).eq("student_id", session.student_id).order("created_at", { ascending: false }).limit(1000),
  ]);
  const safeGroups = groups ?? [];
  const lessonIds = (lessons ?? []).map((item: any) => item.id).filter(Boolean);
  const examIds = (exams ?? []).map((item: any) => item.id).filter(Boolean);
  const homeworkIds = (homework ?? []).map((item: any) => item.id).filter(Boolean);
  const courseIds = (courses ?? []).map((item: any) => item.id).filter(Boolean);

  const [{ data: attendance }, { data: grades }, { data: submissions }, { data: files }] = await Promise.all([
    lessonIds.length ? client.from("attendance").select("lesson_id,status,recorded_at").eq("student_id", session.student_id).in("lesson_id", lessonIds).limit(2000) : Promise.resolve({ data: [] }),
    examIds.length ? client.from("grades").select("exam_id,score,notes").eq("student_id", session.student_id).in("exam_id", examIds).limit(1000) : Promise.resolve({ data: [] }),
    homeworkIds.length ? client.from("homework_submissions").select("id,homework_id,status,submitted_at,feedback,grade,file_id").eq("student_id", session.student_id).in("homework_id", homeworkIds).limit(1000) : Promise.resolve({ data: [] }),
    courseIds.length ? client.from("content_files").select("id,course_id,name,size,mime_type,created_at").eq("academy_id", session.academy_id).in("course_id", courseIds).limit(2000) : Promise.resolve({ data: [] }),
  ]);

  const groupMap = new Map(safeGroups.map((group: any) => [group.id, group.name]));
  const courseMap = new Map((courses ?? []).map((course: any) => [course.id, course.title]));
  const submissionMap = new Map((submissions ?? []).map((item: any) => [item.homework_id, item]));
  const homeworkView = (homework ?? []).map((item: any) => ({
    ...item,
    group_name: groupMap.get(item.group_id) ?? "مجموعة دراسية",
    submission: submissionMap.get(item.id) ?? null,
  }));
  const contentView = (files ?? []).map((file: any) => ({ ...file, course_title: courseMap.get(file.course_id) ?? "مادة دراسية" }));

  return {
    student,
    academyName: academy?.name ?? "MYAcademy",
    parentName: parent ? `${parent.first_name} ${parent.last_name}` : null,
    groups: safeGroups,
    lessons: lessons ?? [],
    attendance: attendance ?? [],
    exams: exams ?? [],
    grades: grades ?? [],
    homework: homeworkView,
    submissions: submissions ?? [],
    payments: payments ?? [],
    contentFiles: contentView,
  };
}
