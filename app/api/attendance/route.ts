import { NextRequest, NextResponse } from "next/server";
import { requireAttendanceTeacher, AttendanceService } from "@/services";

export async function GET(req: NextRequest) {
  await requireAttendanceTeacher();
  const lessonId = req.nextUrl.searchParams.get("lesson");
  if (!lessonId) return NextResponse.json({ statuses: {} });
  const records = AttendanceService.attendanceForLessonExport(lessonId);
  return NextResponse.json({ statuses: records });
}
