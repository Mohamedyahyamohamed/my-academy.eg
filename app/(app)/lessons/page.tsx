import Link from "next/link";
import { BookOpen, Plus, Clock, Calendar, UsersRound, ChevronLeft } from "lucide-react";
import { ToolbarRoot, ToolbarSearch, ToolbarSelect, ToolbarActions } from "@/components/shared/toolbar";
import { PaginationBar } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LessonsService, GroupsService, isLimitedAssistant, requireScopedRole } from "@/services";
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
  const limitedAssistant = await isLimitedAssistant(user);
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const sp = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k];

  const result = await LessonsService.listLessons({
    search: sp("search"),
    groupId: sp("group") ?? "ALL",
    upcoming: sp("tab") === "upcoming",
    past: sp("tab") === "past",
    includeCancelled: true,
    page: sp("page") ? Number(sp("page")) : 1,
    pageSize: 10,
  }, user.academy_id, user.id);
  const groups = await GroupsService.listGroups("", user.academy_id, user.id);

  return (
    <div dir={isRTL(lang) ? "rtl" : "ltr"} className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-l from-sky-950 via-cyan-950 to-slate-950 p-6 shadow-[0_16px_50px_-20px_rgb(14_165_233/0.45)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,sky_500/0.18),transparent_42%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/10">
              <BookOpen className={`h-5 w-5 text-sky-300`} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">{ en ? "Lessons" : "الحصص" }</h1>
              <p className="mt-0.5 text-sm text-slate-400">{ en ? "Schedule and track lessons across all your groups." : "جدوِل وتابع الحصص عبر كل مجموعاتك." }</p>
            </div>
          </div>
          {en !== null && (
            <Button asChild disabled={groups.length === 0}>
              <Link href={groups.length === 0 ? "/groups" : "/lessons/new"}>
                <Plus className="h-4 w-4" />
                {groups.length === 0 ? (en ? "Create a group first" : "أنشئ مجموعة أولًا") : (en ? "Add lesson" : "إضافة حصة")}
              </Link>
            </Button>
          )}
        </div>
      </div>

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
          action={limitedAssistant ? undefined : groups.length === 0 ? <Button asChild><Link href="/groups"><UsersRound className="h-4 w-4" /> {en ? "Create a group first" : "إنشاء مجموعة أولًا"}</Link></Button> : <Button asChild><Link href="/lessons/new"><Plus className="h-4 w-4" /> {en ? "Add lesson" : "إضافة حصة"}</Link></Button>}
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
                  <TableHead className="w-10"><span className="sr-only">{en ? "Open" : "فتح"}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((l) => (
                  <TableRow key={l.id} className={`group border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-border dark:hover:bg-accent/40 ${l.status === "canceled" ? "bg-muted/40 text-muted-foreground line-through decoration-muted-foreground/60" : "cursor-pointer"}`}>
                    <TableCell className="font-medium">
                      <Link href={`/lessons/${l.id}`} className="hover:text-primary">
                        {l.topic?.trim() ? l.topic : <span className="text-gray-400 italic">{en ? "Untitled" : "بدون عنوان"}</span>}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.group?.name}</TableCell>
                    <TableCell className="text-sm">{formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")}</TableCell>
                    <TableCell className="text-sm"><span dir="ltr" className="whitespace-nowrap">{formatTimeRange(l.start_time, l.end_time, en ? "en-EG" : "ar-EG")}</span></TableCell>
                    <TableCell>
                      <Badge variant={l.status === "canceled" ? "destructive" : "outline"} className={l.status === "canceled" ? undefined : l.attendance_taken ? "rounded-full border-green-200 bg-green-100 px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300" : "rounded-full border-yellow-200 bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700 hover:bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300"}>
                        {l.status === "canceled" ? (en ? "Canceled — excluded" : "ملغاة — مستبعدة") : l.status === "completed" ? (en ? "Completed" : "مكتملة") : l.attendance_taken ? (en ? "Recorded" : "تم تسجيله") : (en ? "Pending" : "معلّق")}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-10 p-0">
                      <Link href={`/lessons/${l.id}`} className="flex h-10 w-10 items-center justify-center" aria-label={en ? "Open lesson" : "فتح الحصة"}>
                        <ChevronLeft className="h-4 w-4 text-gray-300 transition-colors group-hover:text-indigo-500" aria-hidden="true" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {result.items.map((l) => (
              <Link key={l.id} href={`/lessons/${l.id}`} className={`group card-surface block border border-transparent p-4 transition-colors hover:border-gray-100 hover:bg-gray-50 dark:hover:border-border dark:hover:bg-accent/40 ${l.status === "canceled" ? "bg-muted/40 text-muted-foreground line-through decoration-muted-foreground/60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium">{l.topic?.trim() ? l.topic : <span className="text-gray-400 italic">{en ? "Untitled" : "بدون عنوان"}</span>}</p>
                  <Badge variant={l.status === "canceled" ? "destructive" : "outline"} className={l.status === "canceled" ? undefined : l.attendance_taken ? "shrink-0 rounded-full border-green-200 bg-green-100 px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300" : "shrink-0 rounded-full border-yellow-200 bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700 hover:bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300"}>
                    {l.status === "canceled" ? (en ? "Canceled — excluded" : "ملغاة — مستبعدة") : l.status === "completed" ? (en ? "Completed" : "مكتملة") : l.attendance_taken ? (en ? "Recorded" : "تم تسجيله") : (en ? "Pending" : "معلّق")}
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
