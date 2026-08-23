import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { studentQrValue, studentIdFromQrValue } from "@/lib/student-qr";

describe("batch QR print cards", () => {
  it("encodes the existing student QR contract and round-trips the student id", () => {
    const value = studentQrValue("student-123");
    expect(value).toContain("/checkin?studentId=student-123");
    expect(studentIdFromQrValue(value)).toBe("student-123");
  });

  it("keeps the print page tenant-scoped through the group detail lookup", () => {
    const page = readFileSync(resolve(process.cwd(), "app/(app)/groups/[id]/qr-print/page.tsx"), "utf8");
    expect(page).toContain('requireScopedRole("ADMIN", "TEACHER")');
    expect(page).toContain("getGroupDetail(params.id, user.academy_id)");
    expect(page).toContain('student.status !== "ARCHIVED"');
    expect(page).toContain("student.is_active !== false");
  });

  it("contains A4 print rules for a two-column, five-row card grid", () => {
    const component = readFileSync(resolve(process.cwd(), "components/qr/qr-print-cards.tsx"), "utf8");
    expect(component).toContain("@page");
    expect(component).toContain("size: A4 portrait");
    expect(component).toContain("grid-template-columns: repeat(2");
    expect(component).toContain("height: 52mm");
    expect(component).toContain("break-inside: avoid");
    expect(component).toContain("window.print()");
  });
});
