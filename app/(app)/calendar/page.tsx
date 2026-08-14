import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarView } from "@/components/calendar/calendar-view";
import { requireScopedRole, GroupsService, LessonsService } from "@/services";
import { collections } from "@/services/data/store";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await requireScopedRole("TEACHER");
  const lessons = collections().lessons.map((l) => ({
    ...l,
    group: collections().groups.find((g) => g.id === l.group_id),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="التقويم" description="جدول الحصص بصريًا — أسبوعي." />
      <Card>
        <CardContent className="p-4">
          <CalendarView lessons={lessons} />
        </CardContent>
      </Card>
    </div>
  );
}
