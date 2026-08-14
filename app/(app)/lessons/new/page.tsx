import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LessonForm } from "@/components/lessons/lesson-form";
import { GroupsService, MiscService, requireScopedRole } from "@/services";

export const dynamic = "force-dynamic";

export default async function NewLessonPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  await requireScopedRole("TEACHER");
  const groups = await GroupsService.listGroups();
  const teachers = await MiscService.listTeachers();
  const defaultGroup =
    typeof searchParams.group === "string" ? searchParams.group : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="حصة جديدة"
        description="حدّد موعد حصة لإحدى المجموعات."
        breadcrumbs={[{ label: "الحصص", href: "/lessons" }, { label: "جديد" }]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" /> تفاصيل الحصة
          </CardTitle>
          <CardDescription>اختيار المجموعة يحدد معلّمها تلقائيًا.</CardDescription>
        </CardHeader>
        <CardContent>
          <LessonForm groups={groups} teachers={teachers} defaultGroupId={defaultGroup} />
        </CardContent>
      </Card>
    </div>
  );
}
