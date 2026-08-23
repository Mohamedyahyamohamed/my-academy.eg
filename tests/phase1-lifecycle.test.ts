import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/services/data/store";
import { createSeedData } from "@/services/data/seed";
import { setRequestContext } from "@/services/request-context";
import { deleteStudent } from "@/services/students";
import { deleteGroup } from "@/services/groups";
import { updateAttendanceStatus } from "@/services/attendance";
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

  it("hard-deletes an empty group and archives a group with lessons", async () => {
    const source = db.data.groups[0]!;
    const emptyGroup = { ...source, id: "empty-group", name: "Empty group", is_active: true };
    db.data.groups.push(emptyGroup);

    const emptyResult = await deleteGroup(emptyGroup.id, ACADEMY_ID);
    expect(emptyResult.mode).toBe("hard_deleted");
    expect(db.data.groups.some((row) => row.id === emptyGroup.id)).toBe(false);

    const historicalGroup = { ...source, id: "historical-group", name: "Historical group", is_active: true };
    db.data.groups.push(historicalGroup);
    const lesson = { ...db.data.lessons[0]!, id: "historical-lesson", group_id: historicalGroup.id, is_cancelled: false };
    db.data.lessons.push(lesson);

    const historicalResult = await deleteGroup(historicalGroup.id, ACADEMY_ID);
    expect(historicalResult.mode).toBe("archived");
    expect(db.data.groups.find((row) => row.id === historicalGroup.id)).toMatchObject({ status: "INACTIVE", is_active: false });
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
    const lesson = { ...db.data.lessons[0]!, id: "phase1-lesson", group_id: group.id, is_cancelled: false };
    db.data.lessons.push(lesson);
    db.data.groupStudents.push({ group_id: group.id, student_id: student.id, joined_at: new Date().toISOString() });

    const saved = await updateAttendanceStatus(group.id, lesson.id, student.id, "LATE", "Late 15 mins");
    expect(saved).toMatchObject({ ok: true, note: "Late 15 mins" });

    await cancelLesson(lesson.id, "Holiday");
    const blocked = await updateAttendanceStatus(group.id, lesson.id, student.id, "PRESENT");
    expect(blocked).toMatchObject({ ok: false, code: "LESSON_CANCELLED" });
  });
});
