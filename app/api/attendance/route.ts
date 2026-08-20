import { NextRequest, NextResponse } from "next/server";
import { requireAttendanceTeacher, AttendanceService } from "@/services";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

export async function GET(req: NextRequest) {
  const user = await requireAttendanceTeacher();
  const lessonId = req.nextUrl.searchParams.get("lesson");
  if (!lessonId) return NextResponse.json({ statuses: {} }, { headers: { "Cache-Control": "no-store" } });

  // Read the durable rows directly. The in-memory snapshot can be stale or
  // empty when RLS denies a relationship-table read during hydration, while
  // the QR check-in has already persisted the attendance row successfully.
  const admin = nodeSupabaseClient();
  if (admin) {
    const { data: lesson, error: lessonError } = await admin
      .from("lessons")
      .select("id, academy_id")
      .eq("id", lessonId)
      .eq("academy_id", user.academy_id)
      .maybeSingle();
    if (lessonError || !lesson) {
      return NextResponse.json({ statuses: {} }, { headers: { "Cache-Control": "no-store" } });
    }
    const { data: rows, error: attendanceError } = await admin
      .from("attendance")
      .select("student_id, status")
      .eq("lesson_id", lessonId)
      .limit(5000);
    if (!attendanceError) {
      const statuses: Record<string, any> = {};
      for (const row of rows ?? []) statuses[row.student_id] = row.status;
      return NextResponse.json({ statuses }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  const records = AttendanceService.attendanceForLessonExport(lessonId);
  return NextResponse.json({ statuses: records }, { headers: { "Cache-Control": "no-store" } });
}
