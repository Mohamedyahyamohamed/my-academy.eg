import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { db, collections } from "@/services/data/store";
import { createSeedData } from "@/services/data/seed";
import { setRequestContext } from "@/services/request-context";
import { updateAttendanceStatus } from "@/services/attendance";
import { transferStudentGroup } from "@/services/groups";

const ACADEMY = "academy-1";
const USER = {
  id: "prof-teacher",
  email: "teacher@myacademy.edu",
  role: "TEACHER",
  full_name: "Attendance Admin",
  academy_id: ACADEMY,
} as any;

const FIXTURES = {
  student: "attendance-student",
  fromGroup: "attendance-group-from",
  toGroup: "attendance-group-to",
  otherAcademyGroup: "attendance-group-other-academy",
  lesson: "attendance-lesson",
  attendance: "attendance-record",
};

function now() {
  return new Date().toISOString();
}

beforeEach(() => {
  db.data = createSeedData();
  const timestamp = now();
  db.data.students.push({
    id: FIXTURES.student,
    academy_id: ACADEMY,
    first_name: "Attendance",
    last_name: "Fixture",
    date_of_birth: null,
    gender: null,
    phone: null,
    email: "attendance.fixture@test.invalid",
    parent_id: null,
    school: null,
    grade: "First Secondary",
    notes: null,
    status: "ACTIVE",
    consent_given: true,
    consent_at: timestamp,
    consent_by: USER.id,
    consent_version: "1.0",
    enrolled_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  } as any);
  db.data.groups.push(
    {
      id: FIXTURES.fromGroup,
      academy_id: ACADEMY,
      name: "Saturday group",
      course_id: "course-1",
      teacher_id: "teacher-1",
      monthly_fee: 100,
      schedule: "Sat — 4:00 PM",
      room: null,
      status: "ACTIVE",
      created_at: timestamp,
      updated_at: timestamp,
    } as any,
    {
      id: FIXTURES.toGroup,
      academy_id: ACADEMY,
      name: "Monday group",
      course_id: "course-1",
      teacher_id: "teacher-1",
      monthly_fee: 100,
      schedule: "Mon — 4:00 PM",
      room: null,
      status: "ACTIVE",
      created_at: timestamp,
      updated_at: timestamp,
    } as any,
    {
      id: FIXTURES.otherAcademyGroup,
      academy_id: "academy-b",
      name: "Other academy group",
      course_id: "course-b",
      teacher_id: "teacher-b",
      monthly_fee: 100,
      schedule: "Mon — 4:00 PM",
      room: null,
      status: "ACTIVE",
      created_at: timestamp,
      updated_at: timestamp,
    } as any,
  );
  db.data.groupStudents.push({ group_id: FIXTURES.fromGroup, student_id: FIXTURES.student, joined_at: timestamp } as any);
  db.data.lessons.push({
    id: FIXTURES.lesson,
    academy_id: ACADEMY,
    group_id: FIXTURES.fromGroup,
    teacher_id: "teacher-1",
    date: "2099-01-10",
    start_time: "16:00",
    end_time: "17:00",
    topic: "Same teaching unit",
    description: null,
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
  } as any);
  db.data.attendance.push({
    id: FIXTURES.attendance,
    lesson_id: FIXTURES.lesson,
    student_id: FIXTURES.student,
    status: "ABSENT",
    note: null,
    recorded_at: timestamp,
  } as any);
  setRequestContext(USER);
});

afterEach(() => setRequestContext(null));

describe("manual attendance status and student group transfer", () => {
  it("updates only the selected student's attendance record", async () => {
    const result = await updateAttendanceStatus(FIXTURES.fromGroup, FIXTURES.lesson, FIXTURES.student, "PRESENT");

    expect(result.ok).toBe(true);
    expect(collections().attendance.filter((row) => row.lesson_id === FIXTURES.lesson && row.student_id === FIXTURES.student)).toHaveLength(1);
    expect(collections().attendance.find((row) => row.id === FIXTURES.attendance)?.status).toBe("PRESENT");
  });

  it("rejects an invalid attendance status with a field-specific error", async () => {
    const result = await updateAttendanceStatus(FIXTURES.fromGroup, FIXTURES.lesson, FIXTURES.student, "UNKNOWN" as any);

    expect(result).toMatchObject({ ok: false, code: "INVALID_STATUS", field: "status" });
    expect(collections().attendance.find((row) => row.id === FIXTURES.attendance)?.status).toBe("ABSENT");
  });

  it("rejects a group mismatch without changing attendance", async () => {
    const before = JSON.stringify(collections().attendance);
    const result = await updateAttendanceStatus(FIXTURES.toGroup, FIXTURES.lesson, FIXTURES.student, "LATE");

    expect(result).toMatchObject({ ok: false, code: "GROUP_MISMATCH", field: "groupId" });
    expect(JSON.stringify(collections().attendance)).toBe(before);
  });

  it("replaces the selected membership and never leaves both memberships", async () => {
    const result = await transferStudentGroup(FIXTURES.student, FIXTURES.fromGroup, FIXTURES.toGroup);

    expect(result).toMatchObject({ ok: true, fromGroupId: FIXTURES.fromGroup, toGroupId: FIXTURES.toGroup });
    expect(collections().groupStudents.some((row) => row.group_id === FIXTURES.fromGroup && row.student_id === FIXTURES.student)).toBe(false);
    expect(collections().groupStudents.some((row) => row.group_id === FIXTURES.toGroup && row.student_id === FIXTURES.student)).toBe(true);
  });

  it("rejects a cross-academy target and preserves the original membership", async () => {
    const before = JSON.stringify(collections().groupStudents);
    const result = await transferStudentGroup(FIXTURES.student, FIXTURES.fromGroup, FIXTURES.otherAcademyGroup);

    expect(result).toMatchObject({ ok: false, code: "TARGET_GROUP_NOT_FOUND", field: "toGroupId" });
    expect(JSON.stringify(collections().groupStudents)).toBe(before);
  });
});
