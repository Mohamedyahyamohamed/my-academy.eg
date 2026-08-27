/**
 * Notifications service.
 */
import type { AppNotification, NotificationType, SessionUser } from "@/types";
import { collections } from "./data/store";
import { byAcademy, fetchTableRLS } from "./_shared";
import { currentAcademyId } from "./session";

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  const items = await fetchTableRLS<AppNotification>("notifications");
  return items
    .filter((n) => n.user_id === userId || n.user_id === null)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function unreadCount(userId: string): Promise<number> {
  const items = await fetchTableRLS<AppNotification>("notifications");
  return items.filter(
    (n) => (n.user_id === userId || n.user_id === null) && !n.read,
  ).length;
}

export interface WhatsAppLog {
  id: string;
  academy_id: string;
  parent_id: string | null;
  student_id: string | null;
  event_type: string;
  template_name: string | null;
  recipient_phone_last4: string | null;
  external_message_id: string | null;
  status: string;
  failure_reason: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export async function listWhatsAppLogs(user: SessionUser): Promise<WhatsAppLog[]> {
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return [];
  const rows = await fetchTableRLS<WhatsAppLog>("whatsapp_message_logs", user.academy_id);
  return rows.filter((row) => row.academy_id === user.academy_id).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 200);
}

/**
 * Generate actionable teacher alerts from live academy data.
 * Pushes internal notifications for: repeated absences, low grades,
 * overdue payments, and new homework awaiting review.
 * Deduplicates against existing unread alerts of the same kind+target.
 */
export interface TeacherAlertSummary {
  absenceRepeat: number;
  lowGrade: number;
  paymentOverdue: number;
  homeworkNew: number;
  total: number;
}

export async function generateTeacherAlerts(teacherId: string): Promise<TeacherAlertSummary> {
  const c = collections();
  const academyId = currentAcademyId();

  // Teacher's groups -> student ids
  const groupIds = c.groups
    .filter((g) => g.academy_id === academyId && g.teacher_id === teacherId)
    .map((g) => g.id);
  const studentIds = new Set(
    c.groupStudents
      .filter((gs) => groupIds.includes(gs.group_id))
      .map((gs) => gs.student_id),
  );
  if (studentIds.size === 0) {
    return { absenceRepeat: 0, lowGrade: 0, paymentOverdue: 0, homeworkNew: 0, total: 0 };
  }

  const students = c.students.filter((s) => studentIds.has(s.id));
  const studentName = (id: string) =>
    students.find((s) => s.id === id);
  const nameOf = (id: string) => {
    const s = studentName(id);
    return s ? `${s.first_name} ${s.last_name}` : "طالب";
  };
  const groupName = (id: string) => {
    const g = c.groups.find((x) => x.id === id);
    return g ? g.name : "";
  };

  // existing unread alerts keyed by type+student to avoid duplicates
  const existing = new Set(
    c.notifications
      .filter((n) => n.user_id === teacherId && !n.read && n.link)
      .map((n) => `${n.type}::${n.link}`),
  );
  const already = (type: NotificationType, studentId: string) =>
    existing.has(`${type}::student:${studentId}`);

  const summary: TeacherAlertSummary = {
    absenceRepeat: 0,
    lowGrade: 0,
    paymentOverdue: 0,
    homeworkNew: 0,
    total: 0,
  };

  // 1) Repeated absences: >= 3 recorded absences
  const ABSENCE_THRESHOLD = 3;
  const absences = new Map<string, number>();
  for (const rec of c.attendance) {
    if (rec.status === "ABSENT" && studentIds.has(rec.student_id)) {
      absences.set(rec.student_id, (absences.get(rec.student_id) ?? 0) + 1);
    }
  }
  for (const [sid, count] of absences) {
    if (count >= ABSENCE_THRESHOLD && !already("absence_repeat", sid)) {
      pushNotification(
        teacherId,
        "absence_repeat",
        `غياب متكرر: ${nameOf(sid)}`,
        `تغيب الطالب ${count} مرات. يُنصح بالتواصل مع ولي الأمر.`,
        `student:${sid}`,
      );
      summary.absenceRepeat++;
    }
  }

  // 2) Low grades: average < 50% of exam max
  const LOW_GRADE_PCT = 50;
  const examMax = new Map(c.exams.map((e) => [e.id, e.max_score ?? 100]));
  const gradeSums = new Map<string, { sum: number; max: number; n: number }>();
  for (const g of c.grades) {
    if (!studentIds.has(g.student_id)) continue;
    const max = examMax.get(g.exam_id) ?? 100;
    const cur = gradeSums.get(g.student_id) ?? { sum: 0, max: 0, n: 0 };
    cur.sum += g.score;
    cur.max += max;
    cur.n += 1;
    gradeSums.set(g.student_id, cur);
  }
  for (const [sid, agg] of gradeSums) {
    const pct = agg.max > 0 ? (agg.sum / agg.max) * 100 : 100;
    if (pct < LOW_GRADE_PCT && !already("low_grade", sid)) {
      pushNotification(
        teacherId,
        "low_grade",
        `درجة منخفضة: ${nameOf(sid)}`,
        `متوسط درجات الطالب ${Math.round(pct)}% (أقل من ${LOW_GRADE_PCT}%).`,
        `student:${sid}`,
      );
      summary.lowGrade++;
    }
  }

  // 3) Overdue payments
  const today = new Date().toISOString().slice(0, 10);
  for (const p of c.payments) {
    if (!studentIds.has(p.student_id)) continue;
    if (p.remaining > 0 && p.due_date && p.due_date < today) {
      if (!already("payment_overdue", p.student_id)) {
        pushNotification(
          teacherId,
          "payment_overdue",
          `دفعة متأخرة: ${nameOf(p.student_id)}`,
          `متبقي ${p.remaining} مستحق من ${p.due_date}.`,
          `student:${p.student_id}`,
        );
        summary.paymentOverdue++;
      }
    }
  }

  // 4) New homework awaiting review
  const submissions = (c as any).submissions ?? (c as any).homework_submissions ?? [];
  const reviewedSet = new Set(submissions.filter((s: any) => s.reviewed_at).map((s: any) => s.id));
  for (const sub of submissions) {
    if (sub.reviewed_at || sub.status === "REVIEWED") continue;
    if (!studentIds.has(sub.student_id)) continue;
    if (!already("homework_assigned", sub.student_id)) {
      const hw = c.homework.find((h) => h.id === sub.homework_id);
      pushNotification(
        teacherId,
        "homework_assigned",
        `واجب جديد يحتاج تصحيح: ${nameOf(sub.student_id)}`,
        hw ? `سلّم واجب «${hw.title}» ويحتاج مراجعة.` : `سلّم واجب جديد ويحتاج مراجعة.`,
        `student:${sub.student_id}`,
      );
      summary.homeworkNew++;
    }
  }

  summary.total =
    summary.absenceRepeat + summary.lowGrade + summary.paymentOverdue + summary.homeworkNew;
  return summary;
}

export function markRead(id: string): void {
  const n = collections().notifications.find((x) => x.id === id);
  if (n) n.read = true;
}

export function markAllRead(userId: string): void {
  for (const n of collections().notifications) {
    if (n.user_id === userId || n.user_id === null) n.read = true;
  }
}

export function pushNotification(
  userId: string | null,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
): AppNotification {
  const n: AppNotification = {
    id: crypto.randomUUID(),
    academy_id: currentAcademyId(),
    user_id: userId,
    type,
    title,
    message,
    link: link ?? null,
    read: false,
    created_at: new Date().toISOString(),
  };
  collections().notifications.unshift(n);
  return n;
}
