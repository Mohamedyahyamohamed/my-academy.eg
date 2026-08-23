import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const reportPath = path.resolve(__dirname, "../app/(app)/students/[id]/report/page.tsx");
const report = fs.readFileSync(reportPath, "utf8");

describe("student parent report empty-state safety", () => {
  it("does not require an in-memory academy snapshot to render", () => {
    expect(report).toContain("getAcademyAsync(detail.academy_id)");
    expect(report).toContain('let academyName = "MYAcademy"');
    expect(report).toContain("catch {");
    expect(report).not.toContain("MiscService.getAcademy();");
  });

  it("normalizes missing service results and missing student stats", () => {
    expect(report).toContain("studentAttendanceSummary(params.id) ??");
    expect(report).toContain("listPayments({ studentId: params.id, pageSize: 50 }).catch(() => null)");
    expect(report).toContain("listGrades({ studentId: params.id, pageSize: 50 }).catch(() => null)");
    expect(report).toContain("Array.isArray(paymentResult?.items)");
    expect(report).toContain("Array.isArray(gradeResult?.items)");
    expect(report).toContain("const stats = detail.stats ??");
  });

  it("renders explicit empty states for grades, payments, and missing values", () => {
    expect(report).toContain("grades.length === 0");
    expect(report).toContain("payments.length === 0");
    expect(report).toContain("مفيش درجات مسجّلة");
    expect(report).toContain("مفيش مصاريف مسجّلة");
    expect(report).toContain('detail.grade || "—"');
    expect(report).toContain('detail.school || "—"');
  });
});
