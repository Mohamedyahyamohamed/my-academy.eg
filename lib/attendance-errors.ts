export type AttendanceErrorCode =
  | "ATTENDANCE_ALREADY_RECORDED"
  | "STUDENT_NOT_ENROLLED"
  | "NO_ACTIVE_LESSON"
  | "LESSON_NOT_FOUND"
  | "TEACHER_LOGIN_REQUIRED"
  | "NO_ASSIGNED_GROUP"
  | "RATE_LIMITED"
  | "CHECKIN_FAILED";

/** Identify durable uniqueness conflicts without exposing database details. */
export function isDuplicateAttendanceError(message: string): boolean {
  return /duplicate|already exists|unique|23505/i.test(message);
}

/** Convert service/database errors into a stable, non-sensitive attendance code. */
export function attendanceErrorCode(message: string): AttendanceErrorCode {
  if (isDuplicateAttendanceError(message)) return "ATTENDANCE_ALREADY_RECORDED";
  if (/not enrolled|enrolled/i.test(message)) return "STUDENT_NOT_ENROLLED";
  if (/no active lesson/i.test(message)) return "NO_ACTIVE_LESSON";
  if (/lesson not found/i.test(message)) return "LESSON_NOT_FOUND";
  return "CHECKIN_FAILED";
}

export function attendanceErrorMessage(code: string, en: boolean): string {
  const messages: Record<string, [string, string]> = {
    ATTENDANCE_ALREADY_RECORDED: ["Attendance was already recorded for this lesson.", "تم تسجيل حضور هذا الطالب لهذه الحصة بالفعل."],
    STUDENT_NOT_ENROLLED: ["This student is not enrolled in the selected group.", "هذا الطالب غير مسجل في المجموعة المختارة."],
    NO_ACTIVE_LESSON: ["There is no active lesson for this group right now.", "لا توجد حصة جارية لهذه المجموعة الآن."],
    LESSON_NOT_FOUND: ["The selected lesson could not be found.", "تعذّر العثور على الحصة المختارة."],
    TEACHER_LOGIN_REQUIRED: ["Log in as a teacher or assistant to record attendance.", "سجّل الدخول كمدرس أو مساعد لتسجيل الحضور."],
    NO_ASSIGNED_GROUP: ["You do not have an assigned attendance group.", "لا توجد مجموعة حضور مسندة إليك."],
    RATE_LIMITED: ["Too many scan attempts. Please wait and try again.", "عدد محاولات المسح كبير. انتظر قليلًا ثم حاول مرة أخرى."],
    CHECKIN_FAILED: ["Attendance could not be recorded. Please try again.", "تعذّر تسجيل الحضور. حاول مرة أخرى."],
  };
  return messages[code]?.[en ? 0 : 1] ?? messages.CHECKIN_FAILED[en ? 0 : 1];
}
