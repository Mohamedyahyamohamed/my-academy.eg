import Link from "next/link";
import {
  Users, UsersRound, CalendarClock, ClipboardList, CheckCircle2,
  ArrowRight, AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { HomeworkBadge } from "@/components/shared/badges";
import { getTeacherDashboard, requireRole } from "@/services";
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const user = requireRole("TEACHER");
  const displayName = user.full_name?.trim() || user.email || "المعلّم";
  const d = await getTeacherDashboard(user);
  if (!d) {
    return (
      <div className="space-y-6">
        <PageHeader title="لوحة التحكم" description={`أهلاً، ${displayName}.`} />
        <EmptyState
          icon={UsersRound}
          title="لا يوجد ملف معلّم مرتبط"
          description="حسابك غير مرتبط بسجل معلّم. اطلب من المدير إسناد المجموعات إليك."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`أهلاً، ${(d.teacherName || displayName).split(/\s+/)[0]} 👋`}
        description="نظرة سريعة على مجموعاتك وطلابك وحصصك فقط."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="مجموعاتي" value={d.groupCount} icon={UsersRound} accent="primary" />
        <StatCard label="طلابي" value={d.studentCount} icon={Users} accent="info" />
        <StatCard label="الحصص القادمة" value={d.upcomingCount} icon={CalendarClock} accent="success" />
        <StatCard label="متوسط الحضور" value={`${d.attendanceRate}%`} icon={CheckCircle2} accent="warning" />
      </div>

      {d.pendingReview > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{d.pendingReview}</span> تسليم واجبات بانتظار مراجعتك.
            </p>
            <Button asChild size="sm" variant="soft" className="ml-auto">
              <Link href="/homework">راجع الآن</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">الحصص القادمة</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/lessons">عرض الكل</Link></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.upcomingLessons.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد حصص قادمة.</p>
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
            <CardTitle className="text-base">حضور لم يُسجَّل</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/attendance">سجّل الحضور</Link></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.needsAttendance.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">تم تسجيل كل الحضور 🎉</p>
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
          <CardHeader><CardTitle className="text-base">مجموعاتي</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {d.groups.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">لا توجد مجموعات مسندة إليك.</p>
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
          <CardHeader><CardTitle className="text-base">أحدث التسليمات</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {d.recentSubmissions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">لا توجد تسليمات بعد.</p>
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
