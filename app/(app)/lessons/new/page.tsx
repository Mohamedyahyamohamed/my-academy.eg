import { BookOpen } from "lucide-react";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
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
  const user = await requireScopedRole("TEACHER");
  const groups = await GroupsService.listGroups("", user.academy_id, user.id);
  const teachers = await MiscService.listTeachers(user.academy_id);
  const defaultGroup =
    typeof searchParams.group === "string" ? searchParams.group : undefined;
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";

  return (
    <div className="mx-auto max-w-2xl space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "New lesson" : "حصة جديدة"}
        description={en ? "Schedule a lesson for one of your groups." : "حدّد موعد حصة لإحدى المجموعات."}
        breadcrumbs={[{ label: en ? "Lessons" : "الحصص", href: "/lessons" }, { label: en ? "New" : "جديد" }]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" /> {en ? "Lesson details" : "تفاصيل الحصة"}
          </CardTitle>
          <CardDescription>{en ? "Selecting a group automatically determines its teacher." : "اختيار المجموعة يحدد معلّمها تلقائيًا."}</CardDescription>
        </CardHeader>
        <CardContent>
          <LessonForm groups={groups} teachers={teachers} defaultGroupId={defaultGroup} />
        </CardContent>
      </Card>
    </div>
  );
}
