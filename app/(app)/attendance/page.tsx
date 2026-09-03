import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ScanLine } from "lucide-react";
import { AttendanceWorkshop } from "@/components/attendance/attendance-workshop";
import { GroupsService, LessonsService, StudentsService, PaymentsService, requireAttendanceTeacher } from "@/services";
import { collections, persistInsert } from "@/services/data/store";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";
import { buildRecurringLessonRows } from "@/lib/lesson-generation";
import type { Lesson } from "@/types";

export const dynamic = "force-dynamic";

function lessonKey(lesson: Pick<Lesson, "group_id" | "date" | "start_time" | "end_time">) {
  return [lesson.group_id, String(lesson.date).slice(0, 10), lesson.start_time, lesson.end_time].join("|");
}

/**
 * Materialize the weekly group schedule into real lesson rows.
 * The window includes recent lessons for attendance history and upcoming lessons
 * for planning. Existing lessons are never duplicated.
 */
async function ensureScheduledLessons(groups: Awaited<ReturnType<typeof GroupsService.listGroups>>, academyId: string, existing: Lesson[]) {
  const existingKeys = new Set(existing.map(lessonKey));
  const seedDate = new Date();
  seedDate.setDate(seedDate.getDate() - 14);
  const generated = groups.flatMap((group) => buildRecurringLessonRows(group, academyId, 5, seedDate));
  const missing = generated.filter((lesson) => {
    const key = lessonKey(lesson);
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });

  if (!missing.length) return existing;

  const inserted: Lesson[] = [];
  for (const lesson of missing) {
    try {
      await persistInsert("lessons", lesson, academyId);
      inserted.push(lesson);
    } catch {
      // Do not show a generated lesson as selectable unless it was persisted.
    }
  }
  return [...existing, ...inserted];
}

export default async function AttendancePage() {
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const user = await requireAttendanceTeacher();
  const teacherProfileId = user.id;
  const groups = await GroupsService.listGroups("", user.academy_id, teacherProfileId, user.email);
  const loadedLessons = (await LessonsService.listLessons({ pageSize: 500 }, user.academy_id, teacherProfileId)).items;
  const lessons = await ensureScheduledLessons(groups, user.academy_id, loadedLessons);
  const students = (await StudentsService.listStudents({ pageSize: 500 }, user.academy_id)).items;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentPayments = (await PaymentsService.listPayments({ month: currentMonth, pageSize: 500 }, user.academy_id).catch((error) => {
    console.error("Attendance payment status unavailable:", error);
    return { items: [], pagination: { page: 1, pageSize: 500, total: 0, totalPages: 1 } } as Awaited<ReturnType<typeof PaymentsService.listPayments>>;
  })).items;
  const paidThisMonth: Record<string, boolean> = {};
  currentPayments.forEach((payment) => {
    paidThisMonth[payment.student_id] = (paidThisMonth[payment.student_id] ?? false) || payment.remaining <= 0;
  });
  const allowedGroupIds = new Set(groups.map((group) => group.id));
  const scopedMemberships = allowedGroupIds.size
    ? isSupabaseConfigured()
      ? (await (await (await import("@/lib/supabase/server")).createServerSupabaseClient())
        .from("group_students")
        .select("group_id, student_id")
        .in("group_id", Array.from(allowedGroupIds))
        .limit(5000)).data
      : collections().groupStudents.filter((gs) => allowedGroupIds.has(gs.group_id))
    : [];
  const enrollments = (scopedMemberships?.length ? scopedMemberships : collections().groupStudents
    .filter((gs) => allowedGroupIds.has(gs.group_id))
    .map((gs) => ({ group_id: gs.group_id, student_id: gs.student_id })))
    .map((gs: any) => ({
      groupId: gs.group_id,
      studentId: gs.student_id,
    }));

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-l from-emerald-950 via-teal-950 to-slate-950 p-6 shadow-[0_16px_50px_-20px_rgb(16_185_129/0.45)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgb(16_185_129/0.18),transparent_42%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10">
              <CalendarCheck className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">{en ? "Attendance" : "الحضور"}</h1>
              <p className="mt-0.5 text-sm text-slate-400">{en ? "Choose a group and lesson, then record each student's attendance in seconds." : "اختر المجموعة والحصة، ثم سجّل حضور كل طالب خلال ثوانٍ."}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/attendance/scan"><ScanLine className="h-4 w-4" /> {en ? "Scan student QR codes" : "امسح أكواد الطلاب (QR)"}</Link>
            </Button>
          </div>
        </div>
      </div>
      <AttendanceWorkshop
        groups={groups}
        lessons={lessons}
        students={students}
        enrollments={enrollments}
      />
    </div>
  );
}
