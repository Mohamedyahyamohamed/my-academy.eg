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
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomeworkPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const sp = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k];
  const result = await HomeworkService.listHomework({
    search: sp("search"),
    groupId: sp("group") ?? "ALL",
    page: sp("page") ? Number(sp("page")) : 1,
    pageSize: 12,
  }, user.academy_id, user.id);
  const groups = await GroupsService.listGroups("", user.academy_id, user.id, user.email);
  const submissionCounts = await HomeworkService.submissionStats(
    result.items.map((homework) => homework.id),
    user.academy_id,
  );
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-l from-amber-950 via-orange-950 to-slate-950 p-6 shadow-[0_16px_50px_-20px_rgb(245_158_11/0.45)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,amber_500/0.18),transparent_42%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/10">
              <ClipboardList className={`h-5 w-5 text-amber-300`} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">{ en ? "Homework" : "الواجبات" }</h1>
              <p className="mt-0.5 text-sm text-slate-400">{ en ? "Assign homework to groups and review student submissions." : "حدّد واجبات للمجموعات وراجع تسليمات الطلاب." }</p>
            </div>
          </div>

        </div>
      </div>
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
            const stats = submissionCounts[h.id] ?? { total: 0, submitted: 0, reviewed: 0 };
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
