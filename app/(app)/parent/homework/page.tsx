import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { HomeworkBadge } from "@/components/shared/badges";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { getParentDashboard, HomeworkService, requireRole } from "@/services";
import { formatDate, fullName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ParentHomeworkPage() {
  const user = requireRole("PARENT");
  const { children } = await getParentDashboard(user);

  // Pre-fetch homework for each child (can't await inside .map()).
  const childHomework = await Promise.all(
    children.map((c) => HomeworkService.homeworkForStudent(c.id)),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="الواجبات" description="الواجبات المُكلَّفة لكل أبنائك." />
      {children.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No data" description="No children linked." />
      ) : (
        <div className="space-y-6">
          {children.map((c, idx) => {
            const hw = childHomework[idx] ?? [];
            return (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <StudentAvatar name={fullName(c)} size="sm" />
                    <p className="font-semibold">{fullName(c)}</p>
                  </div>
                  {hw.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No homework assigned.</p>
                  ) : (
                    <div className="space-y-2">
                      {hw.map((s: any) => (
                        <div key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{s.homework?.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{s.homework?.description}</p>
                            {s.feedback && <p className="mt-1 text-xs"><span className="font-medium">Feedback:</span> {s.feedback}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <HomeworkBadge status={s.status} />
                            <p className="mt-1 text-xs text-muted-foreground">Due {formatDate(s.homework?.deadline)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
