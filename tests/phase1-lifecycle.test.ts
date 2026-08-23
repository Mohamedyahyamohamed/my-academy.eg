import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/services/data/store";
import { createSeedData } from "@/services/data/seed";
import { setRequestContext } from "@/services/request-context";
import { deleteStudent } from "@/services/students";
import { deleteGroup } from "@/services/groups";
import { updateAttendanceStatus, studentAttendanceSummary } from "@/services/attendance";
import { cancelLesson } from "@/services/lessons";

const ACADEMY_ID = "academy-1";

beforeEach(() => {
  db.data = createSeedData();
  setRequestContext({
    id: "prof-admin",
    email: "admin@myacademy.edu",
    role: "ADMIN",
    academy_id: ACADEMY_ID,
  } as any);
});

afterEach(() => setRequestContext(null));

describe("Phase 1 lifecycle rules", () => {
  it("hard-deletes an unreferenced student", async () => {
    const source = db.data.students[0]!;
    const student = { ...source, id: "unreferenced-student", is_active: true };
    db.data.students.push(student);

    const result = await deleteStudent(student.id, ACADEMY_ID);

    expect(result.mode).toBe("hard_deleted");
    expect(db.data.students.some((row) => row.id === student.id)).toBe(false);
  });

  it("archives a student with historical group membership", async () => {
    const source = db.data.students[0]!;
    const group = db.data.groups[0]!;
    const student = { ...source, id: "referenced-student", is_active: true };
    db.data.students.push(student);
    db.data.groupStudents.push({ group_id: group.id, student_id: student.id, joined_at: new Date().toISOString() });

    const result = await deleteStudent(student.id, ACADEMY_ID);

    expect(result.mode).toBe("archived");
    expect(result.relationCount).toBeGreaterThan(0);
    expect(db.data.students.find((row) => row.id === student.id)).toMatchObject({ status: "ARCHIVED", is_active: false });
  });

  it("force-deletes a group with lessons and attendance while preserving students", async () => {
    const source = db.data.groups[0]!;
    const group = { ...source, id: "cascade-group", name: "Cascade group", is_active: true };
    const student = { ...db.data.students[0]!, id: "cascade-student", first_name: "Cascade", last_name: "Student" };
    const lesson = { ...db.data.lessons[0]!, id: "cascade-lesson", group_id: group.id, status: "scheduled" as const, is_cancelled: false };
    const attendance = { ...db.data.attendance[0]!, id: "cascade-attendance", lesson_id: lesson.id, student_id: student.id };

    db.data.groups.push(group);
    db.data.students.push(student);
    db.data.lessons.push(lesson);
    db.data.attendance.push(attendance);
    db.data.groupStudents.push({ group_id: group.id, student_id: student.id, joined_at: new Date().toISOString() });

    const result = await deleteGroup(group.id, ACADEMY_ID);

    expect(result.mode).toBe("hard_deleted");
    expect(db.data.groups.some((row) => row.id === group.id)).toBe(false);
    expect(db.data.students.some((row) => row.id === student.id)).toBe(true);
    expect(db.data.groupStudents.some((row) => row.group_id === group.id)).toBe(false);
    expect(db.data.lessons.some((row) => row.id === lesson.id)).toBe(false);
    expect(db.data.attendance.some((row) => row.id === attendance.id)).toBe(false);
  });

  it("stores a manual attendance note and rejects cancelled lessons", async () => {
    setRequestContext({
      id: "prof-teacher",
      email: "teacher@myacademy.edu",
      role: "TEACHER",
      academy_id: ACADEMY_ID,
    } as any);
    const group = db.data.groups[0]!;
    const student = db.data.students[0]!;
    const lesson = { ...db.data.lessons[0]!, id: "phase1-lesson", group_id: group.id, status: "scheduled" as const, is_cancelled: false };
    db.data.lessons.push(lesson);
    db.data.groupStudents.push({ group_id: group.id, student_id: student.id, joined_at: new Date().toISOString() });

    const saved = await updateAttendanceStatus(group.id, lesson.id, student.id, "LATE", "Late 15 mins");
    expect(saved).toMatchObject({ ok: true, note: "Late 15 mins" });

    const beforeCancel = studentAttendanceSummary(student.id, ACADEMY_ID);
    await cancelLesson(lesson.id, "Holiday");
    expect(db.data.lessons.find((row) => row.id === lesson.id)).toMatchObject({ status: "canceled", is_cancelled: true });
    expect(studentAttendanceSummary(student.id, ACADEMY_ID).total).toBe(beforeCancel.total - 1);
    const blocked = await updateAttendanceStatus(group.id, lesson.id, student.id, "PRESENT");
    expect(blocked).toMatchObject({ ok: false, code: "LESSON_CANCELLED" });
  });
});
