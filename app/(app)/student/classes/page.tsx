import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveStudent, requireScopedRole } from "@/services";
import { groupsForStudent } from "@/services/_shared";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentClassesPage() {
  const user = await requireScopedRole("STUDENT");
  const student = resolveStudent(user);
  const groups = student ? groupsForStudent(student.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="حصصي" description="المجموعات المسجّل بها." />
      {groups.length === 0 ? (
        <EmptyState icon={BookOpen} title="لا توجد مجموعات" description="أنت غير مسجّل في أي مجموعة حتى الآن." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white" style={{ background: g.course?.color ?? "#7c5cfc" }}>
                      {g.course?.name?.[0] ?? "G"}
                    </span>
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.course?.name}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{formatCurrency(g.monthly_fee)}/شهريًا</Badge>
                </div>
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                  <p>الموعد: {g.schedule}</p>
                  {g.room && <p>القاعة: {g.room}</p>}
                </div>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link href="/student/lessons">عرض الحصص</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
