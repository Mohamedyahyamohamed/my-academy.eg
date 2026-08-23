import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db, collections } from "@/services/data/store";
import { createSeedData } from "@/services/data/seed";
import { setRequestContext } from "@/services/request-context";
import { createCourse } from "@/services/misc";
import { createGroup, updateGroup } from "@/services/groups";
import type { SessionUser } from "@/types";

const ACADEMY = "academy-1";

beforeEach(() => {
  db.data = createSeedData();
  setRequestContext(null);
});

afterEach(() => setRequestContext(null));

describe("group creation request-context fallback", () => {
  it("creates a new course with the explicit verified academy scope", async () => {
    const course = await createCourse({ academy_id: ACADEMY, name: "Context-safe course" }, ACADEMY);

    expect(course.academy_id).toBe(ACADEMY);
    expect(collections().courses.some((item) => item.id === course.id && item.academy_id === ACADEMY)).toBe(true);
  });

  it("creates a group with the explicit verified academy scope", async () => {
    const group = await createGroup({
      academy_id: ACADEMY,
      name: "Context-safe group",
      course_id: "course-math",
      teacher_id: "teacher-1",
      monthly_fee: 150,
      schedule: "SCHEDULE_V1|days=sat,tue|start=19:00|end=20:00",
    }, ACADEMY);

    expect(group.academy_id).toBe(ACADEMY);
    expect(collections().groups.some((item) => item.id === group.id && item.academy_id === ACADEMY)).toBe(true);
  });

  it("lets the authenticated teacher update their own group with an explicit academy scope", async () => {
    const teacher: SessionUser = {
      id: "prof-teacher",
      academy_id: ACADEMY,
      email: "teacher@myacademy.edu",
      role: "TEACHER",
      full_name: "Omar Khaled",
      avatar_url: null,
    };
    setRequestContext(teacher);
    const group = await updateGroup("group-1", { name: "Updated by owner" }, ACADEMY, teacher);
    expect(group?.name).toBe("Updated by owner");
    expect(group?.academy_id).toBe(ACADEMY);
  });

  it("rejects a teacher from updating a group owned by another teacher", async () => {
    const teacher: SessionUser = {
      id: "prof-teacher",
      academy_id: ACADEMY,
      email: "teacher@myacademy.edu",
      role: "TEACHER",
      full_name: "Omar Khaled",
      avatar_url: null,
    };
    setRequestContext(teacher);
    await expect(updateGroup("group-4", { name: "Should be rejected" }, ACADEMY, teacher))
      .rejects.toThrow("only edit groups assigned to you");
  });

  it("guards table-specific parent_id access in the production tenant trigger migration", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "supabase/20260823_fix_direct_academy_trigger_parent_reference.sql"),
      "utf8",
    );

    expect(migration).toContain("if tg_table_name = 'students' then");
    expect(migration).toContain("if new.parent_id is not null then");
    expect(migration).not.toContain("tg_table_name = 'students' and new.parent_id");
  });
});
