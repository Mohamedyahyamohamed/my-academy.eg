import type { Student } from "@/types";
import { gradeMatches } from "@/lib/student-grades";

export type GenderFilter = "all" | "male" | "female";

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
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
