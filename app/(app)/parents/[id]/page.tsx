import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { ArrowLeft, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { StudentStatusBadge } from "@/components/shared/badges";
import { requireScopedRole } from "@/services";
import { teacherStudentScope } from "@/services/_shared";
import { StudentsService } from "@/services";

export const dynamic = "force-dynamic";

export default async function ParentDetailPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ studentId?: string }>;
  }
) {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = await createServerSupabaseClient();

  const { data: parent } = await client
    .from("parents")
    .select("*")
    .eq("id", params.id)
    .eq("academy_id", user.academy_id)
    .maybeSingle();
  if (!parent) notFound();

  const { data: rawChildren } = await client
    .from("students")
    .select("id,first_name,last_name,grade,status")
    .eq("parent_id", params.id)
    .eq("academy_id", user.academy_id);
  const teacherScope = user.role === "TEACHER" ? (teacherStudentScope() ?? new Set<string>()) : null;
  let children = (rawChildren ?? []).filter((child: any) => !teacherScope || teacherScope.has(child.id));

  // The parent link can originate from a student profile that the teacher is
  // already allowed to view. Carry that student id so a stale in-memory scope
  // cannot turn a valid parent link into a false 404. Re-validate the student
  // through the normal tenant- and teacher-scoped service before using it.
  if (user.role === "TEACHER" && children.length === 0 && searchParams.studentId) {
    const sourceStudent = await StudentsService.getStudentDetail(searchParams.studentId);
    if (sourceStudent?.parent_id === params.id) {
      children = (rawChildren ?? []).filter((child: any) => child.id === sourceStudent.id);
    }
  }

  if (user.role === "TEACHER" && children.length === 0) notFound();

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader title={`${parent.first_name} ${parent.last_name}`} description={en ? "Parent profile" : "ملف ولي الأمر"} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{en ? "Parent information" : "بيانات ولي الأمر"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{en ? "Email:" : "الإيميل:"}</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{parent.email}</code>
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{en ? "Phone:" : "الموبايل:"}</span>
            {parent.phone || "—"}
          </p>
          {parent.occupation && (
            <p className="text-muted-foreground">{en ? "Occupation:" : "الوظيفة:"} {parent.occupation}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{en ? "Children" : "الأبناء"} ({children?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {(children ?? []).map((c: any) => (
              <Link
                key={c.id}
                href={`/students/${c.id}`}
                className="flex items-center gap-3 p-4 hover:bg-accent/50"
              >
                <StudentAvatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                <div className="flex-1">
                  <p className="font-medium">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-muted-foreground">{c.grade || "—"}</p>
                </div>
                <StudentStatusBadge status={c.status} />
              </Link>
            ))}
            {(!children || children.length === 0) && (
              <p className="p-6 text-center text-sm text-muted-foreground">{en ? "No children are linked to this parent." : "مفيش أبناء مربوطين بولي الأمر ده."}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/students"><ArrowLeft className="me-2 h-4 w-4" /> {en ? "Back to students" : "رجوع للطلاب"}</Link>
      </Button>
    </div>
  );
}
