import Link from "next/link";
import {
  Users, UsersRound, CalendarClock, ClipboardList, CheckCircle2,
  ArrowLeft, AlertCircle, Inbox,
} ;
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { Crown, GraduationCap, BookOpen, Users, CalendarClock, CheckCircle2, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { HomeworkBadge } from "@/components/shared/badges";
import { getTeacherDashboard, requireScopedRole } from "@/services";
import { formatDate, formatClockTime, formatSchedule } from "@/lib/utils";

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
  const rawName = user.full_name?.trim() || user.email || "";
  const displayName = rawName ? rawName.split(/\s+/)[0] : (isRTL ? "المعلّم" : "Teacher");
  const d = await getTeacherDashboard(user);
  if (!d) {
    return (
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-l from-violet-950 via-indigo-950 to-slate-950 p-6 shadow-[0_16px_50px_-20px_rgb(139_92_246/0.45)]">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                <Crown className="h-7 w-7 text-amber-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{`${t.welcome}، ${displayName}`} 👋</h1>
                <p className="mt-1 text-sm text-violet-200/80">{t.overview}</p>
              </div>
            </div>
            <span className="hidden items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30 sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              جاهز للتدريس
            </span>
          </div>
        </div>
        <EmptyState icon={UsersRound} title={t.noTeacher} description={t.noTeacherDesc} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-l from-emerald-950 via-teal-950 to-slate-950 p-8 shadow-[0_20px_60px_-20px_rgb(13_148_136/0.45)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgb(20_184_166/0.22),transparent_45%),radial-gradient(circle_at_85%_70%,rgb(251_191_36/0.10),transparent_40%)]" />
        <div aria-hidden className="pointer-events-none absolute -top-14 -start-14 h-44 w-44 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-400/30 bg-gradient-to-br from-teal-400/20 to-emerald-600/10 shadow-[0_0_30px_-5px_rgb(45_212_191/0.4)]">
              <GraduationCap className="h-7 w-7 text-teal-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {t.welcome}، <bdi dir="auto">{(d.teacherName || displayName).split(/\s+/)[0]}</bdi><span aria-hidden="true"> 👋</span>
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-300">{t.overview}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
            <BookOpen className="h-4 w-4 text-teal-300" />
            <span className="text-xs font-semibold text-teal-200">{isRTL == false ? "Teaching mode" : "وضع التدريس"}</span>
          </div>
        </div>
      </div>

      {d.assistantFor.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <Badge variant="secondary">{isRTL ? "مساعد للمدرس" : "Assistant to"}</Badge>
          <span className="font-medium">{d.assistantFor.join(isRTL ? "، " : ", ")}</span>
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isRTL ? "إجراءات سريعة" : "Quick actions"}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { href: "/attendance", label: isRTL ? "تسجيل الحضور" : "Record attendance", icon: CheckCircle2 },
            { href: "/lessons", label: isRTL ? "حصصي اليوم" : "Today's lessons", icon: CalendarClock },
            { href: "/groups", label: isRTL ? "مجموعاتي" : "My groups", icon: UsersRound },
            { href: "/students", label: isRTL ? "طلابي" : "My students", icon: Users },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.href} asChild variant="outline" className="h-auto justify-start gap-2 border-indigo-100 bg-indigo-50/50 px-3 py-3 text-start text-indigo-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/60">
                <Link href={action.href}>
                  <Icon className="h-4 w-4 shrink-0 text-indigo-700 dark:text-indigo-300" />
                  <span className="truncate">{action.label}</span>
                </Link>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.groups} value={d.groupCount} icon={UsersRound} accent="primary" href="/groups" />
        <StatCard label={t.students} value={d.studentCount} icon={Users} accent="info" href="/students" />
        <StatCard label={t.upcoming} value={d.upcomingCount} icon={CalendarClock} accent="success" href="/lessons" />
        <StatCard label={t.attendanceRate} value={d.totalSessions === 0 ? (isRTL ? "—" : "N/A") : `${d.attendanceRate}%`} hint={d.totalSessions === 0 ? (isRTL ? "لم تُسجّل حصص بعد" : "No attendance recorded yet") : undefined} icon={CheckCircle2} accent="warning" href="/attendance" />
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
                    <span className="text-[10px] font-medium uppercase">{formatDate(l.date, { month: "short" }, lang === "en" ? "en-EG" : "ar-EG").split(" ")[0]}</span>
                    <span className="text-sm font-semibold leading-none">{new Date(l.date).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.topic}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.group?.name}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatClockTime(l.start_time, lang === "en" ? "en-EG" : "ar-EG")}
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
              <EmptyState icon={CheckCircle2} title={t.allRecorded} description={isRTL ? "لا توجد حصص بانتظار تسجيل الحضور." : "There are no lessons waiting for attendance."} className="border-0 bg-transparent px-2 py-6" />
            ) : (
              d.needsAttendance.map((l) => (
                <Link key={l.id} href={`/attendance?group=${l.group_id}&lesson=${l.id}`} className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent">
                  <div>
                    <p className="text-sm font-medium">{l.topic}</p>
                    <p className="text-xs text-muted-foreground">{l.groupName}</p>
                  </div>
                  <Badge variant="warning">{formatDate(l.date, undefined, lang === "en" ? "en-EG" : "ar-EG")}</Badge>
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
                <Link key={g.id} href={`/groups/${g.id}`} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-white" style={{ background: g.course?.color ?? "#7c5cfc" }}>
                    {g.course?.name?.[0] ?? "م"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSchedule(g.schedule, lang === "en" ? "en-EG" : "ar-EG")}</p>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t.submissions}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {d.recentSubmissions.length === 0 ? (
              <EmptyState icon={Inbox} title={t.noSubmissions} description={isRTL ? "ستظهر هنا أحدث الواجبات التي يرسلها طلاب مجموعاتك." : "Recent homework submissions will appear here."} className="border-0 bg-transparent px-2 py-6" />
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
