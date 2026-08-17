import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser, AttendanceService } from "@/services";

export async function GET(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user) return NextResponse.json({ statuses: {} }, { status: 401 });
  const lessonId = req.nextUrl.searchParams.get("lesson");
  if (!lessonId) return NextResponse.json({ statuses: {} });
  const records = AttendanceService.attendanceForLessonExport(lessonId);
  return NextResponse.json({ statuses: records });
}
