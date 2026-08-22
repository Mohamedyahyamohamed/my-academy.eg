import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, collections } from "@/services/data/store";
import { createSeedData } from "@/services/data/seed";
import { setRequestContext } from "@/services/request-context";
import { createCourse } from "@/services/misc";
import { createGroup } from "@/services/groups";

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
});
