import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, AttendanceService } from "@/services";

export async function GET(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ statuses: {} }, { status: 401 });
  const lessonId = req.nextUrl.searchParams.get("lesson");
  if (!lessonId) return NextResponse.json({ statuses: {} });
  const records = AttendanceService.attendanceForLessonExport(lessonId);
  return NextResponse.json({ statuses: records });
}
