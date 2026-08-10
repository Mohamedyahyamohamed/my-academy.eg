/**
 * Integration tests — service functions with seeded data.
 * Run: npx vitest run
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createSeedData } from "@/services/data/seed";

// Use the seed data directly for testing (bypasses auth/cookies).
const seed = createSeedData();

function getStudents() { return seed.students; }
function getPayments() { return seed.payments; }
function getGrades() { return seed.grades; }
function getAttendance() { return seed.attendance; }

describe("Student data integrity", () => {
  it("all students have required fields", () => {
    for (const s of getStudents()) {
      expect(s.first_name).toBeTruthy();
      expect(s.last_name).toBeTruthy();
      expect(s.academy_id).toBeTruthy();
      expect(s.status).toMatch(/ACTIVE|INACTIVE|ARCHIVED/);
    }
  });

  it("student emails are unique within academy", () => {
    const emails = getStudents().map((s) => s.email).filter(Boolean);
    const unique = new Set(emails);
    expect(unique.size).toBe(emails.length);
  });

  it("enrolled students belong to valid groups", () => {
    const groupIds = new Set(seed.groups.map((g) => g.id));
    const studentIds = new Set(seed.students.map((s) => s.id));
    for (const gs of seed.groupStudents) {
      expect(groupIds.has(gs.group_id)).toBe(true);
      expect(studentIds.has(gs.student_id)).toBe(true);
    }
  });
});

describe("Payment integrity", () => {
  it("all payments reference valid students", () => {
    const studentIds = new Set(seed.students.map((s) => s.id));
    for (const p of getPayments()) {
      expect(studentIds.has(p.student_id)).toBe(true);
    }
  });

  it("amount_paid never exceeds amount_due", () => {
    for (const p of getPayments()) {
      expect(p.amount_paid).toBeLessThanOrEqual(p.amount_due);
    }
  });

  it("remaining is correctly calculated", () => {
    for (const p of getPayments()) {
      const expected = Math.max(0, p.amount_due - p.amount_paid);
      expect(Math.abs(p.remaining - expected)).toBeLessThanOrEqual(0.01);
    }
  });
});

describe("Grade integrity", () => {
  it("all grades reference valid exams and students", () => {
    const examIds = new Set(seed.exams.map((e) => e.id));
    const studentIds = new Set(seed.students.map((s) => s.id));
    for (const g of getGrades()) {
      expect(examIds.has(g.exam_id)).toBe(true);
      expect(studentIds.has(g.student_id)).toBe(true);
    }
  });

  it("no score exceeds max_score", () => {
    const exams = new Map(seed.exams.map((e) => [e.id, e.max_score]));
    for (const g of getGrades()) {
      const max = exams.get(g.exam_id);
      if (max) expect(g.score).toBeLessThanOrEqual(max);
    }
  });
});

describe("Attendance integrity", () => {
  it("all attendance references valid lessons and students", () => {
    const lessonIds = new Set(seed.lessons.map((l) => l.id));
    const studentIds = new Set(seed.students.map((s) => s.id));
    for (const a of getAttendance()) {
      expect(lessonIds.has(a.lesson_id)).toBe(true);
      expect(studentIds.has(a.student_id)).toBe(true);
    }
  });

  it("status is always valid enum", () => {
    for (const a of getAttendance()) {
      expect(["PRESENT", "ABSENT", "LATE"]).toContain(a.status);
    }
  });
});

describe("Multi-tenant isolation", () => {
  it("all entities have academy_id", () => {
    for (const s of seed.students) expect(s.academy_id).toBeTruthy();
    for (const g of seed.groups) expect(g.academy_id).toBeTruthy();
    for (const c of seed.courses) expect(c.academy_id).toBeTruthy();
    for (const p of seed.payments) expect(p.academy_id).toBeTruthy();
  });
});
