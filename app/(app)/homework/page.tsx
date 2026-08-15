import Link from "next/link";
import { ClipboardList, Calendar, Users } from "lucide-react";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { PageHeader } from "@/components/shared/page-header";
import { ToolbarRoot, ToolbarSearch, ToolbarSelect, ToolbarActions } from "@/components/shared/toolbar";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateHomeworkDialog } from "@/components/homework/create-homework-dialog";
import { HomeworkService, GroupsService, requireScopedRole } from "@/services";
import { collections } from "@/services/data/store";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomeworkPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await requireScopedRole("TEACHER");
  const sp = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k];
  const result = await HomeworkService.listHomework({
    search: sp("search"),
    groupId: sp("group") ?? "ALL",
    page: sp("page") ? Number(sp("page")) : 1,
    pageSize: 12,
  }, user.academy_id, user.id);
  const groups = await GroupsService.listGroups("", user.academy_id);
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";

  const subStats = (hwId: string) => {
    const subs = collections().submissions.filter((s) => s.homework_id === hwId);
    return {
      total: subs.length,
      submitted: subs.filter((s) => s.status !== "PENDING").length,
      reviewed: subs.filter((s) => s.status === "REVIEWED").length,
    };
  };

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Homework" : "الواجبات"}
        description={en ? "Assign homework to groups and review student submissions." : "حدّد واجبات للمجموعات وراجع تسليمات الطلاب."}
      >
        <CreateHomeworkDialog groups={groups} />
      </PageHeader>

      <div className="card-surface p-4">
        <ToolbarRoot>
          <ToolbarSearch placeholder={en ? "Search homework…" : "ابحث في الواجبات…"} />
          <ToolbarSelect paramKey="group" label={en ? "Filter by group" : "تصفية بمجموعة"} options={[
            { value: "ALL", label: en ? "All groups" : "كل المجموعات" },
            ...groups.map((g) => ({ value: g.id, label: g.name })),
          ]} />
        </ToolbarRoot>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={en ? "No homework yet" : "لا توجد واجبات بعد"}
          description={en ? "Assign the first homework to a group." : "حدّد أول واجب لإحدى المجموعات."}
          action={<CreateHomeworkDialog groups={groups} />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.items.map((h) => {
            const stats = subStats(h.id);
            const overdue = new Date(h.deadline).getTime() < Date.now();
            return (
              <Link key={h.id} href={`/homework/${h.id}`}>
                <Card className="h-full transition-shadow hover:shadow-elevated">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{h.title}</p>
                      <Badge variant={overdue ? "destructive" : "secondary"}>
                        <Calendar className="h-3 w-3" /> {formatDate(h.deadline, undefined, en ? "en-EG" : "ar-EG")}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{h.description}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{h.group?.name}</p>
                    <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {stats.submitted}/{stats.total} {en ? "submitted" : "تم التسليم"}
                      </span>
                      <span className="text-muted-foreground">{stats.reviewed} {en ? "reviewed" : "تمت المراجعة"}</span>
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
