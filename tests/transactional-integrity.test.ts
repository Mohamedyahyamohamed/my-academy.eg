import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildRecurringLessonRows } from "@/lib/lesson-generation";

describe("transactional integrity contracts", () => {
  it("builds plain tenant-scoped lesson rows from a structured schedule", () => {
    const rows = buildRecurringLessonRows(
      {
        id: "group-1",
        name: "Math",
        teacher_id: "teacher-1",
        schedule: "SCHEDULE_V1|days=sat,tue|start=19:00|end=20:00",
      },
      "academy-1",
      1,
      new Date("2026-08-17T12:00:00.000Z"),
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.academy_id === "academy-1")).toBe(true);
    expect(rows.every((row) => row.group_id === "group-1")).toBe(true);
    expect(rows.every((row) => row.status === "scheduled")).toBe(true);
    expect(rows.every((row) => row.start_time === "19:00" && row.end_time === "20:00")).toBe(true);
  });

  it("uses one RPC transaction for group plus generated lessons", () => {
    const action = readFileSync(resolve(process.cwd(), "app/actions/groups.ts"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "services/groups.ts"), "utf8");
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260823_transactional_group_creation.sql"), "utf8");

    expect(action).toContain("GroupsService.createGroupWithLessons");
    expect(action).not.toContain("LessonsService.createRecurringLessonsForGroup");
    expect(service).toContain('client.rpc("create_group_with_lessons"');
    expect(service).toContain("collections().groups.push(group)");
    expect(migration).toContain("insert into public.groups");
    expect(migration).toContain("insert into public.lessons");
    expect(migration).toContain("jsonb_to_recordset(p_lessons)");
    expect(migration).toContain("revoke all on function public.create_group_with_lessons");
  });

  it("keeps direct group writes out of the local snapshot until durable persistence succeeds", () => {
    const service = readFileSync(resolve(process.cwd(), "services/groups.ts"), "utf8");
    const createStart = service.indexOf("export async function createGroup(");
    const createEnd = service.indexOf("export async function createGroupWithLessons(");
    const source = service.slice(createStart, createEnd);
    expect(source.indexOf("await persistInsert(\"groups\""))
      .toBeLessThan(source.indexOf("collections().groups.push(g)"));
  });
});
