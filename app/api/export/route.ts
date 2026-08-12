import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { collections } from "@/services/data/store";

/** Export all academy data as JSON (data portability — right to export). */
export async function GET() {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  }

  try {
    const tables = [
      "students", "parents", "teachers", "courses", "groups", "group_students",
      "lessons", "attendance", "payments", "payment_transactions", "exams",
      "grades", "homework", "homework_submissions", "notifications", "notes",
    ];
    const data: Record<string, any> = {
      _exportedAt: new Date().toISOString(),
      _academyId: user.academy_id,
    };

    if (!isSupabaseConfigured()) {
      const local = collections();
      Object.assign(data, {
        students: local.students,
        parents: local.parents,
        teachers: local.teachers,
        courses: local.courses,
        groups: local.groups,
        group_students: local.groupStudents,
        lessons: local.lessons,
        attendance: local.attendance,
        payments: local.payments,
        payment_transactions: local.transactions,
        exams: local.exams,
        grades: local.grades,
        homework: local.homework,
        homework_submissions: local.submissions,
        notifications: local.notifications,
        notes: local.notes,
      });
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="my-academy-export-${Date.now()}.json"`,
        },
      });
    }

    const client = createServerSupabaseClient();
    for (const table of tables) {
      try {
        const { data: rows } = await client.from(table).select("*");
        data[table] = rows ?? [];
      } catch {
        data[table] = [];
      }
    }

    const json = JSON.stringify(data, null, 2);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="my-academy-export-${Date.now()}.json"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
