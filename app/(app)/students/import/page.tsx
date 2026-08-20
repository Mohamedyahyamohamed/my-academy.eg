import { cookies } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { requireScopedRole } from "@/services";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { ImportStudents } from "@/components/students/import-students";

export const dynamic = "force-dynamic";

export default async function ImportStudentsPage() {
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const client = nodeSupabaseClient();
  const academies = user.role === "SUPER_ADMIN" && client
    ? ((await client.from("academies").select("id,name,is_active").eq("is_active", true).order("name")).data ?? [])
    : [];
  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Import students from CSV" : "استيراد طلاب من CSV"}
        description={en ? "Upload a CSV file or paste data to register students and parents in one batch." : "ارفع ملف CSV أو الصق البيانات، واتسجّل الطلاب وأولياء الأمور دفعة واحدة."}
      />
      <ImportStudents
        academies={academies.map((academy: any) => ({ id: academy.id, name: academy.name ?? "" }))}
        isPlatformOwner={user.role === "SUPER_ADMIN"}
      />
    </div>
  );
}
