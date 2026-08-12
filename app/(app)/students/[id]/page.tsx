import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  CalendarCheck,
  GraduationCap,
  Wallet,
  TrendingDown,
  Phone,
  Mail,
  School,
  User,
  ArrowLeft,
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
import { EditStudentDialog } from "@/components/students/student-dialogs";
import { StudentQrCard } from "@/components/attendance/student-qr-card";
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
  requireRole,
} from "@/services";
import { groupsForStudent } from "@/services/_shared";
import { collections } from "@/services/data/store";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { performanceLevel, performanceColor } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage({
  params,
}: {
  params: { id: string };
}) {
  requireRole("ADMIN", "TEACHER");
  const detail = await StudentsService.getStudentDetail(params.id);
  if (!detail) notFound();

  const groups = await GroupsService.listGroups();
  const parents = await MiscService.listParents();
  const studentGroups = groupsForStudent(params.id);

  const attendance = AttendanceService.studentAttendanceSummary(params.id);
  const payments = (await PaymentsService.listPayments({
    studentId: params.id,
    pageSize: 50,
  })).items;
  const grades = (await GradesService.listGrades({ studentId: params.id, pageSize: 50 })).items;
  const homework = await HomeworkService.homeworkForStudent(params.id);
  const notes = MiscService.notesForStudent(params.id);
  const groupIds = studentGroups.map((g) => g.id);
  const lessons = collections()
    .lessons.filter((l) => groupIds.includes(l.group_id))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 10)
    .map((l) => ({ ...l, group: groups.find((g) => g.id === l.group_id) }));

  const stats = detail.stats!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student profile"
        breadcrumbs={[
          { label: "Students", href: "/students" },
          { label: `${detail.first_name} ${detail.last_name}` },
        ]}
      >
        <Button asChild variant="outline">
          <Link href="/students">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <StudentQrCard
          studentId={detail.id}
          name={`${detail.first_name} ${detail.last_name}`}
          grade={detail.grade}
          academyName={collections().academies[0]?.name ?? "MY Academy"}
          trigger={<Button variant="outline">QR card</Button>}
        />
        <EditStudentDialog student={detail} parents={parents} groups={groups} />
      </PageHeader>

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
            <InfoItem icon={User} label="Parent" value={detail.parent ? <Link href={`/parents/${detail.parent.id}`} className="text-primary hover:underline">{detail.parent.first_name} {detail.parent.last_name}</Link> : "Not linked"} />
            <InfoItem icon={School} label="School" value={detail.school || "—"} />
            <InfoItem icon={Phone} label="Phone" value={detail.phone || "—"} />
            <InfoItem icon={Mail} label="Email" value={detail.email || "—"} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MiniStat label="Attendance" value={`${stats.attendanceRate}%`} icon={CalendarCheck} />
        <MiniStat label="Avg. grade" value={`${stats.averageGrade}%`} icon={GraduationCap} />
        <MiniStat label="Monthly fee" value={formatCurrency(stats.monthlyFee)} icon={Wallet} />
        <MiniStat label="Paid" value={formatCurrency(stats.totalPaid)} icon={Wallet} accent="success" />
        <MiniStat label="Outstanding" value={formatCurrency(stats.outstanding)} icon={TrendingDown} accent="warning" />
      </div>

      <StudentProfileTabs
        overview={
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance trend</CardTitle>
                <CardDescription>Per recent lesson</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.attendanceTrend.length ? (
                  <LineTrend data={stats.attendanceTrend} dataKey="rate" xKey="label" color="#10b981" height={200} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No attendance records yet.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grade trend</CardTitle>
                <CardDescription>Score % per exam</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.gradeTrend.length ? (
                  <TrendArea data={stats.gradeTrend} dataKey="score" xKey="label" color="#7c5cfc" height={200} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No grades recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        }
        attendance={
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-3 gap-4 border-b p-4 text-center">
                <CountStat label="Present" value={attendance.present} className="text-emerald-600" />
                <CountStat label="Late" value={attendance.late} className="text-amber-600" />
                <CountStat label="Absent" value={attendance.absent} className="text-rose-600" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lesson date</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.byLesson.slice().reverse().map((a) => {
                    const lesson = collections().lessons.find((l) => l.id === a.lesson_id);
                    const group = lesson ? groups.find((g) => g.id === lesson.group_id) : undefined;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">
                          {lesson ? formatDate(lesson.date) : "—"}
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
                        No attendance recorded.
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
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.month}</TableCell>
                      <TableCell>{formatCurrency(p.amount_due)}</TableCell>
                      <TableCell>{formatCurrency(p.amount_paid)}</TableCell>
                      <TableCell className={p.remaining > 0 ? "text-rose-600" : ""}>
                        {formatCurrency(p.remaining)}
                      </TableCell>
                      <TableCell><PaymentStatusBadge status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No payments recorded.
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
                    <TableHead>Exam</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((g) => {
                    const exam = collections().exams.find((e) => e.id === g.exam_id);
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{exam?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{exam ? formatDate(exam.date) : "—"}</TableCell>
                        <TableCell>{g.score} / {exam?.max_score}</TableCell>
                        <TableCell>{Math.round(g.percentage ?? 0)}%</TableCell>
                        <TableCell>
                          <Badge className={performanceColor(g.level ?? performanceLevel(g.percentage ?? 0))}>
                            {g.level ?? performanceLevel(g.percentage ?? 0)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {grades.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No grades recorded.
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
              <p className="py-8 text-center text-sm text-muted-foreground">No homework assigned yet.</p>
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
                            <span className="font-medium">Feedback:</span> {s.feedback}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <HomeworkBadge status={s.status} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due {formatDate(s.homework?.deadline)}
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
                    <TableHead>Date</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{formatDate(l.date)}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/lessons/${l.id}`} className="hover:text-primary">{l.topic}</Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.group?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`)}</TableCell>
                    </TableRow>
                  ))}
                  {lessons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        No lessons scheduled.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        }
        notes={<StudentNotes studentId={params.id} notes={notes} />}
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