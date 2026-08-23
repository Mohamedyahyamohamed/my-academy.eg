import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("assessments and grades contracts", () => {
  it("extends the tenant-scoped assessment schema without creating a second source of truth", () => {
    const migration = read("supabase/migrations/20260823_assessments_and_grade_notes.sql");
    const schema = read("supabase/schema.sql");
    expect(migration).toContain("alter table public.exams");
    expect(migration).toContain("type in ('homework', 'quiz', 'exam')");
    expect(migration).toContain("alter table public.grades");
    expect(migration).toContain("add column if not exists notes text");
    expect(schema).toContain("group_id uuid not null references groups(id) on delete cascade");
    expect(schema).toContain("exam_id uuid not null references exams(id) on delete cascade");
  });

  it("protects bulk grade writes with tenant and roster checks in one RPC transaction", () => {
    const migration = read("supabase/migrations/20260823_assessments_and_grade_notes.sql");
    const service = read("services/grades.ts");
    expect(migration).toContain("create or replace function public.save_exam_grades");
    expect(migration).toContain("Every grade must belong to the assessment group and academy.");
    expect(migration).toContain("on conflict (exam_id, student_id)");
    expect(migration).toContain("revoke all on function public.save_exam_grades");
    expect(service).toContain('admin.rpc("save_exam_grades"');
    expect(service).toContain("notes: e.notes?.trim() || null");
  });

  it("connects group details to real assessment averages and the grading table", () => {
    const page = read("app/(app)/groups/[id]/page.tsx");
    const section = read("components/groups/group-assessments.tsx");
    const entry = read("components/grades/grade-entry.tsx");
    expect(page).toContain("GradesService.listExams");
    expect(page).toContain("grade.percentage");
    expect(page).toContain("<GroupAssessments");
    expect(section).toContain("التقييمات والدرجات");
    expect(section).toContain("/grades/${assessment.id}");
    expect(entry).toContain("ملاحظة اختيارية");
    expect(entry).toContain("notes: notes[r.studentId]?.trim() || null");
  });
});
