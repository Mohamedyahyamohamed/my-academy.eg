import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { notFound, redirect } from "next/navigation";
import {
  CalendarCheck,
  GraduationCap,
  Wallet,
  TrendingDown,
  Phone,
  Mail,
  School,
  User,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { StudentStatusBadge, PaymentStatusBadge, AttendanceBadge, HomeworkBadge } from "@/components/shared/badges";
import { StudentProfileTabs } from "@/components/students/student-profile-tabs";
import { StudentNotes } from "@/components/students/student-notes";
import { ParentConsentLink } from "@/components/students/parent-consent-link";
import { EditStudentDialog } from "@/components/students/student-dialogs";
import { StudentQrCard } from "@/components/attendance/student-qr-card";
import { StudentGroupTransfer } from "@/components/students/student-group-transfer";
import { PortalCredentialsDialog } from "@/components/students/portal-credentials-dialog";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { CreatePaymentDialog, RecordPaymentDialog } from "@/components/payments/payment-dialogs";
import { TrendArea, LineTrend } from "@/components/charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  StudentsService,
  GroupsService,
  AttendanceService,
  PaymentsService,
  GradesService,
  HomeworkService,
  MiscService,
  loadCurrentUser,
  roleHome,
} from "@/services";
import { setRequestContext } from "@/services/request-context";
import { listAuditLogs } from "@/services/audit";
import { groupsForStudent } from "@/services/_shared";
import { collections } from "@/services/data/store";
import { formatCurrency, formatDate, formatClockTime } from "@/lib/utils";
import { lessonWallClockMinute } from "@/services/lessons";
import { performanceLevel, performanceColor, performanceLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const user = await loadCurrentUser();
  if (!user) redirect("/login");
  setRequestContext(user);
  const isPlatformOwner = user.role === "SUPER_ADMIN";
  const canManageStudentAccounts = isPlatformOwner || user.role === "ADMIN";
  if (!isPlatformOwner && user.role !== "ADMIN" && user.role !== "TEACHER") redirect(roleHome(user.role));
  const detail = isPlatformOwner
    ? await StudentsService.getPlatformStudentDetail(params.id)
    : await StudentsService.getStudentDetail(params.id);
  if (!detail) notFound();

  const groups = (isPlatformOwner ? detail.groups : await GroupsService.listGroups()) ?? [];
  const parents = isPlatformOwner
    ? (detail.parent ? [detail.parent] : [])
    : await MiscService.listParents();
  const studentGroups = (isPlatformOwner ? detail.groups : groupsForStudent(params.id)) ?? [];

  const attendance = isPlatformOwner
    ? { present: 0, late: 0, absent: 0, byLesson: [] as Array<{ id: string; lesson_id: string; status: "PRESENT" | "LATE" | "ABSENT" }> }
    : AttendanceService.studentAttendanceSummary(params.id);
  const payments = isPlatformOwner
    ? []
    : (await PaymentsService.listPayments({
        studentId: params.id,
        pageSize: 50,
      })).items;
  const grades = isPlatformOwner
    ? []
    : (await GradesService.listGrades({ studentId: params.id, pageSize: 50 })).items;
  const homework = isPlatformOwner ? [] : await HomeworkService.homeworkForStudent(params.id);
  const notes = isPlatformOwner ? [] : MiscService.notesForStudent(params.id);
  const groupIds = studentGroups.map((g) => g.id);
  const lessons = collections()
    .lessons.filter((l) => l.academy_id === detail.academy_id && groupIds.includes(l.group_id))
    .sort((a, b) => lessonWallClockMinute(b.date, b.start_time) - lessonWallClockMinute(a.date, a.start_time))
    .slice(0, 10)
    .map((l) => ({ ...l, group: groups.find((g) => g.id === l.group_id) }));

  const stats = detail.stats!;
  // Platform owners may not have an active academy context. Resolve the
  // student's academy explicitly so the read-only profile does not crash.
  const academy = await MiscService.getAcademyAsync(detail.academy_id);
  const consentAudit = detail.consent_given === true
    ? (await listAuditLogs({ action: "student.consent.approve", entity_type: "student", page: 1, pageSize: 50 }, detail.academy_id)).items.find((entry) => entry.entity_id === detail.id)
    : null;
  const consentSource = typeof consentAudit?.metadata?.source === "string"
    ? consentAudit.metadata.source
    : detail.consent_given === true ? (en ? "Recorded consent" : "موافقة مسجلة") : null;

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Student profile" : "ملف الطالب"}
        breadcrumbs={[
          { label: en ? "Students" : "الطلاب", href: "/students" },
          { label: `${detail.first_name} ${detail.last_name}` },
        ]}
      >
        {!isPlatformOwner && (
          <StudentGroupTransfer
            studentId={detail.id}
            currentGroups={studentGroups.map((group) => ({ id: group.id, name: group.name }))}
            targetGroups={groups.filter((group) => !studentGroups.some((current) => current.id === group.id)).map((group) => ({ id: group.id, name: group.name }))}
          />
        )}
        {canManageStudentAccounts && (
          <PortalCredentialsDialog
            student={{ id: detail.id, first_name: detail.first_name, last_name: detail.last_name, portal_email: detail.portal_email }}
          />
        )}
        <StudentQrCard
          studentId={detail.id}
          name={`${detail.first_name} ${detail.last_name}`}
          grade={detail.grade}
          academyName={academy.name}
          trigger={<Button variant="outline">{en ? "QR card" : "بطاقة QR"}</Button>}
        />
        {!isPlatformOwner && <EditStudentDialog student={detail} parents={parents} groups={groups} />}
        {!isPlatformOwner && detail.status !== "ARCHIVED" && (
          <DeleteEntityButton
            entity="student"
            id={detail.id}
            name={`${detail.first_name} ${detail.last_name}`}
            redirectTo="/students"
          />
        )}
        <Button asChild variant="outline">
          <Link href="/portal/login" target="_blank" rel="noreferrer">
            <ExternalLink className="me-2 h-4 w-4" /> {en ? "Portal login" : "دخول البوابة"}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/students/${params.id}/report`} target="_blank">
            <FileText className="me-2 h-4 w-4" /> {en ? "Generate parent report" : "توليد تقرير ولي الأمر"}
          </Link>
        </Button>
      </PageHeader>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-500 to-brand-700" />
        <CardContent className="-mt-12 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="rounded-full ring-4 ring-card">
                <StudentAvatar name={`${detail.first_name} ${detail.last_name}`} size="lg" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {detail.first_name} {detail.last_name}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StudentStatusBadge status={detail.status} />
                  {detail.grade && (
                    <Badge variant="secondary">{detail.grade}</Badge>
                  )}
                  {studentGroups.slice(0, 2).map((g) => (
                    <Badge key={g.id} variant="outline">
                      {g.name.split(" — ")[0]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem icon={User} label={en ? "Parent" : "ولي الأمر"} value={detail.parent ? <Link href={`/parents/${detail.parent.id}?studentId=${encodeURIComponent(detail.id)}`} className="text-primary hover:underline">{detail.parent.first_name} {detail.parent.last_name}</Link> : (en ? "Not linked" : "غير مرتبط")} />
            <InfoItem icon={School} label={en ? "School" : "المدرسة"} value={detail.school || "—"} />
            <InfoItem icon={Phone} label={en ? "Phone" : "الموبايل"} value={detail.phone || "—"} />
            <InfoItem icon={Mail} label={en ? "Email" : "البريد الإلكتروني"} value={detail.email || "—"} />
          </div>
          <div className="mt-4 rounded-lg border bg-muted/20 p-4">
            <div className="mb-3 text-sm font-semibold">{en ? "Parental consent audit" : "سجل موافقة ولي الأمر"}</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem icon={User} label={en ? "Status" : "الحالة"} value={detail.consent_given === true ? (en ? "Accepted" : "مقبولة") : (en ? "Pending consent" : "بانتظار الموافقة")} />
              <InfoItem icon={FileText} label={en ? "Policy version" : "إصدار السياسة"} value={detail.consent_version || "—"} />
              <InfoItem icon={CalendarCheck} label={en ? "Accepted at" : "وقت القبول"} value={detail.consent_at ? formatDate(detail.consent_at, undefined, en ? "en-EG" : "ar-EG") : "—"} />
              <InfoItem icon={User} label={en ? "Actor" : "المنفّذ"} value={detail.consent_by || "—"} />
              <InfoItem icon={FileText} label={en ? "Source" : "المصدر"} value={consentSource || "—"} />
            </div>
            {!detail.consent_given && <ParentConsentLink studentId={detail.id} en={en} />}
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MiniStat label={en ? "Attendance" : "الحضور"} value={`${stats.attendanceRate}%`} icon={CalendarCheck} />
        <MiniStat label={en ? "Average grade" : "متوسط الدرجات"} value={`${stats.averageGrade}%`} icon={GraduationCap} />
        <MiniStat label={en ? "Monthly fee" : "الرسوم الشهرية"} value={formatCurrency(stats.monthlyFee, "EGP", en ? "en-EG" : "ar-EG")} icon={Wallet} />
        <MiniStat label={en ? "Paid" : "مدفوع"} value={formatCurrency(stats.totalPaid, "EGP", en ? "en-EG" : "ar-EG")} icon={Wallet} accent="success" />
        <MiniStat label={en ? "Remaining" : "المتبقي"} value={formatCurrency(stats.outstanding, "EGP", en ? "en-EG" : "ar-EG")} icon={TrendingDown} accent="warning" />
      </div>

      <StudentProfileTabs
        overview={
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{en ? "Attendance trend" : "تطور الحضور"}</CardTitle>
                <CardDescription>{en ? "Based on recent lessons" : "وفقًا لأحدث الحصص"}</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.attendanceTrend.length ? (
                  <LineTrend data={stats.attendanceTrend} dataKey="rate" xKey="label" color="#10b981" height={200} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">{en ? "No attendance records yet." : "لا توجد سجلات حضور بعد."}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{en ? "Grade trend" : "تطور الدرجات"}</CardTitle>
                <CardDescription>{en ? "Score percentage for each exam" : "نسبة الدرجة في كل اختبار"}</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.gradeTrend.length ? (
                  <TrendArea data={stats.gradeTrend} dataKey="score" xKey="label" color="#7c5cfc" height={200} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">{en ? "No grades recorded yet." : "لا توجد درجات مسجّلة بعد."}</p>
                )}
              </CardContent>
            </Card>
          </div>
        }
        attendance={
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-3 gap-4 border-b p-4 text-center">
                <CountStat label={en ? "Present" : "حاضر"} value={attendance.present} className="text-emerald-600" />
                <CountStat label={en ? "Late" : "متأخر"} value={attendance.late} className="text-amber-600" />
                <CountStat label={en ? "Absent" : "غائب"} value={attendance.absent} className="text-rose-600" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{en ? "Lesson date" : "تاريخ الحصة"}</TableHead>
                    <TableHead>{en ? "Group" : "المجموعة"}</TableHead>
                    <TableHead>{en ? "Status" : "الحالة"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.byLesson.slice().reverse().map((a) => {
                    const lesson = collections().lessons.find((l) => l.id === a.lesson_id);
                    const group = lesson ? groups.find((g) => g.id === lesson.group_id) : undefined;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">
                          {lesson ? formatDate(lesson.date, undefined, en ? "en-EG" : "ar-EG") : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {group?.name ?? "—"}
                        </TableCell>
                        <TableCell><AttendanceBadge status={a.status} /></TableCell>
                      </TableRow>
                    );
                  })}
                  {attendance.byLesson.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                        {en ? "No attendance records." : "لا توجد سجلات حضور."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        }
        payments={
          <Card>
            {!isPlatformOwner && (
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{en ? "Payment history" : "سجل المدفوعات"}</CardTitle>
                  <CardDescription>{en ? "Review the student's payment history and record cash received." : "راجع سجل مدفوعات الطالب وسجّل أي مبالغ نقدية مستلمة."}</CardDescription>
                </div>
                <CreatePaymentDialog
                  students={[detail]}
                  groups={studentGroups}
                  cashOnly={user.role === "TEACHER"}
                  defaultStudentId={detail.id}
                />
              </CardHeader>
            )}
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{en ? "Month" : "الشهر"}</TableHead>
                    <TableHead>{en ? "Due" : "المستحق"}</TableHead>
                    <TableHead>{en ? "Paid" : "المدفوع"}</TableHead>
                    <TableHead>{en ? "Remaining" : "المتبقي"}</TableHead>
                    <TableHead>{en ? "Status" : "الحالة"}</TableHead>
                    {!isPlatformOwner && <TableHead>{en ? "Action" : "إجراء"}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.month_year ?? p.month}</TableCell>
                      <TableCell>{formatCurrency(p.amount_due, "EGP", en ? "en-EG" : "ar-EG")}</TableCell>
                      <TableCell>{formatCurrency(p.amount_paid, "EGP", en ? "en-EG" : "ar-EG")}</TableCell>
                      <TableCell className={p.remaining > 0 ? "text-rose-600" : ""}>
                        {formatCurrency(p.remaining, "EGP", en ? "en-EG" : "ar-EG")}
                      </TableCell>
                      <TableCell><PaymentStatusBadge status={p.status} /></TableCell>
                      {!isPlatformOwner && <TableCell><RecordPaymentDialog payment={p} students={[detail]} cashOnly={user.role === "TEACHER"} /></TableCell>}
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isPlatformOwner ? 5 : 6} className="py-8 text-center text-sm text-muted-foreground">
                        {en ? "No payments recorded." : "لا توجد مدفوعات مسجّلة."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        }
        grades={
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{en ? "Exam" : "الاختبار"}</TableHead>
                    <TableHead>{en ? "Date" : "التاريخ"}</TableHead>
                    <TableHead>{en ? "Score" : "الدرجة"}</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>{en ? "Grade" : "التقدير"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((g) => {
                    const exam = collections().exams.find((e) => e.id === g.exam_id);
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{exam?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{exam ? formatDate(exam.date, undefined, en ? "en-EG" : "ar-EG") : "—"}</TableCell>
                        <TableCell>{g.score} / {exam?.max_score}</TableCell>
                        <TableCell>{Math.round(g.percentage ?? 0)}%</TableCell>
                        <TableCell>
                          <Badge className={performanceColor(g.level ?? performanceLevel(g.percentage ?? 0))}>
                            {performanceLabel(g.level ?? performanceLevel(g.percentage ?? 0), en)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {grades.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        {en ? "No grades recorded." : "لا توجد درجات مسجّلة."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        }
        homework={
          <div className="space-y-3">
            {homework.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{en ? "No assigned homework yet." : "لا توجد واجبات مسندة بعد."}</p>
            ) : (
              homework.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{s.homework?.title}</p>
                        <p className="text-sm text-muted-foreground">{s.homework?.description}</p>
                        {s.feedback && (
                          <p className="mt-2 rounded-md bg-muted p-2 text-xs">
                            <span className="font-medium">{en ? "Teacher feedback:" : "ملاحظات المعلّم:"}</span> {s.feedback}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <HomeworkBadge status={s.status} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {en ? "Due date:" : "موعد التسليم:"} {formatDate(s.homework?.deadline, undefined, en ? "en-EG" : "ar-EG")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        }
        lessons={
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{en ? "Date" : "التاريخ"}</TableHead>
                    <TableHead>{en ? "Topic" : "الموضوع"}</TableHead>
                    <TableHead>{en ? "Group" : "المجموعة"}</TableHead>
                    <TableHead>{en ? "Time" : "الوقت"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/lessons/${l.id}`} className="hover:text-primary">{l.topic}</Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.group?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatClockTime(l.start_time, en ? "en-EG" : "ar-EG")}</TableCell>
                    </TableRow>
                  ))}
                  {lessons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        {en ? "No scheduled lessons." : "لا توجد حصص مجدولة."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        }
        notes={<StudentNotes studentId={params.id} notes={notes} readOnly={isPlatformOwner} />}
      />
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning";
}) {
  const color =
    accent === "success" ? "text-emerald-600" : accent === "warning" ? "text-amber-600" : "text-primary";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs">{label}</span>
        </div>
        <p className="mt-1.5 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function CountStat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <p className={`text-2xl font-semibold ${className ?? ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
