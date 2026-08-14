import Link from "next/link";
import { UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateAssistantDialog } from "@/components/assistants/create-assistant-dialog";
import { requireScopedRole, currentTeacherId } from "@/services";
import { teacherGroupScope } from "@/services/_shared";
import { collections } from "@/services/data/store";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TeacherAssistantsPage() {
  const user = await requireScopedRole("TEACHER");
  const tid = currentTeacherId();

  // Groups this teacher can access (owns + assists).
  const scope = teacherGroupScope();
  const accessibleGroups = scope
    ? collections().groups.filter((g) => scope.has(g.id))
    : [];

  // Assistants assigned to those groups.
  const assistantIds = new Set(
    collections()
      .groupAssistants.filter((ga) => accessibleGroups.some((g) => g.id === ga.group_id))
      .map((ga) => ga.teacher_id),
  );
  const assistants = collections().teachers.filter((t) => assistantIds.has(t.id));

  const groupsFor = (teacherId: string) =>
    collections()
      .groupAssistants.filter((ga) => ga.teacher_id === teacherId && accessibleGroups.some((g) => g.id === ga.group_id))
      .map((ga) => collections().groups.find((g) => g.id === ga.group_id))
      .filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="مساعدوني"
        description="يسجّل المساعدون الدخول ببريدهم الخاص ويشاركونك الوصول إلى مجموعاتك."
      >
        <CreateAssistantDialog groups={accessibleGroups} />
      </PageHeader>

      {accessibleGroups.length === 0 ? (
        <EmptyState icon={UsersRound} title="مفيش جروبات معاك صلاحية عليها" description="لإضافة مساعد، يجب أن تكون مالكًا أو مساعدًا في مجموعة واحدة على الأقل. تواصل مع المدير لتخصيص مجموعة لك." />
      ) : assistants.length === 0 ? (
        <EmptyState icon={UsersRound} title="لا يوجد مساعدون بعد" description="أنشئ مساعدًا لمشاركة الوصول إلى مجموعاتك." action={<CreateAssistantDialog groups={accessibleGroups} />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assistants.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar><AvatarFallback>{initials(`${a.first_name} ${a.last_name}`)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.first_name} {a.last_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                  {groupsFor(a.id).map((g: any) => (
                    <Badge key={g.id} variant="secondary">{g.name.split(" — ")[0]}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
