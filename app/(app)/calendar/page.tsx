import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarView } from "@/components/calendar/calendar-view";
import { requireScopedRole, GroupsService, LessonsService } from "@/services";
import { collections } from "@/services/data/store";
import { cookies } from "next/headers";
import { getLangFromCookie, isRTL } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await requireScopedRole("TEACHER");
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const lessons = collections().lessons.map((l) => ({
    ...l,
    group: collections().groups.find((g) => g.id === l.group_id),
  }));

  return (
    <div dir={isRTL(lang) ? "rtl" : "ltr"} className="space-y-6">
      <PageHeader title={en ? "Calendar" : "التقويم"} description={en ? "Visual weekly lesson schedule." : "جدول الحصص بصريًا — أسبوعي."} />
      <Card>
        <CardContent className="p-4">
          <CalendarView lessons={lessons} />
        </CardContent>
      </Card>
    </div>
  );
}
