import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("exam paper upload storage contract", () => {
  const action = read("app/actions/grades.ts");
  const migration = read("supabase/migrations/202608261500_exam_papers_storage.sql");

  it("uses the dedicated exam-papers bucket in every server-side storage operation", () => {
    expect(action).toContain('storage.from("exam-papers")');
    expect(action).toContain('bucket: "exam-papers"');
    expect(action).not.toContain('storage.from("files")');
  });

  it("creates a private 10 MiB bucket with the allowed exam-paper MIME types", () => {
    expect(migration).toContain("'exam-papers'");
    expect(migration).toContain("public = false");
    expect(migration).toContain("10 * 1024 * 1024");
    expect(migration).toContain("application/pdf");
    expect(migration).toContain("image/png");
    expect(migration).toContain("image/jpeg");
    expect(migration).toContain("image/webp");
  });

  it("scopes Storage policies to the academy path", () => {
    expect(migration).toContain("storage_path_academy_id(name) = private.auth_academy_id()");
    expect(migration).toContain("to authenticated");
  });
});
