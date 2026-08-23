import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("student portal contract", () => {
  it("adds an unguessable token with a unique database index and backfills existing rows", () => {
    const migration = read("supabase/migrations/20260823_student_portal_access_tokens.sql");
    expect(migration).toContain("add column if not exists access_token uuid");
    expect(migration).toContain("set access_token = gen_random_uuid()");
    expect(migration).toContain("create unique index if not exists students_access_token_uidx");
    expect(migration).not.toContain("grant select");
    expect(migration).not.toContain("create policy");
  });

  it("scopes the public lookup by exact token and the student's academy", () => {
    const service = read("services/portals.ts");
    expect(service).toContain('eq("access_token", normalizedToken)');
    expect(service).toContain('eq("academy_id", student.academy_id)');
    expect(service).toContain('eq("student_id", student.id)');
    expect(service).toContain('eq("is_active", true)');
    expect(service).toContain("validPortalToken");
  });

  it("keeps the portal read-only and excludes private contact/payment fields", () => {
    const page = read("app/portal/[token]/page.tsx");
    expect(page).toContain("بوابة الطالب");
    expect(page).toContain("الدرجات");
    expect(page).toContain("لا توجد درجات مسجلة حتى الآن");
    expect(page).toContain("robots: { index: false, follow: false }");
    expect(page).not.toContain("phone");
    expect(page).not.toContain("email");
    expect(page).not.toContain("amount_paid");
  });

  it("does not include the bearer token in list queries or cached collection responses", () => {
    const service = read("services/students.ts");
    expect(service).toContain("function withoutPortalToken");
    expect(service).toContain("select(\"id,academy_id,owner_teacher_id");
    expect(service).not.toContain('from("students").select("*", { count: "exact" })');
  });

  it("exposes both the portal link and parent report action from the secured profile", () => {
    const profile = read("app/(app)/students/[id]/page.tsx");
    expect(profile).toContain("/portal/${detail.access_token}");
    expect(profile).toContain("توليد تقرير ولي الأمر");
  });
});
