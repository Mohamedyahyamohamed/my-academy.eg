import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import {
  ArrowLeft, Calendar, Clock, Users, CalendarCheck, ClipboardList, Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { AttendanceBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LessonsService, AttendanceService, MiscService, requireScopedRole,
} from "@/services";
import { collections } from "@/services/data/store";
import { studentsInGroup } from "@/services/_shared";
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LessonDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  await requireScopedRole("TEACHER");
  const lesson = await LessonsService.getLesson(params.id);
  if (!lesson) notFound();

  const sheet = AttendanceService.getAttendanceSheet(lesson.group_id, lesson.id);
  const homework = collections().homework
    .filter((h) => h.lesson_id === lesson.id)
    .map((h) => ({ ...h, group: lesson.group }));

  const roster = studentsInGroup(lesson.group_id);
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={lesson.topic}
        description={lesson.description ?? undefined}
        breadcrumbs={[{ label: en ? "Lessons" : "الحصص", href: "/lessons" }, { label: lesson.topic }]}
      >
        <Button asChild variant="outline">
          <Link href="/lessons"><ArrowLeft className="h-4 w-4" /> {en ? "Back" : "رجوع"}</Link>
        </Button>
        <Button asChild variant="soft">
          <Link href={`/attendance?group=${lesson.group_id}&lesson=${lesson.id}`}>
            <CalendarCheck className="h-4 w-4" /> {lesson.attendance_taken ? (en ? "Edit attendance" : "تعديل الحضور") : (en ? "Record attendance" : "تسجيل الحضور")}
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={Users} label={en ? "Group" : "المجموعة"} value={lesson.group?.name ?? "—"} />
        <InfoCard icon={Calendar} label={en ? "Date" : "التاريخ"} value={formatDate(lesson.date, undefined, en ? "en-EG" : "ar-EG")} />
        <InfoCard icon={Clock} label={en ? "Time" : "الوقت"} value={`${lesson.start_time} – ${lesson.end_time}`} />
        <InfoCard icon={Users} label={en ? "Students" : "الطلاب"} value={String(roster.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{en ? "Attendance" : "الحضور"}</CardTitle>
            <Badge variant={lesson.attendance_taken ? "success" : "outline"}>
              {lesson.attendance_taken ? (en ? "Recorded" : "مسجّل") : (en ? "Not recorded" : "لم يُسجّل")}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {sheet.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={Users} title={en ? "No students in this group" : "لا يوجد طلاب في هذه المجموعة"} description={en ? "Enroll students to track attendance." : "سجّل طلابًا لتتبّع الحضور."} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{en ? "Student" : "الطالب"}</TableHead>
                    <TableHead>{en ? "Status" : "الحالة"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.map((e) => (
                    <TableRow key={e.student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <StudentAvatar name={`${e.student.first_name} ${e.student.last_name}`} size="sm" />
                          <span className="font-medium">{e.student.first_name} {e.student.last_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {e.status ? <AttendanceBadge status={e.status} /> : <Badge variant="outline">—</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{en ? "Teaching notes" : "ملاحظات الشرح"}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {lesson.notes || (en ? "No notes for this lesson." : "لا توجد ملاحظات لهذه الحصة.")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-primary" /> {en ? "Homework" : "الواجبات"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {homework.length === 0 ? (
                <p className="text-sm text-muted-foreground">{en ? "No homework is linked to this lesson." : "لا توجد واجبات مرتبطة بهذه الحصة."}</p>
              ) : (
                <div className="space-y-2">
                  {homework.map((h) => (
                    <Link key={h.id} href={`/homework`} className="block rounded-lg border border-border p-3 hover:bg-accent/50">
                      <p className="text-sm font-medium">{h.title}</p>
                      <p className="text-xs text-muted-foreground">{en ? "Due: " : "التسليم: "}{formatDate(h.deadline, undefined, en ? "en-EG" : "ar-EG")}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
