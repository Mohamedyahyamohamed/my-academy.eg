import Link from "next/link";
import { Phone, Mail, Briefcase, UsersRound, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParentAvatar } from "@/components/shared/parent-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { listParents } from "@/services/misc";
import { requireScopedRole } from "@/services";
import { collections } from "@/services/data/store";
import { fullName } from "@/services/_shared";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ParentsPage() {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const parents = await listParents();
  const students = collections().students;

  const childrenCount = (parentId: string) =>
    students.filter((s) => s.parent_id === parentId).length;

  const t = {
    title: en ? "Parents" : "أولياء الأمور",
    subtitle: en
      ? "Manage parent contacts and linked students."
      : "إدارة بيانات أولياء الأمور والطلاب المرتبطين بهم.",
    add: en ? "Add parent" : "إضافة ولي أمر",
    noParents: en ? "No parents yet" : "لا يوجد أولياء أمور بعد",
    noParentsHint: en
      ? "Add a parent from a student's profile."
      : "أضف ولي أمر من ملف الطالب.",
    children: en ? "children" : "ابن",
    email: en ? "Email" : "البريد الإلكتروني",
    phone: en ? "Phone" : "الهاتف",
    occupation: en ? "Occupation" : "الوظيفة",
  };

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={t.title}
        description={t.subtitle}
      >
        <Button asChild variant="premium">
          <Link href="/students">
            <Plus className="h-4 w-4" />
            {t.add}
          </Link>
        </Button>
      </PageHeader>

      {parents.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={t.noParents}
          description={t.noParentsHint}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parents.map((p) => {
            const count = childrenCount(p.id);
            return (
              <Link key={p.id} href={`/parents/${p.id}`} className="block">
                <Card className="card-soft transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex items-start gap-4 p-4">
                    <ParentAvatar parent={p} className="h-12 w-12 text-base" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{fullName(p)}</p>
                        {count > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                            <UsersRound className="h-3 w-3" />
                            {count} {t.children}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                        {p.email && (
                          <span className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{p.email}</span>
                          </span>
                        )}
                        {p.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {p.phone}
                          </span>
                        )}
                        {p.occupation && (
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 shrink-0" />
                            {p.occupation}
                          </span>
                        )}
                      </div>
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
