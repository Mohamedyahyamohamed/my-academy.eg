import Link from "next/link";
import { Users, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ToolbarRoot, ToolbarSearch, ToolbarSelect, ToolbarActions } from "@/components/shared/toolbar";
import { PaginationBar } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { StudentStatusBadge } from "@/components/shared/badges";
import { AddStudentDialog, EditStudentDialog } from "@/components/students/student-dialogs";
import { CreateAccountsButton } from "@/components/students/create-accounts-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudentsService, GroupsService, MiscService, requireScopedRole } from "@/services";
import { archiveStudentAction } from "@/app/actions/students";
import type { StudentFilters } from "@/types";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StudentsPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const sp = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k];

  const filters: StudentFilters = {
    search: sp("search"),
    status: (sp("status") as StudentFilters["status"]) ?? "ALL",
    groupId: sp("group") ?? "ALL",
    page: sp("page") ? Number(sp("page")) : 1,
    pageSize: 8,
    sortBy: "name",
    sortDir: "asc",
  };

  const result = await StudentsService.listStudents(filters, user.academy_id);
  const groups = await GroupsService.listGroups("", user.academy_id);
  const parents = await MiscService.listParents(user.academy_id);

  const groupOptions = [
    { value: "ALL", label: en ? "All groups" : "كل المجموعات" },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ];

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Students" : "الطلاب"}
        description={en ? "Manage student profiles, enrollment, and status in your academy." : "إدارة ملفات الطلاب والتسجيل والحالة في أكاديميتك."}
      >
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/students/import">{en ? "Import from Excel" : "استيراد من Excel"}</Link>
          </Button>
          <CreateAccountsButton />
          <AddStudentDialog parents={parents} groups={groups} />
        </div>
      </PageHeader>

      <div className="card-surface p-4">
        <ToolbarRoot>
          <ToolbarSearch placeholder={en ? "Search by name, phone, or school…" : "بحث بالاسم أو الموبايل أو المدرسة…"} />
          <ToolbarSelect paramKey="status" label={en ? "Filter by status" : "تصفية بالحالة"} options={[
            { value: "ALL", label: en ? "All statuses" : "كل الحالات" },
            { value: "ACTIVE", label: en ? "Active" : "نشط" },
            { value: "INACTIVE", label: en ? "Inactive" : "غير نشط" },
            { value: "ARCHIVED", label: en ? "Archived" : "مؤرشف" },
          ]} />
          <ToolbarSelect paramKey="group" label={en ? "Filter by group" : "تصفية بمجموعة"} options={groupOptions} />
        </ToolbarRoot>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={en ? "No students yet" : "لا يوجد طلاب بعد"}
          description={en ? "Add your first student to start tracking attendance, payments, and grades." : "أضف أول طالب لبدء متابعة الحضور والمصاريف والدرجات."}
          action={<AddStudentDialog parents={parents} groups={groups} />}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="card-surface hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{en ? "Student" : "الطالب"}</TableHead>
                  <TableHead>{en ? "Parent" : "ولي الأمر"}</TableHead>
                  <TableHead>{en ? "Grade" : "الصف الدراسي"}</TableHead>
                  <TableHead>{en ? "Groups" : "المجموعات"}</TableHead>
                  <TableHead>{en ? "Status" : "الحالة"}</TableHead>
                  <TableHead className="text-left">{en ? "Actions" : "إجراءات"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/students/${s.id}`} className="flex items-center gap-3">
                        <StudentAvatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {s.first_name} {s.last_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.phone || s.school || "—"}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.parent ? (
                        <Link href={`/parents/${s.parent.id}`} className="font-medium text-primary hover:underline">
                          {s.parent.first_name} {s.parent.last_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{s.grade || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(s.groups ?? []).slice(0, 2).map((g) => (
                          <Badge key={g.id} variant="secondary" className="font-normal">
                            {g.name.split(" — ")[0]}
                          </Badge>
                        ))}
                        {(s.groups ?? []).length > 2 && (
                          <Badge variant="outline" className="font-normal">
                            +{(s.groups ?? []).length - 2}
                          </Badge>
                        )}
                        {(s.groups ?? []).length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StudentStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center justify-start gap-1">
                        <Button asChild variant="ghost" size="icon-sm" aria-label={en ? "View" : "عرض"}>
                          <Link href={`/students/${s.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <EditStudentDialog student={s} parents={parents} groups={groups} />
                        {s.status !== "ARCHIVED" && (
                          <ConfirmDialog
                            destructive
                            trigger={
                              <Button variant="ghost" size="icon-sm" aria-label={en ? "Archive" : "أرشفة"}>
                                <span className="sr-only">{en ? "Archive" : "أرشفة"}</span>
                              </Button>
                            }
                            title={en ? "Archive student?" : "أرشفة الطالب؟"}
                            description={en ? `${s.first_name} ${s.last_name} will be hidden from active lists while their data is retained.` : `سيُخفى ${s.first_name} ${s.last_name} من القوائم النشطة مع الاحتفاظ ببياناته.`}
                            confirmLabel={en ? "Archive" : "أرشفة"}
                            onConfirm={archiveStudentAction.bind(null, s.id)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {result.items.map((s) => (
              <Link key={s.id} href={`/students/${s.id}`} className="card-surface block p-4">
                <div className="flex items-start gap-3">
                  <StudentAvatar name={`${s.first_name} ${s.last_name}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">
                        {s.first_name} {s.last_name}
                      </p>
                      <StudentStatusBadge status={s.status} />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {s.grade || s.school || "—"}
                    </p>
                    {s.parent && (
                      <p className="truncate text-xs text-muted-foreground">
                        {en ? "Parent: " : "ولي الأمر: "}{s.parent.first_name} {s.parent.last_name}
                      </p>
                    )}
                  </div>
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
