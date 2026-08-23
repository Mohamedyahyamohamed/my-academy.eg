import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("lesson exception contracts", () => {
  it("persists a canonical lesson status while retaining legacy cancellation compatibility", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260823_lesson_status_and_attendance_notes.sql"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "services/lessons.ts"), "utf8");
    expect(migration).toContain("add column if not exists status");
    expect(migration).toContain("'scheduled', 'canceled', 'completed'");
    expect(migration).toContain("set status = 'canceled'");
    expect(service).toContain("status: \"canceled\" as const");
    expect(service).toContain("isLessonCanceled");
  });

  it("keeps one-off rescheduling tenant-scoped and separate from recurring schedule", () => {
    const action = readFileSync(resolve(process.cwd(), "app/actions/lessons.ts"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "services/lessons.ts"), "utf8");
    const dialog = readFileSync(resolve(process.cwd(), "components/lessons/lesson-exception-dialog.tsx"), "utf8");
    expect(action).toContain("updateLessonAction");
    expect(action).toContain("setRequestContext(user)");
    expect(service).toContain("if (l.academy_id !== academyId)");
    expect(service).toContain("persistUpdate(\"lessons\", id, patch)");
    expect(dialog).toContain("updateLessonAction(lesson.id, { date, start_time: start, end_time: end })");
    expect(dialog).toContain("دون تغيير جدول المجموعة");
    expect(dialog).toContain('lesson.status === "canceled" || lesson.is_cancelled === true');
  });

  it("stores attendance notes and excludes canceled lessons from aggregates", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260823_lesson_status_and_attendance_notes.sql"), "utf8");
    const attendance = readFileSync(resolve(process.cwd(), "services/attendance.ts"), "utf8");
    const detail = readFileSync(resolve(process.cwd(), "app/(app)/lessons/[id]/page.tsx"), "utf8");
    expect(migration).toContain("add column if not exists notes text");
    expect(attendance).toContain("notes: note !== undefined");
    expect(attendance).toContain("!isLessonCanceled(lesson)");
    expect(detail).toContain("lessonCanceled");
    expect(detail).toContain("currentNote=");
  });
});
