import { describe, expect, it } from "vitest";
import { calculateRiskScore } from "@/services/insights";

describe("predictive BI risk scoring", () => {
  it("treats a student with no attendance or grades as safe without NaN", () => {
    const result = calculateRiskScore({ attendance: [], grades: [], exams: [] });
    expect(result).toMatchObject({ score: 0, category: "safe", severity: "low", attendanceRate: 0, academicAverage: 0 });
    expect(result.reasons).toEqual([]);
    expect(Number.isNaN(result.score)).toBe(false);
  });

  it("flags a warning for a sustained but not critical attendance issue", () => {
    const result = calculateRiskScore({
      attendance: [
        { status: "PRESENT", recorded_at: "2026-08-01" },
        { status: "ABSENT", recorded_at: "2026-08-08" },
      ],
      grades: [],
      exams: [],
    });
    expect(result.category).toBe("warning");
    expect(result.reasons.some((reason) => reason.includes("حضور"))).toBe(true);
  });

  it("flags critical when recent absences and low academic performance combine", () => {
    const result = calculateRiskScore({
      attendance: [
        { status: "PRESENT", recorded_at: "2026-08-01" },
        { status: "ABSENT", recorded_at: "2026-08-08" },
        { status: "ABSENT", recorded_at: "2026-08-15" },
      ],
      exams: [{ id: "exam-1", max_score: 100 }, { id: "exam-2", max_score: 100 }],
      grades: [{ exam_id: "exam-1", score: 45 }, { exam_id: "exam-2", score: 40 }],
    });
    expect(result.category).toBe("critical");
    expect(result.severity).toBe("high");
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.reasons.some((reason) => reason.includes("درجات"))).toBe(true);
  });
});
