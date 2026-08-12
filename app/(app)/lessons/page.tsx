import Link from "next/link";
import { BookOpen, Plus, Clock, Calendar } from "lucide-react";
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
import { LessonsService, GroupsService, requireRole } from "@/services";
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  requireRole("ADMIN", "TEACHER");
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
        <Button asChild><Link href="/lessons/new"><Plus className="h-4 w-4" /> إضافة حصة</Link></Button>
      </PageHeader>

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
          action={<Button asChild><Link href="/lessons/new"><Plus className="h-4 w-4" /> إضافة حصة</Link></Button>}
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
