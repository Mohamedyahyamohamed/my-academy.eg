import { describe, expect, it, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setRequestContext } from "@/services/request-context";
import { assertDirectInsertTenantScope } from "@/services/data/store";

const ACADEMY_A = "11111111-1111-4111-8111-111111111111";
const ACADEMY_B = "22222222-2222-4222-8222-222222222222";

function contextFor(academyId: string) {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    email: "tenant-test@example.invalid",
    role: "ADMIN" as const,
    full_name: "Tenant Test Admin",
    avatar_url: null,
    academy_id: academyId,
  };
}

afterEach(() => setRequestContext(null));

describe("tenant isolation hardening", () => {
  it("allows a direct insert only for the authenticated academy", () => {
    setRequestContext(contextFor(ACADEMY_A));

    expect(assertDirectInsertTenantScope("students", { academy_id: ACADEMY_A })).toBe(ACADEMY_A);
    expect(() => assertDirectInsertTenantScope("students", { academy_id: ACADEMY_B }))
      .toThrow("academy scope mismatch");
  });

  it("fails closed when a direct insert has no authenticated academy context", () => {
    setRequestContext(null);

    expect(() => assertDirectInsertTenantScope("groups", { academy_id: ACADEMY_A }))
      .toThrow("missing an authenticated academy scope");
  });

  it("does not use row.academy_id as an authorization fallback", () => {
    const source = readFileSync(resolve(__dirname, "../services/data/store.ts"), "utf8");
    expect(source).toContain("Never fall back");
    expect(source).toContain("const academyId = assertDirectInsertTenantScope(table, row, academyIdOverride);");
    expect(source).not.toContain("scopedAcademyId(table) ?? rowAcademyId");
  });

  it("allows an explicit authenticated scope only when it matches the active context", () => {
    setRequestContext(contextFor(ACADEMY_A));

    expect(assertDirectInsertTenantScope("students", { academy_id: ACADEMY_A }, ACADEMY_A)).toBe(ACADEMY_A);
    expect(() => assertDirectInsertTenantScope("students", { academy_id: ACADEMY_B }, ACADEMY_A))
      .toThrow("academy scope mismatch");
    setRequestContext(null);
    expect(assertDirectInsertTenantScope("students", { academy_id: ACADEMY_A }, ACADEMY_A)).toBe(ACADEMY_A);
  });

  it("contains RLS guards for all four cross-tenant mutation classes", () => {
    const sql = readFileSync(resolve(__dirname, "../supabase/20260821_tenant_isolation_hardening.sql"), "utf8");
    expect(sql).toContain("group_student_admin_or_group_teacher_insert");
    expect(sql).toContain("group_student_admin_or_group_teacher_update");
    expect(sql).toContain("group_student_admin_or_group_teacher_delete");
    expect(sql).toContain("homework_submission_student_insert");
    expect(sql).toContain("homework_submission_admin_or_group_teacher_update");
    expect(sql).toContain("homework_submission_admin_or_group_teacher_delete");
    expect(sql).toContain("s.academy_id = g.academy_id");
    expect(sql).toContain("c.academy_id = content_files.academy_id");
  });
});
