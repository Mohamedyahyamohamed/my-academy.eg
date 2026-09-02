import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { StudentProfileTabs } from "@/components/students/student-profile-tabs";
import { StudentNotes } from "@/components/students/student-notes";
import { AttendanceBadge, PaymentStatusBadge, HomeworkBadge } from "@/components/shared/badges";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  StudentsService,   childSummary,
  studentLessons, requireScopedRole,
  PaymentsService, GradesService, HomeworkService, MiscService,
} from "@/services";
import { collections } from "@/services/data/store";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { performanceLevel, performanceColor, performanceLabel } from "@/lib/constants";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ParentChildPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireScopedRole("PARENT");
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  // Authorization via DB (مش الكاش)
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = await createServerSupabaseClient();
  const { data: profileParent } = await client
    .from("parents")
    .select("*")
    .eq("academy_id", user.academy_id)
    .eq("profile_id", user.id)
    .maybeSingle();
  const { data: emailParent } = profileParent
    ? { data: null }
    : await client
      .from("parents")
      .select("*")
      .eq("academy_id", user.academy_id)
      .ilike("email", user.email)
      .maybeSingle();
  const parent = profileParent ?? emailParent;
  const { data: childDB } = parent
    ? await client
      .from("students")
      .select("*")
      .eq("academy_id", user.academy_id)
      .eq("id", params.id)
      .eq("parent_id", parent.id)
      .maybeSingle()
    : { data: null };
  if (!childDB || !parent) notFound();
  const child = childDB as any;

  const { data: memberships } = await client
    .from("group_students")
    .select("group_id")
    .eq("student_id", child.id)
    .limit(1000);
  const groupIds = (memberships ?? []).map((row: any) => row.group_id).filter(Boolean);
  const { data: groupRows } = groupIds.length
    ? await client.from("groups").select("*").eq("academy_id", user.academy_id).in("id", groupIds).limit(1000)
    : { data: [] as any[] };
  const groups = groupRows ?? [];
  const summary = await childSummary(child.id, user.academy_id, groups as any).catch(() => ({
    attendanceRate: 0,
    attendanceRecorded: 0,
    averageGrade: 0,
    outstanding: 0,
    upcomingLesson: null,
    pendingHomework: 0,
  }));
  const allChildLessons = await studentLessons(child.id, user.academy_id, groups as any);
  const childLessonIds = allChildLessons.map((lesson: any) => lesson.id).filter(Boolean);
  const { data: attendanceRows } = childLessonIds.length
    ? await client
      .from("attendance")
      .select("*")
      .eq("student_id", child.id)
      .in("lesson_id", childLessonIds)
      .limit(1000)
    : { data: [] as any[] };
  const att = { byLesson: attendanceRows ?? [] };
  const [paymentsPage, gradesPage, homework] = await Promise.all([
    PaymentsService.listPayments({ studentId: child.id, pageSize: 50 }, user.academy_id),
    GradesService.listGrades({ studentId: child.id, pageSize: 50 }, user.academy_id),
    HomeworkService.homeworkForStudent(child.id, user.academy_id),
  ]);
  const payments = paymentsPage.items;
  const grades = gradesPage.items;
  const exams = await GradesService.listExams(user.academy_id);
  const lessons = allChildLessons.slice(0, 10);
  const notes = MiscService.notesForStudent(child.id, user.academy_id);

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={`${child.first_name} ${child.last_name}`}
        description={`${child.grade} · ${groups.map((g) => g.name.split(" — ")[0]).join(", ") || (en ? "No groups" : "لا توجد مجموعات")}`}
        breadcrumbs={[{ label: en ? "My children" : "أبنائي", href: "/parent/children" }, { label: fullName(child) }]}
      >
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/parent/children/${child.id}/report`} target="_blank"><FileText className="h-4 w-4" /> {en ? "Printable report" : "تقرير قابل للطباعة"}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/parent"><ArrowLeft className="h-4 w-4" /> {en ? "Back" : "رجوع"}</Link>
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center">
          <StudentAvatar name={fullName(child)} size="lg" />
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
            <Mini label={en ? "Attendance" : "الحضور"} value={summary.attendanceRecorded ? `${summary.attendanceRate}%` : (en ? "Not recorded" : "لم يُسجّل بعد")} />
            <Mini label={en ? "Average grade" : "متوسط الدرجات"} value={`${summary.averageGrade}%`} />
            <Mini label={en ? "Pending homework" : "واجبات معلّقة"} value={String(summary.pendingHomework)} />
            <Mini label={en ? "Outstanding" : "المتبقي"} value={formatCurrency(summary.outstanding)} />
          </div>
        </CardContent>
      </Card>

      <StudentProfileTabs
        overview={
          <Card>
            <CardHeader><CardTitle className="text-base">{en ? "Performance summary" : "ملخص الأداء"}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {summary.upcomingLesson ? <>{en ? "Upcoming lesson:" : "الحصة القادمة:"} <span className="font-medium text-foreground">{summary.upcomingLesson}</span></> : (en ? "No upcoming lessons." : "مفيش حصص قادمة.")}
            </CardContent>
          </Card>
        }
        attendance={
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>{en ? "Date" : "التاريخ"}</TableHead><TableHead>{en ? "Group" : "المجموعة"}</TableHead><TableHead>{en ? "Status" : "الحالة"}</TableHead></TableRow></TableHeader>
              <TableBody>
                {att.byLesson.slice().reverse().map((a) => {
                  const lesson = lessons.find((l: any) => l.id === a.lesson_id) ?? collections().lessons.find((l) => l.id === a.lesson_id);
                  const group = lesson ? groups.find((g: any) => g.id === lesson.group_id) : undefined;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{lesson ? formatDate(lesson.date, undefined, en ? "en-EG" : "ar-EG") : "—"}</TableCell>
                      <TableCell className="text-sm">{group?.name ?? "—"}</TableCell>
                      <TableCell><AttendanceBadge status={a.status} /></TableCell>
                    </TableRow>
                  );
                })}
                {att.byLesson.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">{en ? "No attendance records yet." : "لا يوجد سجل حضور بعد."}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        }
        payments={
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>{en ? "Month" : "الشهر"}</TableHead><TableHead>{en ? "Due" : "المستحق"}</TableHead><TableHead>{en ? "Paid" : "المدفوع"}</TableHead><TableHead>{en ? "Outstanding" : "المتبقي"}</TableHead><TableHead>{en ? "Status" : "الحالة"}</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.month}</TableCell>
                    <TableCell>{formatCurrency(p.amount_due)}</TableCell>
                    <TableCell>{formatCurrency(p.amount_paid)}</TableCell>
                    <TableCell className={p.remaining > 0 ? "text-rose-600" : ""}>{formatCurrency(p.remaining)}</TableCell>
                    <TableCell><PaymentStatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">{en ? "No payments." : "لا توجد مصروفات."}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        }
        grades={
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>{en ? "Exam" : "الاختبار"}</TableHead><TableHead>{en ? "Score" : "الدرجة"}</TableHead><TableHead>%</TableHead><TableHead>{en ? "Rating" : "التقدير"}</TableHead></TableRow></TableHeader>
              <TableBody>
                {grades.map((g) => {
                  const exam = exams.find((e) => e.id === g.exam_id);
                  const lvl = g.level ?? performanceLevel(g.percentage ?? 0);
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{exam?.name ?? "—"}</TableCell>
                      <TableCell>{g.score}/{exam?.max_score}</TableCell>
                      <TableCell>{Math.round(g.percentage ?? 0)}%</TableCell>
                      <TableCell><Badge className={performanceColor(lvl)}>{performanceLabel(lvl)}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {grades.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">{en ? "No grades yet." : "لا توجد درجات بعد."}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        }
        homework={
          <div className="space-y-3">
            {homework.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{en ? "No assigned homework." : "لا توجد واجبات مسندة."}</p>}
            {homework.map((s) => (
              <Card key={s.id}><CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{s.homework?.title}</p>
                    <p className="text-sm text-muted-foreground">{s.homework?.description}</p>
                    {s.feedback && <p className="mt-2 rounded-md bg-muted p-2 text-xs"><span className="font-medium">{en ? "Teacher feedback:" : "ملاحظات المعلّم:"}</span> {s.feedback}</p>}
                  </div>
                  <div className="text-right"><HomeworkBadge status={s.status} /><p className="mt-1 text-xs text-muted-foreground">{en ? "Due:" : "موعد التسليم:"} {formatDate(s.homework?.deadline, undefined, en ? "en-EG" : "ar-EG")}</p></div>
                </div>
              </CardContent></Card>
            ))}
          </div>
        }
        lessons={
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>{en ? "Date" : "التاريخ"}</TableHead><TableHead>{en ? "Topic" : "الموضوع"}</TableHead><TableHead>{en ? "Group" : "المجموعة"}</TableHead></TableRow></TableHeader>
              <TableBody>
                {lessons.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")}</TableCell>
                    <TableCell className="font-medium">{l.topic}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.group?.name}</TableCell>
                  </TableRow>
                ))}
                {lessons.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">{en ? "No lessons." : "لا توجد حصص."}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        }
        notes={<StudentNotes studentId={child.id} notes={notes} readOnly />}
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
