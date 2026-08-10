/**
 * Gamification — RLS-backed. All data via fetchTableRLS.
 */
import { fetchTableRLS } from "./_shared";
import { percentage, round } from "@/lib/utils";

export interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
  hint: string;
}

export interface StudentScore {
  studentId: string;
  name: string;
  points: number;
  streak: number;
  attendanceRate: number;
  avgGrade: number;
  rank: number;
  badges: Badge[];
}

const BADGE_DEFS: Omit<Badge, "earned">[] = [
  { id: "on_fire", label: "On Fire", icon: "🔥", hint: "5+ present in a row" },
  { id: "perfect_attendance", label: "Perfect Attendance", icon: "⭐", hint: "≥95% attendance" },
  { id: "top_scorer", label: "Top Scorer", icon: "🏆", hint: "≥90% average grade" },
  { id: "homework_hero", label: "Homework Hero", icon: "📚", hint: "5+ submitted" },
  { id: "consistent", label: "Consistent", icon: "🎯", hint: "10+ attendances" },
];

export async function computeScore(studentId: string): Promise<Omit<StudentScore, "rank">> {
  // RLS-backed fetch for all data.
  const [attendance, allGrades, submissions, students] = await Promise.all([
    fetchTableRLS<any>("attendance"),
    fetchTableRLS<any>("grades"),
    fetchTableRLS<any>("homework_submissions"),
    fetchTableRLS<any>("students"),
  ]);

  const att = attendance.filter((a: any) => a.student_id === studentId);
  const present = att.filter((a: any) => a.status === "PRESENT").length;
  const late = att.filter((a: any) => a.status === "LATE").length;

  const grades = allGrades.filter((g: any) => g.student_id === studentId);
  const avgGrade = grades.length
    ? round(grades.reduce((s, g) => s + ((g.score / (g.max_score || 50)) * 100), 0) / grades.length, 0)
    : 0;

  const subs = submissions.filter((s: any) => s.student_id === studentId);
  const submitted = subs.filter((s: any) => s.status !== "PENDING").length;

  // streak: consecutive PRESENT from end
  let streak = 0;
  for (let i = att.length - 1; i >= 0; i--) {
    if (att[i].status === "PRESENT") streak++;
    else break;
  }

  const attendanceRate = att.length ? percentage(present + late, att.length) : 0;
  const points = present * 10 + late * 4 + Math.round(avgGrade) + submitted * 15;

  const student = students.find((s: any) => s.id === studentId);
  const badges: Badge[] = BADGE_DEFS.map((b) => {
    let earned = false;
    if (b.id === "on_fire") earned = streak >= 5;
    if (b.id === "perfect_attendance") earned = attendanceRate >= 95 && att.length >= 3;
    if (b.id === "top_scorer") earned = avgGrade >= 90 && grades.length > 0;
    if (b.id === "homework_hero") earned = submitted >= 5;
    if (b.id === "consistent") earned = att.length >= 10;
    return { ...b, earned };
  });

  return {
    studentId,
    name: student ? `${student.first_name} ${student.last_name}` : "—",
    points, streak, attendanceRate, avgGrade: avgGrade, badges,
  };
}

export async function getLeaderboard(limit = 10): Promise<StudentScore[]> {
  const students = await fetchTableRLS<any>("students");
  const scores = await Promise.all(students.map((s: any) => computeScore(s.id)));
  scores.sort((a, b) => b.points - a.points);
  return scores.slice(0, limit).map((s, i) => ({ ...s, rank: i + 1 }));
}

export async function getStudentRank(studentId: string): Promise<StudentScore | null> {
  const students = await fetchTableRLS<any>("students");
  const scores = await Promise.all(students.map((s: any) => computeScore(s.id)));
  scores.sort((a, b) => b.points - a.points);
  const idx = scores.findIndex((s) => s.studentId === studentId);
  if (idx === -1) return null;
  return { ...scores[idx], rank: idx + 1 };
}
