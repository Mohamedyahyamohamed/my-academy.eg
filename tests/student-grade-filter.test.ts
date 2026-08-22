import { beforeEach, describe, expect, it, afterEach } from "vitest";
import { db } from "@/services/data/store";
import { createSeedData } from "@/services/data/seed";
import { setRequestContext } from "@/services/request-context";
import { listStudentGrades, listStudents, updateStudent } from "@/services/students";

const ACADEMY_ID = "academy-1";

beforeEach(() => {
  db.data = createSeedData();
  const template = db.data.students[0];
  db.data.students.push(
    {
      ...template,
      id: "grade-filter-first-prep",
      first_name: "Grade",
      last_name: "First Prep",
      email: "grade-first-prep@test.invalid",
      grade: "الصف الأول الإعدادي",
      status: "ACTIVE",
    },
    {
      ...template,
      id: "grade-filter-second-prep",
      first_name: "Grade",
      last_name: "Second Prep",
      email: "grade-second-prep@test.invalid",
      grade: "الصف الثاني الإعدادي",
      status: "INACTIVE",
    },
  );
  setRequestContext({
    id: "prof-admin",
    email: "admin@myacademy.edu",
    role: "ADMIN",
    academy_id: ACADEMY_ID,
  } as any);
});

afterEach(() => setRequestContext(null));

describe("student grade filtering", () => {
  it("filters students by the exact stored grade and composes with status", async () => {
    const result = await listStudents(
      {
        grade: "الصف الأول الإعدادي",
        status: "ACTIVE",
        page: 1,
        pageSize: 100,
      },
      ACADEMY_ID,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("grade-filter-first-prep");
    expect(result.items.every((student) => student.grade === "الصف الأول الإعدادي")).toBe(true);
  });

  it("updates a student when the authenticated academy is passed explicitly", async () => {
    setRequestContext({ id: "prof-admin", email: "admin@myacademy.edu", role: "ADMIN" } as any);
    const target = db.data.students[0]!;

    await updateStudent(target.id, { notes: "explicit academy scope regression" }, ACADEMY_ID);

    expect(target.notes).toBe("explicit academy scope regression");
  });

  it("returns all non-empty grades visible in the tenant, not only the current page", async () => {
    const grades = await listStudentGrades(ACADEMY_ID);

    expect(grades).toContain("الصف الأول الإعدادي");
    expect(grades).toContain("الصف الثاني الإعدادي");
    expect(grades).not.toContain("");
  });
});
