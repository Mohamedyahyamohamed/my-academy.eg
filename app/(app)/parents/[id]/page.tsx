import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { StudentStatusBadge } from "@/components/shared/badges";
import { requireScopedRole } from "@/services";

export const dynamic = "force-dynamic";

export default async function ParentDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  await requireScopedRole("ADMIN", "TEACHER");
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = await createServerSupabaseClient();

  const { data: parent } = await client
    .from("parents")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!parent) notFound();

  const { data: children } = await client
    .from("students")
    .select("id,first_name,last_name,grade,status")
    .eq("parent_id", params.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`${parent.first_name} ${parent.last_name}`} description="ملف ولي الأمر" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات ولي الأمر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">الإيميل:</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{parent.email}</code>
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">الموبايل:</span>
            {parent.phone || "—"}
          </p>
          {parent.occupation && (
            <p className="text-muted-foreground">الوظيفة: {parent.occupation}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الأبناء ({children?.length ?? 0})</CardTitle>
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
              <p className="p-6 text-center text-sm text-muted-foreground">مفيش أبناء مربوطين بولي الأمر ده.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/students"><ArrowLeft className="mr-2 h-4 w-4" /> رجوع للطلاب</Link>
      </Button>
    </div>
  );
}
