import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LessonForm } from "@/components/lessons/lesson-form";
import { GroupsService, MiscService, requireRole } from "@/services";

export const dynamic = "force-dynamic";

export default async function NewLessonPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  requireRole("ADMIN", "TEACHER");
  const groups = await GroupsService.listGroups();
  const teachers = await MiscService.listTeachers();
  const defaultGroup =
    typeof searchParams.group === "string" ? searchParams.group : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New lesson"
        description="Schedule a lesson for a group."
        breadcrumbs={[{ label: "Lessons", href: "/lessons" }, { label: "New" }]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" /> Lesson details
          </CardTitle>
          <CardDescription>Filling a group auto-selects its teacher.</CardDescription>
        </CardHeader>
        <CardContent>
          <LessonForm groups={groups} teachers={teachers} defaultGroupId={defaultGroup} />
        </CardContent>
      </Card>
    </div>
  );
}
