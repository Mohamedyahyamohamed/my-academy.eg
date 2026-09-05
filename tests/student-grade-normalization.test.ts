import { describe, expect, it } from "vitest";
import { GLOBAL_GRADE_OPTIONS, gradeMatches, normalizeGrade } from "@/lib/student-grades";
import { filterAvailableStudents } from "@/lib/student-filters";

const student = (grade: string) => ({
  id: grade,
  academy_id: "academy-1",
  first_name: "Test",
  last_name: "Student",
  date_of_birth: null,
  gender: "male" as const,
  phone: null,
  email: null,
  parent_id: null,
  school: null,
  grade,
  notes: null,
  status: "ACTIVE" as const,
  enrolled_at: "2026-01-01T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

describe("global grade vocabulary", () => {
  it("contains exactly the approved grade options", () => {
    expect(GLOBAL_GRADE_OPTIONS).toEqual([
      "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
      "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
      "الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي",
      "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي",
      "مرحلة جامعية", "خريج",
    ]);
  });

  it("maps known imported spellings without guessing unknown values", () => {
    expect(normalizeGrade("اولى ثانوي")).toBe("الصف الأول الثانوي");
    expect(normalizeGrade("الصف الاول الثانوى")).toBe("الصف الأول الثانوي");
    expect(normalizeGrade("الصف الاول الثانوي أزهري")).toBe("الصف الأول الثانوي");
    expect(normalizeGrade("تالته اعدادي")).toBe("الصف الثالث الإعدادي");
    expect(normalizeGrade("الصف الثاني البكالوريا")).toBe("الصف الثاني الثانوي");
  });

  it("matches legacy spellings to the selected canonical grade", () => {
    expect(gradeMatches("الصف الاول الثانوى", "الصف الأول الثانوي")).toBe(true);
    expect(gradeMatches("الصف الثالث الاعدادي", "الصف الثالث الإعدادي")).toBe(true);
    expect(gradeMatches("الصف الثاني البكالوريا", "الصف الثاني الثانوي")).toBe(true);
  });

  it("uses canonical matching in the group student picker", () => {
    const result = filterAvailableStudents(
      [student("الصف الاول الثانوى"), student("الصف الأول الإعدادي")],
      "",
      "الصف الأول الثانوي",
      "all",
    );
    expect(result.map((row) => row.grade)).toEqual(["الصف الاول الثانوى"]);
  });
});
