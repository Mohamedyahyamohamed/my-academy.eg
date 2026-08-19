import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ToolbarRoot, ToolbarSearch } from "@/components/shared/toolbar";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { requireScopedRole } from "@/services";
import { listAuditLogs } from "@/services/audit";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const user = await requireScopedRole("ADMIN");
  const sp = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k];

  const result = await listAuditLogs({
    search: sp("search"),
    action: sp("action") ?? "ALL",
    entity_type: sp("entity") ?? "ALL",
    page: sp("page") ? Number(sp("page")) : 1,
    pageSize: 30,
  }, user.academy_id);

  const actionColor = (a: string) =>
    a.includes("create") ? "success" : a.includes("delete") || a.includes("archive") ? "destructive" : a.includes("update") || a.includes("record") || a.includes("save") ? "info" : "secondary";

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader title={en ? "Audit log" : "سجل العمليات"} description={en ? "Track all sensitive operations in the academy." : "تتبّع كل العمليات الحساسة في الأكاديمية."} />
      <div className="card-surface p-4">
        <ToolbarRoot>
          <ToolbarSearch placeholder={en ? "Search logs…" : "بحث في السجلات…"} />
        </ToolbarRoot>
      </div>
      {result.items.length === 0 ? (
        <EmptyState icon={ScrollText} title={en ? "No logs yet" : "مفيش سجلات لسه"} description={en ? "Student, payment, and grade operations will appear here." : "عمليات إنشاء/تعديل الطلاب والمدفوعات والدرجات هتظهر هنا."} />
      ) : (
        <div className="card-surface overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{en ? "Action" : "العملية"}</TableHead>
                <TableHead>{en ? "Type" : "النوع"}</TableHead>
                <TableHead>{en ? "User" : "المستخدم"}</TableHead>
                <TableHead>{en ? "Time" : "الوقت"}</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell><Badge variant={actionColor(log.action) as any}>{log.action}</Badge></TableCell>
                  <TableCell className="text-sm">{log.entity_type} {log.entity_id ? `· ${log.entity_id.slice(0, 8)}…` : ""}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.actor_name ? `${log.actor_name} · ` : ""}{log.actor_role ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString(en ? "en-GB" : "ar-EG")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.ip ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
