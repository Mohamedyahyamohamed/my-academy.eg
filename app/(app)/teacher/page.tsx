import Link from "next/link";
import {
  Users, UsersRound, CalendarClock, ClipboardList, CheckCircle2,
  ArrowRight, AlertCircle,
} from "lucide-react";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { HomeworkBadge } from "@/components/shared/badges";
import { getTeacherDashboard, requireScopedRole } from "@/services";
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const isRTL = lang === "ar";
  const t = lang === "ar" ? {
    dashboard: "لوحة التحكم", noTeacher: "لا يوجد ملف معلّم مرتبط", noTeacherDesc: "حسابك غير مرتبط بسجل معلّم. اطلب من المدير إسناد المجموعات إليك.", welcome: "أهلاً", overview: "نظرة سريعة على مجموعاتك وطلابك وحصصك فقط.", groups: "مجموعاتي", students: "طلابي", upcoming: "الحصص القادمة", attendanceRate: "متوسط الحضور", pending: "تسليم واجبات بانتظار مراجعتك.", review: "راجع الآن", noUpcoming: "لا توجد حصص قادمة.", all: "عرض الكل", attendanceMissing: "حضور لم يُسجَّل", recordAttendance: "سجّل الحضور", allRecorded: "تم تسجيل كل الحضور", groupsAssigned: "لا توجد مجموعات مسندة إليك.", submissions: "أحدث التسليمات", noSubmissions: "لا توجد تسليمات بعد."
  } : {
    dashboard: "Dashboard", noTeacher: "No teacher profile linked", noTeacherDesc: "Your account is not linked to a teacher record. Ask an administrator to assign groups to you.", welcome: "Welcome", overview: "A quick view of your groups, students, and lessons only.", groups: "My groups", students: "My students", upcoming: "Upcoming lessons", attendanceRate: "Average attendance", pending: "homework submissions are waiting for your review.", review: "Review now", noUpcoming: "No upcoming lessons.", all: "View all", attendanceMissing: "Attendance not recorded", recordAttendance: "Record attendance", allRecorded: "All attendance is recorded", groupsAssigned: "No groups are assigned to you.", submissions: "Recent submissions", noSubmissions: "No submissions yet."
  };
  const user = await requireScopedRole("TEACHER");
  const displayName = user.full_name?.trim() || user.email || "المعلّم";
  const d = await getTeacherDashboard(user);
  if (!d) {
    return (
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <PageHeader title={t.dashboard} description={`${t.welcome}، ${displayName}.`} />
        <EmptyState icon={UsersRound} title={t.noTeacher} description={t.noTeacherDesc} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <PageHeader title={`${t.welcome}، ${(d.teacherName || displayName).split(/\s+/)[0]} 👋`} description={t.overview} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.groups} value={d.groupCount} icon={UsersRound} accent="primary" />
        <StatCard label={t.students} value={d.studentCount} icon={Users} accent="info" />
        <StatCard label={t.upcoming} value={d.upcomingCount} icon={CalendarClock} accent="success" />
        <StatCard label={t.attendanceRate} value={`${d.attendanceRate}%`} icon={CheckCircle2} accent="warning" />
      </div>

      {d.pendingReview > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{d.pendingReview}</span> {t.pending}
            </p>
            <Button asChild size="sm" variant="soft" className="ms-auto">
              <Link href="/homework">{t.review}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t.upcoming}</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/lessons">{t.all}</Link></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.upcomingLessons.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.noUpcoming}</p>
            ) : (
              d.upcomingLessons.map((l: any) => (
                <Link key={l.id} href={`/lessons/${l.id}`} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-[10px] font-medium uppercase">{formatDate(l.date, { month: "short" }).split(" ")[0]}</span>
                    <span className="text-sm font-semibold leading-none">{new Date(l.date).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.topic}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.group?.name}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t.attendanceMissing}</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/attendance">{t.recordAttendance}</Link></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.needsAttendance.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.allRecorded}</p>
            ) : (
              d.needsAttendance.map((l) => (
                <Link key={l.id} href={`/attendance?lesson=${l.id}`} className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent">
                  <div>
                    <p className="text-sm font-medium">{l.topic}</p>
                    <p className="text-xs text-muted-foreground">{l.groupName}</p>
                  </div>
                  <Badge variant="warning">{formatDate(l.date)}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t.groups}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {d.groups.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t.groupsAssigned}</p>
            ) : (
              d.groups.map((g: any) => (
                <Link key={g.id} href={`/groups/${g.id}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-white" style={{ background: g.course?.color ?? "#7c5cfc" }}>
                    {g.course?.name?.[0] ?? "م"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.schedule}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t.submissions}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {d.recentSubmissions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t.noSubmissions}</p>
            ) : (
              d.recentSubmissions.map((s) => (
                <Link key={s.id} href={`/homework`} className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.studentName}</p>
                  </div>
                  <HomeworkBadge status={s.status as any} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
