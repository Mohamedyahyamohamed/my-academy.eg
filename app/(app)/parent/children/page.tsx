import Link from "next/link";
import { cookies } from "next/headers";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { getParentDashboard, requireScopedRole } from "@/services";
import { formatCurrency, fullName } from "@/lib/utils";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ParentChildrenPage() {
  const user = await requireScopedRole("PARENT");
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const { children, summaries } = await getParentDashboard(user);

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader title={en ? "My children" : "أبنائي"} description={en ? "Choose a child to view their complete profile." : "اختر أحد الأبناء لعرض ملفه الكامل."} />
      {children.length === 0 ? (
        <EmptyState icon={Users} title={en ? "No children linked" : "لا يوجد أبناء مرتبطون"} description={en ? "Contact the academy to link children to your account." : "تواصل مع الأكاديمية لربط الأبناء بحسابك."} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {children.map((c) => {
            const s = summaries[c.id] ?? {} as any;
            return (
              <Link key={c.id} href={`/parent/children/${c.id}`}>
                <Card className="h-full transition-shadow hover:shadow-elevated">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={fullName(c)} />
                      <div className="min-w-0">
                        <p className="font-semibold">{fullName(c)}</p>
                        <p className="text-sm text-muted-foreground">{c.grade}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(c.groups ?? []).map((g) => <Badge key={g.id} variant="secondary">{g.name.split(" — ")[0]}</Badge>)}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">{en ? "Attendance" : "الحضور"}</p><p className="font-semibold">{s.attendanceRate}%</p></div>
                      <div><p className="text-xs text-muted-foreground">{en ? "Outstanding" : "المتبقي"}</p><p className="font-semibold">{formatCurrency(s.outstanding)}</p></div>
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
