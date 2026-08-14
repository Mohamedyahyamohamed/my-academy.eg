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
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LessonsPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  await requireScopedRole("ADMIN", "TEACHER");
  const sp = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k];

  const result = await LessonsService.listLessons({
    search: sp("search"),
    groupId: sp("group") ?? "ALL",
    upcoming: sp("tab") === "upcoming",
    past: sp("tab") === "past",
    page: sp("page") ? Number(sp("page")) : 1,
    pageSize: 10,
  });
  const groups = await GroupsService.listGroups();

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحصص"
        description="جدوِل وتابع الحصص عبر كل مجموعاتك."
      >
        <Button asChild disabled={groups.length === 0}><Link href={groups.length === 0 ? "/groups" : "/lessons/new"}><Plus className="h-4 w-4" /> {groups.length === 0 ? "أنشئ مجموعة أولًا" : "إضافة حصة"}</Link></Button>
      </PageHeader>

      {groups.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <UsersRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div>
                <p className="font-medium">لا يمكن جدولة حصة بدون مجموعة</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">أنشئ مجموعة أولًا وحدد مدرسها وموعدها، ثم ستتمكن من إضافة الحصص وتسجيل الحضور والواجبات.</p>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0"><Link href="/groups">الانتقال إلى المجموعات</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="card-surface p-4">
        <ToolbarRoot>
          <ToolbarSearch placeholder="ابحث في موضوعات الحصص…" />
          <ToolbarSelect paramKey="tab" label="تصفية حسب الوقت" options={[
            { value: "ALL", label: "كل الحصص" },
            { value: "upcoming", label: "القادمة" },
            { value: "past", label: "السابقة" },
          ]} />
        </ToolbarRoot>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="لا توجد حصص بعد"
          description="أضف أول حصة لتسجيل الحضور وتكليف الواجبات."
          action={groups.length === 0 ? <Button asChild><Link href="/groups"><UsersRound className="h-4 w-4" /> إنشاء مجموعة أولًا</Link></Button> : <Button asChild><Link href="/lessons/new"><Plus className="h-4 w-4" /> إضافة حصة</Link></Button>}
        />
      ) : (
        <>
          <div className="card-surface hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموضوع</TableHead>
                  <TableHead>المجموعة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الوقت</TableHead>
                  <TableHead>الحضور</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <Link href={`/lessons/${l.id}`} className="hover:text-primary">{l.topic}</Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.group?.name}</TableCell>
                    <TableCell className="text-sm">{formatDate(l.date)}</TableCell>
                    <TableCell className="text-sm">{formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`)}</TableCell>
                    <TableCell>
                      <Badge variant={l.attendance_taken ? "success" : "outline"}>
                        {l.attendance_taken ? "تم تسجيله" : "معلّق"}
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
                    {l.attendance_taken ? "تم تسجيله" : "معلّق"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{l.group?.name}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(l.date)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {l.start_time}</span>
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
