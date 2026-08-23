import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("force group cascade delete contract", () => {
  it("uses the scoped server action and the transactional RPC", () => {
    const action = readFileSync(resolve(process.cwd(), "app/actions/groups.ts"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "services/groups.ts"), "utf8");
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260823_force_group_cascade_delete.sql"), "utf8");

    expect(action).toContain('requireScopedRole("ADMIN", "TEACHER")');
    expect(action).toContain("GroupsService.deleteGroup(id, user.academy_id)");
    expect(service).toContain('client.rpc("delete_group_cascade"');
    expect(service).toContain("p_group_id: id");
    expect(service).toContain("p_academy_id: academyId");
    expect(migration).toContain("security definer");
    expect(migration).toContain("revoke all on function public.delete_group_cascade");
    expect(migration).toContain("grant execute on function public.delete_group_cascade");
  });

  it("deletes child records before the group and never deletes students", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260823_force_group_cascade_delete.sql"), "utf8");
    const attendanceDelete = migration.indexOf("delete from public.attendance");
    const lessonDelete = migration.indexOf("delete from public.lessons l");
    const groupDelete = migration.indexOf("delete from public.groups g");

    expect(attendanceDelete).toBeGreaterThan(-1);
    expect(lessonDelete).toBeGreaterThan(attendanceDelete);
    expect(groupDelete).toBeGreaterThan(lessonDelete);
    expect(migration).toContain("delete from public.group_students");
    expect(migration).not.toMatch(/delete\s+from\s+public\.students/i);
    expect(migration).toContain("Group is outside the authenticated academy");
  });

  it("shows the permanent group-deletion warning while preserving students", () => {
    const button = readFileSync(resolve(process.cwd(), "components/shared/delete-entity-button.tsx"), "utf8");
    expect(button).toContain("This will permanently delete");
    expect(button).toContain("all its generated lessons");
    expect(button).toContain("related attendance records");
    expect(button).toContain("Students will not be deleted");
    expect(button).toContain("will be unassigned from this group");
  });
});
