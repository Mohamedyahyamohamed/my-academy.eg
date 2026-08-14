import { NextResponse } from "next/server";
import { loadCurrentUser } from "@/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { collections } from "@/services/data/store";

/**
 * Downloads a portable academy-scoped JSON archive for an administrator.
 *
 * The archive intentionally excludes authentication secrets, signed-session
 * values, webhook payloads, and internal audit traces. It is a sensitive file
 * and should only be stored in the academy's approved location.
 */
export async function GET() {
  const user = await loadCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  }

  const academyId = user.academy_id;
  const data: Record<string, unknown> = {
    _format: "my-academy-portable-export-v1",
    _exportedAt: new Date().toISOString(),
    _academyId: academyId,
    _notice: "حسّاس: لا يحتوي الملف على كلمات المرور أو رموز الجلسات أو بيانات بطاقات الدفع أو سجلات الأمان الداخلية.",
  };

  try {
    if (!isSupabaseConfigured()) {
      const local = collections();
      const forAcademy = <T extends { academy_id: string }>(rows: T[]) =>
        rows.filter((row) => row.academy_id === academyId);

      const academies = local.academies.filter((academy) => academy.id === academyId);
      const profiles = forAcademy(local.profiles);
      const courses = forAcademy(local.courses);
      const teachers = forAcademy(local.teachers);
      const parents = forAcademy(local.parents);
      const students = forAcademy(local.students);
      const groups = forAcademy(local.groups);
      const lessons = forAcademy(local.lessons);
      const payments = forAcademy(local.payments);
      const exams = forAcademy(local.exams);
      const homework = forAcademy(local.homework);
      const notifications = forAcademy(local.notifications);
      const notes = forAcademy(local.notes);
      const files = forAcademy(local.files);

      const studentIds = new Set(students.map((row) => row.id));
      const groupIds = new Set(groups.map((row) => row.id));
      const lessonIds = new Set(lessons.map((row) => row.id));
      const paymentIds = new Set(payments.map((row) => row.id));
      const examIds = new Set(exams.map((row) => row.id));
      const homeworkIds = new Set(homework.map((row) => row.id));

      Object.assign(data, {
        academies,
        profiles,
        courses,
        teachers,
        parents,
        students,
        groups,
        group_students: local.groupStudents.filter((row) => groupIds.has(row.group_id) && studentIds.has(row.student_id)),
        lessons,
        attendance: local.attendance.filter((row) => lessonIds.has(row.lesson_id) && studentIds.has(row.student_id)),
        payments,
        payment_transactions: local.transactions.filter((row) => paymentIds.has(row.payment_id)),
        exams,
        grades: local.grades.filter((row) => examIds.has(row.exam_id) && studentIds.has(row.student_id)),
        homework,
        homework_submissions: local.submissions.filter((row) => homeworkIds.has(row.homework_id) && studentIds.has(row.student_id)),
        notifications,
        notes,
        files_metadata: files,
      });
    } else {
      const client = await createServerSupabaseClient();
      const academyRows = async (table: string) => {
        const { data: rows, error } = await client.from(table).select("*").eq("academy_id", academyId);
        if (error) throw new Error(`Unable to export ${table}`);
        return rows ?? [];
      };
      const relatedRows = async (table: string, column: string, ids: string[]) => {
        if (!ids.length) return [];
        const { data: rows, error } = await client.from(table).select("*").in(column, ids);
        if (error) throw new Error(`Unable to export ${table}`);
        return rows ?? [];
      };

      const [academy, profiles, courses, teachers, parents, students, groups, lessons, payments, exams, homework, notifications, notes, files] = await Promise.all([
        client.from("academies").select("*").eq("id", academyId).maybeSingle().then(({ data: row, error }) => {
          if (error) throw new Error("Unable to export academy");
          return row ? [row] : [];
        }),
        academyRows("profiles"),
        academyRows("courses"),
        academyRows("teachers"),
        academyRows("parents"),
        academyRows("students"),
        academyRows("groups"),
        academyRows("lessons"),
        academyRows("payments"),
        academyRows("exams"),
        academyRows("homework"),
        academyRows("notifications"),
        academyRows("notes"),
        academyRows("files"),
      ]);

      const studentIds = students.map((row: { id: string }) => row.id);
      const groupIds = groups.map((row: { id: string }) => row.id);
      const lessonIds = lessons.map((row: { id: string }) => row.id);
      const paymentIds = payments.map((row: { id: string }) => row.id);
      const examIds = exams.map((row: { id: string }) => row.id);
      const homeworkIds = homework.map((row: { id: string }) => row.id);
      const [groupStudents, attendance, transactions, grades, submissions] = await Promise.all([
        relatedRows("group_students", "group_id", groupIds),
        relatedRows("attendance", "lesson_id", lessonIds),
        relatedRows("payment_transactions", "payment_id", paymentIds),
        relatedRows("grades", "exam_id", examIds),
        relatedRows("homework_submissions", "homework_id", homeworkIds),
      ]);

      Object.assign(data, {
        academies: academy,
        profiles,
        courses,
        teachers,
        parents,
        students,
        groups,
        group_students: groupStudents,
        lessons,
        attendance: attendance.filter((row: { student_id: string }) => studentIds.includes(row.student_id)),
        payments,
        payment_transactions: transactions,
        exams,
        grades: grades.filter((row: { student_id: string }) => studentIds.includes(row.student_id)),
        homework,
        homework_submissions: submissions.filter((row: { student_id: string }) => studentIds.includes(row.student_id)),
        notifications,
        notes,
        files_metadata: files,
      });
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="my-academy-${academyId}-export-${Date.now()}.json"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    console.error("academy export failed", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
