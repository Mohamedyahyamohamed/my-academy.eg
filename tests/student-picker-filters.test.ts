import { describe, expect, it } from "vitest";
import type { Student } from "@/types";
import { filterAvailableStudents, toggleVisibleSelection } from "@/lib/student-filters";

const students = [
  { id: "1", first_name: "Ahmed", last_name: "Ali", grade: "الصف الأول الثانوي", gender: "male" },
  { id: "2", first_name: "Mona", last_name: "Hassan", grade: "الصف الأول الثانوي", gender: "female" },
  { id: "3", first_name: "Adam", last_name: "Kota", grade: "الصف الأول الإعدادي", gender: "male" },
  { id: "4", first_name: "Nour", last_name: "Saleh", grade: null, gender: null },
] as Student[];

describe("student picker filters", () => {
  it("selects all filtered students while preserving hidden selections", () => {
    expect(toggleVisibleSelection(["hidden"], ["a", "b"])).toEqual(["hidden", "a", "b"]);
    expect(toggleVisibleSelection(["hidden", "a", "b"], ["a", "b"])).toEqual(["hidden"]);
  });

  it("filters by a case-insensitive name query", () => {
    expect(filterAvailableStudents(students, "mOnA", "", "all").map((student) => student.id)).toEqual(["2"]);
  });

  it("filters by grade and gender together", () => {
    expect(filterAvailableStudents(students, "", "الصف الأول الثانوي", "female").map((student) => student.id)).toEqual(["2"]);
  });

  it("supports all values and keeps students without grade or gender visible", () => {
    expect(filterAvailableStudents(students, "", "", "all")).toHaveLength(4);
    expect(filterAvailableStudents(students, "", "", "male").map((student) => student.id)).toEqual(["1", "3"]);
  });

  it("returns no rows when the combined filters do not match", () => {
    expect(filterAvailableStudents(students, "Mona", "الصف الأول الإعدادي", "female")).toEqual([]);
  });
});
