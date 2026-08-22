import Link from "next/link";
import { cookies } from "next/headers";
import { CalendarCheck, GraduationCap, Wallet, ClipboardList, ArrowRight, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { getParentDashboard, requireScopedRole } from "@/services";
import { formatCurrency } from "@/lib/utils";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const user = await requireScopedRole("PARENT");
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const { children = [], summaries = {} } = await getParentDashboard(user);
  const displayName = user.full_name?.trim() || user.email || (en ? "Parent" : "ولي الأمر");
  const firstName = displayName.split(/\s+/)[0] || displayName;

  if (children.length === 0) {
    return (
      <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
        <PageHeader title={en ? "Dashboard" : "لوحة التحكم"} description={`${en ? "Hello" : "أهلاً"}, ${displayName}.`} showBack={false} />
        <EmptyState
          icon={Users}
          title={en ? "No children linked yet" : "مفيش أبناء مربوطين بعد"}
          description={en ? "Your account is not linked to a student yet. Please contact the academy." : "حسابك غير مرتبط بأي طالب حتى الآن. يُرجى التواصل مع الأكاديمية."}
        />
      </div>
    );
  }

  const totals = children.reduce(
    (acc, c) => {
      const s = summaries[c.id];
      if (!s) return acc;
      acc.outstanding += s.outstanding ?? 0;
      acc.pending += s.pendingHomework ?? 0;
      acc.grade += s.averageGrade ?? 0;
      return acc;
    },
    { outstanding: 0, pending: 0, grade: 0 },
  );

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Dashboard" : "لوحة التحكم"}
        description={`${en ? "Hello" : "أهلاً"}, ${firstName}. ${en ? "Here is the latest about your children." : "إليك آخر أخبار أبنائك."}`}
        showBack={false}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={en ? "Children" : "الأبناء"} value={children.length} icon={Users} accent="primary" />
        <StatCard label={en ? "Average grade" : "متوسط الدرجات"} value={`${Math.round(totals.grade / children.length)}%`} icon={GraduationCap} accent="info" />
        <StatCard label={en ? "Outstanding" : "المتبقي"} value={formatCurrency(totals.outstanding)} icon={Wallet} accent="warning" />
        <StatCard label={en ? "Pending homework" : "الواجبات المعلّقة"} value={totals.pending} icon={ClipboardList} accent="destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {children.map((c) => {
          const s = summaries[c.id] ?? { attendanceRate: 0, averageGrade: 0, outstanding: 0, upcomingLesson: null, pendingHomework: 0 };
          return (
            <Link key={c.id} href={`/parent/children/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-elevated">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <StudentAvatar name={`${c.first_name} ${c.last_name}`} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{c.first_name} {c.last_name}</p>
                      <p className="text-sm text-muted-foreground">{c.grade} · {(c.groups ?? []).length} {en ? "group(s)" : "مجموعة"}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <Metric icon={CalendarCheck} label={en ? "Attendance" : "الحضور"} value={`${s.attendanceRate}%`} />
                    <Metric icon={GraduationCap} label={en ? "Average grade" : "متوسط الدرجات"} value={`${s.averageGrade}%`} />
                    <Metric icon={Wallet} label={en ? "Outstanding" : "المتبقي"} value={formatCurrency(s.outstanding)} />
                  </div>
                  {s.upcomingLesson && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-2.5 text-xs">
                      <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">{en ? "Next:" : "القادم:"}</span> <span className="font-medium">{s.upcomingLesson}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="mt-1 text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
