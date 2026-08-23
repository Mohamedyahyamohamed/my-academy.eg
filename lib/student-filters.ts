import type { Student } from "@/types";
import { gradeMatches } from "@/lib/student-grades";

export type GenderFilter = "all" | "male" | "female";

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

export function toggleVisibleSelection(selectedIds: string[], visibleIds: string[]): string[] {
  const visible = new Set(visibleIds);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  if (allVisibleSelected) return selectedIds.filter((id) => !visible.has(id));
  return Array.from(new Set([...selectedIds, ...visibleIds]));
}

export function filterAvailableStudents(
  students: Student[],
  nameQuery: string,
  gradeFilter: string,
  genderFilter: GenderFilter,
) {
  const query = normalizeSearch(nameQuery);
  return students.filter((student) => {
    const fullName = normalizeSearch(`${student.first_name} ${student.last_name}`);
    const matchesName = !query || fullName.includes(query);
    const matchesGrade = gradeMatches(student.grade, gradeFilter);
    const matchesGender = genderFilter === "all" || student.gender === genderFilter;
    return matchesName && matchesGrade && matchesGender;
  });
}
