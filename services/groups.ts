/**
 * Groups service.
 */
import type { Group, PaginatedResult } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId } from "./session";
import { persistInsert, persistUpdate, persistDelete } from "./data/store";
import {
  getCourse,
  getTeacher,
  lessonsForGroup,
  studentsInGroup,
  byAcademy,
  applyTeacherGroupScope,
  teacherGroupScope,
  fetchTableRLS,
} from "./_shared";
import { percentage } from "@/lib/utils";
import { attendanceForStudent } from "./_shared";
import { canCreate } from "./saas";

function studentCount(groupId: string) {
  return studentsInGroup(groupId).length;
}

function attach(g: Group): Group {
  return {
    ...g,
    course: getCourse(g.course_id),
    teacher: getTeacher(g.teacher_id),
    student_count: studentCount(g.id),
  };
}

export async function listGroups(search = ""): Promise<Group[]> {
  let items = applyTeacherGroupScope(await fetchTableRLS<Group>("groups"));
  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        getCourse(g.course_id)?.name.toLowerCase().includes(q),
    );
  }
  return items.map(attach);
}

export async function getGroup(id: string): Promise<Group | null> {
  const items = await fetchTableRLS<Group>("groups");
  const g = items.find((x) => x.id === id);
  return g ? attach(g) : null;
}

export interface GroupInput {
  name: string;
  course_id: string;
  teacher_id: string;
  monthly_fee: number;
  schedule: string;
  room?: string | null;
  status?: "ACTIVE" | "INACTIVE";
}

function gid() {
  return crypto.randomUUID();
}

export async function createGroup(input: GroupInput): Promise<Group> {
  const check = canCreate("groups");
  if (!check.allowed) {
    throw new Error(`Limit reached: ${check.current}/${check.limit} groups. Upgrade your plan.`);
  }
  const now = new Date().toISOString();
  const g: Group = {
    id: gid(),
    academy_id: currentAcademyId(),
    name: input.name,
    course_id: input.course_id,
    teacher_id: input.teacher_id,
    monthly_fee: Math.max(0, input.monthly_fee),
    schedule: input.schedule,
    room: input.room ?? null,
    status: input.status ?? "ACTIVE",
    created_at: now,
    updated_at: now,
  };
  collections().groups.push(g);
  await persistInsert("groups", g);
  return attach(g);
}

export function updateGroup(id: string, input: Partial<GroupInput>): Group | null {
  const g = collections().groups.find((x) => x.id === id);
  if (!g) return null;
  Object.assign(g, {
    ...input,
    monthly_fee:
      input.monthly_fee !== undefined ? Math.max(0, input.monthly_fee) : g.monthly_fee,
    updated_at: new Date().toISOString(),
  });
  void persistUpdate("groups", id, { ...input, updated_at: new Date().toISOString() });
  return attach(g);
}

export function deleteGroup(id: string): boolean {
  const before = collections().groups.length;
  collections().groups = collections().groups.filter((g) => g.id !== id);
  collections().groupStudents = collections().groupStudents.filter(
    (gs) => gs.group_id !== id,
  );
  void persistDelete("groups", { id });
  return collections().groups.length < before;
}

export function addStudent(groupId: string, studentId: string): boolean {
  const exists = collections().groupStudents.some(
    (gs) => gs.group_id === groupId && gs.student_id === studentId,
  );
  if (exists) return false;
  const row = {
    group_id: groupId,
    student_id: studentId,
    joined_at: new Date().toISOString(),
  };
  collections().groupStudents.push(row);
  void persistInsert("group_students", row);
  return true;
}

export function removeStudent(groupId: string, studentId: string): boolean {
  const before = collections().groupStudents.length;
  collections().groupStudents = collections().groupStudents.filter(
    (gs) => !(gs.group_id === groupId && gs.student_id === studentId),
  );
  void persistDelete("group_students", { group_id: groupId, student_id: studentId });
  return collections().groupStudents.length < before;
}

export interface GroupDetail extends Group {
  students: ReturnType<typeof studentsInGroup>;
  lessons: ReturnType<typeof lessonsForGroup>;
  attendanceRate: number;
}

export async function getGroupDetail(id: string): Promise<GroupDetail | null> {
  const g = await getGroup(id);
  if (!g) return null;
  // Teachers can only access their own groups.
  const scope = teacherGroupScope();
  if (scope && !scope.has(id)) return null;
  const students = studentsInGroup(id);
  const lessons = lessonsForGroup(id);
  // attendance rate across the group
  const att = collections().attendance.filter((a) =>
    lessons.some((l) => l.id === a.lesson_id),
  );
  const present = att.filter((a) => a.status !== "ABSENT").length;
  const rate = att.length ? percentage(present, att.length) : 0;
  return { ...g, students, lessons, attendanceRate: rate };
}

/** Average grade for a group across its exams. */
export function groupAverageGrade(groupId: string): number {
  const examIds = collections()
    .exams.filter((e) => e.group_id === groupId)
    .map((e) => e.id);
  const grades = collections().grades.filter((g) =>
    examIds.includes(g.exam_id),
  );
  if (!grades.length) return 0;
  const exams = collections().exams;
  let sumPct = 0;
  for (const grade of grades) {
    const exam = exams.find((e) => e.id === grade.exam_id);
    if (exam) sumPct += (grade.score / exam.max_score) * 100;
  }
  return Math.round(sumPct / grades.length);
}
