import { Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read";
import { NotificationsService, requireRole } from "@/services";
import { cn, formatRelative } from "@/lib/utils";
import type { NotificationType } from "@/types";

const dotColor: Record<NotificationType, string> = {
  payment_overdue: "bg-rose-500",
  payment_received: "bg-emerald-500",
  homework_assigned: "bg-sky-500",
  homework_reviewed: "bg-violet-500",
  homework_deadline: "bg-amber-500",
  new_grade: "bg-violet-500",
  upcoming_lesson: "bg-indigo-500",
  attendance: "bg-teal-500",
  system: "bg-slate-400",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = requireRole("ADMIN", "TEACHER", "PARENT", "STUDENT");
  const items = await NotificationsService.listNotifications(user.id);

  return (
    <div className="space-y-6">
      <PageHeader title="الإشعارات" description="كل تحديثاتك وتنبيهاتك الأخيرة.">
        <MarkAllReadButton />
      </PageHeader>
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You'll see updates here as they happen." />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {items.map((n) => (
              <div key={n.id} className={cn("flex items-start gap-3 p-4", !n.read && "bg-primary/[0.03]")}>
                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", dotColor[n.type])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(n.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                </div>
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
