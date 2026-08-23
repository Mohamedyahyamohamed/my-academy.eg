import { beforeEach, describe, expect, it } from "vitest";
import { db, collections } from "@/services/data/store";
import { createSeedData } from "@/services/data/seed";
import { setRequestContext } from "@/services/request-context";
import { updateStudent } from "@/services/students";

beforeEach(() => {
  db.data = createSeedData();
  setRequestContext({
    id: "prof-admin",
    email: "admin@myacademy.edu",
    role: "ADMIN",
    full_name: "Academy Admin",
    academy_id: "academy-1",
  } as any);
});

describe("student group assignment", () => {
  it("assigns the student to an in-academy group and persists the membership", async () => {
    await updateStudent("student-1", { groupIds: ["group-2"] }, "academy-1");
    expect(collections().groupStudents.filter((row) => row.student_id === "student-1").map((row) => row.group_id)).toEqual(["group-2"]);
  });

  it("clears all memberships when the edit form submits an empty selection", async () => {
    await updateStudent("student-1", { groupIds: [] }, "academy-1");
    expect(collections().groupStudents.some((row) => row.student_id === "student-1")).toBe(false);
  });

  it("rejects an out-of-academy group before changing memberships", async () => {
    collections().groups.push({ id: "group-academy-2", academy_id: "academy-2", name: "Other academy", course_id: "course-math", teacher_id: null, monthly_fee: 0, schedule: "", is_active: true } as any);
    const before = collections().groupStudents.filter((row) => row.student_id === "student-1").map((row) => row.group_id);

    await expect(updateStudent("student-1", { groupIds: ["group-academy-2"] }, "academy-1"))
      .rejects.toThrow("outside the authenticated academy");
    expect(collections().groupStudents.filter((row) => row.student_id === "student-1").map((row) => row.group_id)).toEqual(before);
  });
});
