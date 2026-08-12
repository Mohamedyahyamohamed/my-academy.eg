import Link from "next/link";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { getParentDashboard, requireRole } from "@/services";
import { formatCurrency, fullName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ParentChildrenPage() {
  const user = requireRole("PARENT");
  const { children, summaries } = await getParentDashboard(user);

  return (
    <div className="space-y-6">
      <PageHeader title="My Children" description="Click a child to view their full profile." />
      {children.length === 0 ? (
        <EmptyState icon={Users} title="No children linked" description="Contact the academy to link your children." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {children.map((c) => {
            const s = summaries[c.id] ?? {} as any;
            return (
              <Link key={c.id} href={`/parent/children/${c.id}`}>
                <Card className="h-full transition-shadow hover:shadow-elevated">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={fullName(c)} />
                      <div className="min-w-0">
                        <p className="font-semibold">{fullName(c)}</p>
                        <p className="text-sm text-muted-foreground">{c.grade}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(c.groups ?? []).map((g) => <Badge key={g.id} variant="secondary">{g.name.split(" — ")[0]}</Badge>)}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Attendance</p><p className="font-semibold">{s.attendanceRate}%</p></div>
                      <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-semibold">{formatCurrency(s.outstanding)}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
