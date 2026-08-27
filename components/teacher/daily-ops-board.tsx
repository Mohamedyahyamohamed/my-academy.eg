import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  CreditCard,
  ListChecks,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { TeacherDailyOps } from "@/services/dashboard";
import { formatDate, formatClockTime } from "@/lib/utils";

/**
 * Daily operations board — the one screen a teacher opens each morning.
 * Surfaces today's lessons, attendance gaps, at-risk students, due payments,
 * and homework awaiting review. All data is already teacher-scoped by the
 * service, so no tenant filtering happens here.
 */
export function TeacherDailyOpsBoard({
  ops,
  lang,
}: {
  ops: TeacherDailyOps;
  lang: "ar" | "en";
}) {
  const isRTL = lang === "ar";
  const fmt = (date?: string | null, opts?: Intl.DateTimeFormatOptions) =>
    date ? formatDate(date, opts, isRTL ? "ar-EG" : "en-EG") : "—";
  const fmtTime = (t?: string | null) => (t ? formatClockTime(t, isRTL ? "ar-EG" : "en-EG") : "—");

  const t = isRTL
    ? {
        title: "لوحة التشغيل اليومية",
        subtitle: "افتح المنصة واعرف فورًا ماذا تفعل اليوم.",
        todayLessons: "حصص اليوم",
        attendanceMissing: "حضور غير مسجل",
        atRisk: "طلاب معرضون للخطر",
        duePayments: "دفعات مستحقة",
        homework: "واجبات تحتاج تصحيحًا",
        lessonAt: "الحصة",
        group: "المجموعة",
        recorded: "تم تسجيل الحضور",
        notRecorded: "لم يُسجَّل",
        viewAll: "عرض الكل",
        none: "لا توجد عناصر.",
        risk: "مستوى الخطر",
        remaining: "متبقٍ",
        submittedAt: "سُلِّم في",
      }
    : {
        title: "Daily Operations Board",
        subtitle: "Open the platform and know exactly what to do today.",
        todayLessons: "Today's lessons",
        attendanceMissing: "Missing attendance",
        atRisk: "At-risk students",
        duePayments: "Due payments",
        homework: "Homework to review",
        lessonAt: "Lesson",
        group: "Group",
        recorded: "Attendance recorded",
        notRecorded: "Not recorded",
        viewAll: "View all",
        none: "Nothing here.",
        risk: "Risk",
        remaining: "remaining",
        submittedAt: "Submitted",
      };

  const riskTone = (cat: string) =>
    cat === "critical"
      ? "destructive"
      : cat === "high"
        ? "warning"
        : "secondary";

  return (
    <section className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ops.counts.todaysLessons > 0 && (
            <Badge variant="secondary" className="gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> {ops.counts.todaysLessons}
            </Badge>
          )}
          {ops.counts.attendanceMissing > 0 && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {ops.counts.attendanceMissing}
            </Badge>
          )}
          {ops.counts.atRisk > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {ops.counts.atRisk}
            </Badge>
          )}
          {ops.counts.duePayments > 0 && (
            <Badge variant="outline" className="gap-1">
              <CreditCard className="h-3.5 w-3.5" /> {ops.counts.duePayments}
            </Badge>
          )}
          {ops.counts.homeworkToReview > 0 && (
            <Badge variant="outline" className="gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> {ops.counts.homeworkToReview}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's lessons */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" /> {t.todayLessons}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/lessons">{t.viewAll}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {ops.todaysLessons.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.none}</p>
            ) : (
              ops.todaysLessons.map((l) => (
                <Link
                  key={l.id}
                  href={`/lessons/${l.id}`}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent"
                >
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-[10px] font-medium uppercase">{fmt(l.date, { month: "short" }).split(" ")[0]}</span>
                    <span className="text-sm font-semibold leading-none">{new Date(l.date).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.groupName ?? l.courseName ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fmtTime(l.startTime)} · {l.totalStudents} {isRTL ? "طالب" : "students"}
                    </p>
                  </div>
                  {l.attendanceRecorded ? (
                    <Badge variant="success">{t.recorded}</Badge>
                  ) : (
                    <Badge variant="warning">{t.notRecorded}</Badge>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Missing attendance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> {t.attendanceMissing}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/attendance">{isRTL ? "سجّل" : "Record"}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {ops.attendanceMissing.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={isRTL ? "كل الحضور مسجَّل" : "All attendance recorded"}
                className="border-0 bg-transparent px-2 py-6"
              />
            ) : (
              ops.attendanceMissing.map((l) => (
                <Link
                  key={l.id}
                  href={`/attendance?group=${l.groupId}&lesson=${l.id}`}
                  className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.groupName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{fmt(l.date)} · {fmtTime(l.startTime)}</p>
                  </div>
                  <Badge variant="warning">{l.totalStudents}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* At-risk students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-rose-500" /> {t.atRisk}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/students">{t.viewAll}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {ops.atRiskStudents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.none}</p>
            ) : (
              ops.atRiskStudents.map((s) => (
                <Link
                  key={s.studentId}
                  href={`/students/${s.studentId}`}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.groupName ?? "—"}</p>
                  </div>
                  <Badge variant={riskTone(s.riskCategory)}>{s.riskCategory}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Due payments + homework to review (stacked) */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-sky-500" /> {t.duePayments}
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/payments">{t.viewAll}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-1">
              {ops.duePayments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t.none}</p>
              ) : (
                ops.duePayments.map((p) => (
                  <Link
                    key={p.id}
                    href={`/students/${p.studentId}`}
                    className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.studentName}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.groupName ?? "—"}</p>
                    </div>
                    <Badge variant="outline">{p.remaining.toLocaleString(isRTL ? "ar-EG" : "en-US")} · {t.remaining}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="h-4 w-4 text-violet-500" /> {t.homework}
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/homework">{t.viewAll}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-1">
              {ops.homeworkToReview.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t.none}</p>
              ) : (
                ops.homeworkToReview.map((s) => (
                  <Link
                    key={s.id}
                    href={`/homework`}
                    className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.studentName} · {s.submittedAt ? `${t.submittedAt} ${fmt(s.submittedAt)}` : ""}
                      </p>
                    </div>
                    <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
