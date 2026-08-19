import Link from "next/link";
import { BookOpen, Plus, Clock, Calendar, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ToolbarRoot, ToolbarSearch, ToolbarSelect, ToolbarActions } from "@/components/shared/toolbar";
import { PaginationBar } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LessonsService, GroupsService, requireScopedRole } from "@/services";
import { formatDate, formatTimeRange, formatClockTime } from "@/lib/utils";
import { cookies } from "next/headers";
import { getLangFromCookie, isRTL } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LessonsPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await requireScopedRole("TEACHER");
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const sp = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k];

  const result = await LessonsService.listLessons({
    search: sp("search"),
    groupId: sp("group") ?? "ALL",
    upcoming: sp("tab") === "upcoming",
    past: sp("tab") === "past",
    page: sp("page") ? Number(sp("page")) : 1,
    pageSize: 10,
  }, user.academy_id, user.id);
  const groups = await GroupsService.listGroups("", user.academy_id, user.id);

  return (
    <div dir={isRTL(lang) ? "rtl" : "ltr"} className="space-y-6">
      <PageHeader
        title={en ? "Lessons" : "الحصص"}
        description={en ? "Schedule and track lessons across all your groups." : "جدوِل وتابع الحصص عبر كل مجموعاتك."}
      >
        <Button asChild disabled={groups.length === 0}><Link href={groups.length === 0 ? "/groups" : "/lessons/new"}><Plus className="h-4 w-4" /> {groups.length === 0 ? (en ? "Create a group first" : "أنشئ مجموعة أولًا") : (en ? "Add lesson" : "إضافة حصة")}</Link></Button>
      </PageHeader>

      {groups.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <UsersRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div>
                <p className="font-medium">{en ? "A lesson cannot be scheduled without a group" : "لا يمكن جدولة حصة بدون مجموعة"}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{en ? "Create a group, assign its teacher and schedule, then you can add lessons, record attendance, and assign homework." : "أنشئ مجموعة أولًا وحدد مدرسها وموعدها، ثم ستتمكن من إضافة الحصص وتسجيل الحضور والواجبات."}</p>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0"><Link href="/groups">{en ? "Go to groups" : "الانتقال إلى المجموعات"}</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="card-surface p-4">
        <ToolbarRoot>
          <ToolbarSearch placeholder={en ? "Search lesson topics…" : "ابحث في موضوعات الحصص…"} />
          <ToolbarSelect paramKey="tab" label={en ? "Filter by time" : "تصفية حسب الوقت"} options={[
            { value: "ALL", label: en ? "All lessons" : "كل الحصص" },
            { value: "upcoming", label: en ? "Upcoming" : "القادمة" },
            { value: "past", label: en ? "Past" : "السابقة" },
          ]} />
        </ToolbarRoot>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={en ? "No lessons yet" : "لا توجد حصص بعد"}
          description={en ? "Add your first lesson to record attendance and assign homework." : "أضف أول حصة لتسجيل الحضور وتكليف الواجبات."}
          action={groups.length === 0 ? <Button asChild><Link href="/groups"><UsersRound className="h-4 w-4" /> {en ? "Create a group first" : "إنشاء مجموعة أولًا"}</Link></Button> : <Button asChild><Link href="/lessons/new"><Plus className="h-4 w-4" /> {en ? "Add lesson" : "إضافة حصة"}</Link></Button>}
        />
      ) : (
        <>
          <div className="card-surface hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{en ? "Topic" : "الموضوع"}</TableHead>
                  <TableHead>{en ? "Group" : "المجموعة"}</TableHead>
                  <TableHead>{en ? "Date" : "التاريخ"}</TableHead>
                  <TableHead>{en ? "Time" : "الوقت"}</TableHead>
                  <TableHead>{en ? "Attendance" : "الحضور"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <Link href={`/lessons/${l.id}`} className="hover:text-primary">{l.topic}</Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.group?.name}</TableCell>
                    <TableCell className="text-sm">{formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")}</TableCell>
                    <TableCell className="text-sm"><span dir="ltr" className="whitespace-nowrap">{formatTimeRange(l.start_time, l.end_time, en ? "en-EG" : "ar-EG")}</span></TableCell>
                    <TableCell>
                      <Badge variant={l.attendance_taken ? "success" : "outline"}>
                        {l.attendance_taken ? (en ? "Recorded" : "تم تسجيله") : (en ? "Pending" : "معلّق")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {result.items.map((l) => (
              <Link key={l.id} href={`/lessons/${l.id}`} className="card-surface block p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{l.topic}</p>
                  <Badge variant={l.attendance_taken ? "success" : "outline"}>
                    {l.attendance_taken ? (en ? "Recorded" : "تم تسجيله") : (en ? "Pending" : "معلّق")}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{l.group?.name}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> <span dir="ltr">{formatClockTime(l.start_time, en ? "en-EG" : "ar-EG")}</span></span>
                </div>
              </Link>
            ))}
          </div>

          <PaginationBar pagination={result.pagination} />
        </>
      )}
    </div>
  );
}
