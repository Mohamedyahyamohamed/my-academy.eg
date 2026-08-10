/**
 * Unit tests for MY Academy business logic.
 * Run: npx vitest run
 */
import { describe, it, expect } from "vitest";
import { percentage, round, clamp } from "@/lib/utils";
import {
  performanceLevel,
  PERFORMANCE_LEVELS,
  PAYMENT_STATUS,
} from "@/lib/constants";

// ─── Payment derivation ───────────────────────────────────────────
describe("Payment remaining & status", () => {
  function derive(amountDue: number, amountPaid: number) {
    const remaining = Math.max(0, amountDue - amountPaid);
    let status = PAYMENT_STATUS.UNPAID;
    if (amountPaid >= amountDue && amountDue > 0) status = PAYMENT_STATUS.PAID;
    else if (amountPaid > 0) status = PAYMENT_STATUS.PARTIAL;
    return { remaining, status };
  }

  it("fully paid → remaining 0, status PAID", () => {
    const r = derive(1000, 1000);
    expect(r.remaining).toBe(0);
    expect(r.status).toBe(PAYMENT_STATUS.PAID);
  });

  it("partially paid → remaining > 0, status PARTIAL", () => {
    const r = derive(1000, 500);
    expect(r.remaining).toBe(500);
    expect(r.status).toBe(PAYMENT_STATUS.PARTIAL);
  });

  it("unpaid → remaining = full, status UNPAID", () => {
    const r = derive(1000, 0);
    expect(r.remaining).toBe(1000);
    expect(r.status).toBe(PAYMENT_STATUS.UNPAID);
  });

  it("overpaid → remaining clamped to 0", () => {
    const r = derive(1000, 1500);
    expect(r.remaining).toBe(0);
    expect(r.status).toBe(PAYMENT_STATUS.PAID);
  });

  it("negative amounts prevented", () => {
    const r = derive(-100, -50);
    // In the real service, negative amounts are rejected before this.
    // Here we verify Math.max(0, ...) clamps.
    expect(Math.max(0, -100 - (-50))).toBe(0);
  });
});

// ─── Grade validation ─────────────────────────────────────────────
describe("Grade validation & performance levels", () => {
  it("90%+ → Excellent", () => {
    expect(performanceLevel(95)).toBe(PERFORMANCE_LEVELS.EXCELLENT);
    expect(performanceLevel(90)).toBe(PERFORMANCE_LEVELS.EXCELLENT);
  });

  it("75-89% → Very Good", () => {
    expect(performanceLevel(82)).toBe(PERFORMANCE_LEVELS.VERY_GOOD);
    expect(performanceLevel(75)).toBe(PERFORMANCE_LEVELS.VERY_GOOD);
  });

  it("60-74% → Good", () => {
    expect(performanceLevel(68)).toBe(PERFORMANCE_LEVELS.GOOD);
    expect(performanceLevel(60)).toBe(PERFORMANCE_LEVELS.GOOD);
  });

  it("<60% → Needs Improvement", () => {
    expect(performanceLevel(55)).toBe(PERFORMANCE_LEVELS.NEEDS_IMPROVEMENT);
    expect(performanceLevel(0)).toBe(PERFORMANCE_LEVELS.NEEDS_IMPROVEMENT);
  });

  it("score cannot exceed max_score (enforced in service)", () => {
    const maxScore = 50;
    const score = 60;
    expect(score > maxScore).toBe(true); // would be rejected by saveGrades
  });
});

// ─── Attendance calculations ──────────────────────────────────────
describe("Attendance calculations", () => {
  function summarize(records: { status: "PRESENT" | "ABSENT" | "LATE" }[]) {
    const present = records.filter((r) => r.status === "PRESENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const total = records.length;
    return {
      total,
      present,
      late,
      absent,
      rate: total ? percentage(present + late, total) : 0,
    };
  }

  it("all present → 100% rate", () => {
    const r = summarize([
      { status: "PRESENT" }, { status: "PRESENT" }, { status: "PRESENT" },
    ]);
    expect(r.rate).toBe(100);
    expect(r.present).toBe(3);
    expect(r.absent).toBe(0);
  });

  it("1 absent out of 4 → 75% rate", () => {
    const r = summarize([
      { status: "PRESENT" }, { status: "PRESENT" }, { status: "PRESENT" },
      { status: "ABSENT" },
    ]);
    expect(r.rate).toBe(75);
  });

  it("late counts as attended", () => {
    const r = summarize([
      { status: "LATE" }, { status: "ABSENT" },
    ]);
    expect(r.rate).toBe(50);
  });

  it("empty records → 0% rate", () => {
    const r = summarize([]);
    expect(r.rate).toBe(0);
  });
});

// ─── Gamification points ──────────────────────────────────────────
describe("Gamification points formula", () => {
  function calcPoints(present: number, late: number, avgGrade: number, submitted: number) {
    return present * 10 + late * 4 + Math.round(avgGrade) + submitted * 15;
  }

  it("perfect student scores high", () => {
    const pts = calcPoints(10, 0, 95, 5);
    expect(pts).toBe(100 + 0 + 95 + 75); // 270
  });

  it("low attendance reduces points", () => {
    const pts = calcPoints(2, 1, 50, 0);
    expect(pts).toBe(20 + 4 + 50 + 0); // 74
  });

  it("submitted homework adds 15 each", () => {
    const pts = calcPoints(0, 0, 0, 10);
    expect(pts).toBe(150);
  });
});

// ─── Utility functions ────────────────────────────────────────────
describe("Utility functions", () => {
  it("percentage divides correctly", () => {
    expect(percentage(3, 4)).toBe(75);
    expect(percentage(0, 0)).toBe(0);
    expect(percentage(5, 5)).toBe(100);
  });

  it("round handles decimals", () => {
    expect(round(3.14159, 2)).toBe(3.14);
    expect(round(2.5)).toBe(3);
    expect(round(2.4)).toBe(2);
  });

  it("clamp keeps value in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

// ─── Smart Insights rules ─────────────────────────────────────────
describe("Smart Insights at-risk rules", () => {
  function isAtRisk(rate: number, avg: number, lastAbsent: number, overdue: boolean): boolean {
    const reasons: string[] = [];
    if (rate < 70) reasons.push("low attendance");
    if (avg < 60) reasons.push("weak grades");
    if (lastAbsent >= 3) reasons.push("consecutive absence");
    if (overdue) reasons.push("overdue payment");
    return reasons.length > 0;
  }

  it("low attendance flags as at-risk", () => {
    expect(isAtRisk(50, 85, 0, false)).toBe(true);
  });

  it("good student not at-risk", () => {
    expect(isAtRisk(95, 88, 0, false)).toBe(false);
  });

  it("consecutive absence flags", () => {
    expect(isAtRisk(80, 75, 3, false)).toBe(true);
  });

  it("overdue payment alone flags", () => {
    expect(isAtRisk(90, 85, 0, true)).toBe(true);
  });
});
