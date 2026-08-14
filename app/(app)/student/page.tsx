import Link from "next/link";
import { CalendarClock, GraduationCap, ClipboardList, CalendarCheck, TrendingUp, ArrowRight, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AttendanceBadge, HomeworkBadge } from "@/components/shared/badges";
import { getStudentDashboard, requireScopedRole, MiscService } from "@/services";
import { getStudentRank, getLeaderboard } from "@/services/gamification";
import { StudentQrCard } from "@/components/attendance/student-qr-card";
import { collections } from "@/services/data/store";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { performanceLevel, performanceColor } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const user = await requireScopedRole("STUDENT");
  const d = await getStudentDashboard(user);
  if (!d) {
    return (
      <div className="space-y-6">
        <PageHeader title="لوحة التحكم" description={`أهلاً، ${user.full_name}.`} />
        <EmptyState icon={BookOpen} title="الملف غير مرتبط" description="حسابك غير مرتبط بسجل طالب. تواصل مع الأكاديمية." />
      </div>
    );
  }

  const rank = await getStudentRank(d.student.id, user.academy_id);
  const leaderboard = await getLeaderboard(5, user.academy_id);
  const academyName = MiscService.getAcademy(user.academy_id).name;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`أهلاً، ${d.student.first_name} 👋`}
        description={`${d.student.grade} · ${d.groups.map((g) => g.name.split(" — ")[0]).join(", ") || "لا توجد مجموعات"}`}
      >
        <StudentQrCard
          studentId={d.student.id}
          name={`${d.student.first_name} ${d.student.last_name}`}
          grade={d.student.grade}
          academyName={academyName}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="الحضور" value={`${d.attendanceRate}%`} icon={CalendarCheck} accent="success" />
        <StatCard label="متوسط الدرجات" value={`${d.averageGrade}%`} icon={GraduationCap} accent="primary" />
        <StatCard label="المجموعات النشطة" value={d.groups.length} icon={BookOpen} accent="info" />
        <StatCard label="الواجبات المعلّقة" value={d.pendingHomework.length} icon={ClipboardList} accent="warning" />
      </div>

      {/* Gamification */}
      {rank && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1 bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-white/80">نقاطك</p>
              <p className="text-4xl font-bold">{rank.points}</p>
              <p className="mt-1 text-sm text-white/80">الترتيب #{rank.rank}</p>
              <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                🔥 {rank.streak} أيام متتالية
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {rank.badges.filter((b) => b.earned).map((b) => (
                  <span key={b.id} title={b.label} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
                    {b.icon}
                  </span>
                ))}
                {rank.badges.filter((b) => b.earned).length === 0 && (
                  <span className="text-xs text-white/70">احصل على شارات بالمواظبة وتحقيق درجات مميزة.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">🏆 لوحة المتصدرين</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {leaderboard.map((row) => (
                <div
                  key={row.studentId}
                  className={`flex items-center gap-3 rounded-lg p-2.5 ${row.studentId === d.student.id ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${row.rank <= 3 ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground"}`}>
                    {row.rank}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">
                    {row.studentId === d.student.id ? "أنت" : row.name}
                  </span>
                  <span className="text-sm text-muted-foreground">{row.points} نقطة</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">الحصص القادمة</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/student/lessons">عرض الكل</Link></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.upcomingLessons.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد حصص قادمة.</p>
            ) : (
              d.upcomingLessons.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent">
                  <div>
                    <p className="text-sm font-medium">{l.topic}</p>
                    <p className="text-xs text-muted-foreground">{l.group?.name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" /> {formatDate(l.date)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">أحدث الدرجات</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/student/grades">عرض الكل</Link></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.recentGrades.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد درجات بعد.</p>
            ) : (
              d.recentGrades.map((g) => {
                const exam = collections().exams.find((e) => e.id === g.exam_id);
                const lvl = g.level ?? performanceLevel(g.percentage ?? 0);
                return (
                  <div key={g.id} className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent">
                    <div>
                      <p className="text-sm font-medium">{exam?.name}</p>
                      <p className="text-xs text-muted-foreground">{g.score}/{exam?.max_score}</p>
                    </div>
                    <Badge className={performanceColor(lvl)}>{Math.round(g.percentage ?? 0)}%</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">الواجبات المعلّقة</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link href="/student/homework">عرض الكل</Link></Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {d.pendingHomework.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد واجبات معلّقة 🎉</p>
          ) : (
            d.pendingHomework.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.homework?.title}</p>
                  <p className="text-xs text-muted-foreground">موعد التسليم: {formatDate(s.homework?.deadline)}</p>
                </div>
                <HomeworkBadge status={s.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
