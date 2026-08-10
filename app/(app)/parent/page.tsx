import Link from "next/link";
import { CalendarCheck, GraduationCap, Wallet, ClipboardList, ArrowRight, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { getParentDashboard, requireRole } from "@/services";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const user = requireRole("PARENT");
  const { children, summaries } = await getParentDashboard(user);

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description={`Welcome, ${user.full_name}.`} />
        <EmptyState
          icon={Users}
          title="No children linked yet"
          description="Your account isn't linked to any students yet. Please contact the academy."
        />
      </div>
    );
  }

  const totals = children.reduce(
    (acc, c) => {
      const s = summaries[c.id];
      acc.outstanding += s.outstanding;
      acc.pending += s.pendingHomework;
      acc.grade += s.averageGrade;
      return acc;
    },
    { outstanding: 0, pending: 0, grade: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.full_name.split(" ")[0]}. Here's how your children are doing.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Children" value={children.length} icon={Users} accent="primary" />
        <StatCard label="Avg. grade" value={`${Math.round(totals.grade / children.length)}%`} icon={GraduationCap} accent="info" />
        <StatCard label="Outstanding" value={formatCurrency(totals.outstanding)} icon={Wallet} accent="warning" />
        <StatCard label="Pending homework" value={totals.pending} icon={ClipboardList} accent="destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {children.map((c) => {
          const s = summaries[c.id];
          return (
            <Link key={c.id} href={`/parent/children/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-elevated">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <StudentAvatar name={`${c.first_name} ${c.last_name}`} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{c.first_name} {c.last_name}</p>
                      <p className="text-sm text-muted-foreground">{c.grade} · {c.groups.length} group(s)</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <Metric icon={CalendarCheck} label="Attendance" value={`${s.attendanceRate}%`} />
                    <Metric icon={GraduationCap} label="Avg grade" value={`${s.averageGrade}%`} />
                    <Metric icon={Wallet} label="Outstanding" value={formatCurrency(s.outstanding)} />
                  </div>
                  {s.upcomingLesson && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-2.5 text-xs">
                      <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">Next:</span> <span className="font-medium">{s.upcomingLesson}</span>
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
