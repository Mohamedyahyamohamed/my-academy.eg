import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("assessments and grades contracts", () => {
  it("creates the requested tenant-scoped LMS tables and backfills existing records", () => {
    const migration = read("supabase/migrations/20260823_assessments_compatibility_tables.sql");
    const schema = read("supabase/schema.sql");
    expect(migration).toContain("create table if not exists public.assessments");
    expect(migration).toContain("title text not null");
    expect(migration).toContain("type text not null default 'exam'");
    expect(migration).toContain("group_id uuid not null references public.groups(id) on delete cascade");
    expect(migration).toContain("create table if not exists public.student_grades");
    expect(migration).toContain("assessment_id uuid not null references public.assessments(id) on delete cascade");
    expect(migration).toContain("student_id uuid not null references public.students(id) on delete cascade");
    expect(migration).toContain("insert into public.assessments");
    expect(migration).toContain("insert into public.student_grades");
    expect(schema).toContain("type text not null default 'exam' check (type in ('homework', 'quiz', 'exam'))");
    expect(schema).toContain("notes text");
  });

  it("keeps the requested LMS tables synchronized with the existing grading screens", () => {
    const migration = read("supabase/migrations/20260823_assessments_compatibility_tables.sql");
    expect(migration).toContain("sync_assessment_from_exam");
    expect(migration).toContain("sync_student_grade_from_grade");
    expect(migration).toContain("trg_sync_assessment_from_exam");
    expect(migration).toContain("trg_sync_student_grade_from_grade");
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
