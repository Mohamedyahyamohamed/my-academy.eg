import { cookies } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { requireScopedRole } from "@/services";
import { ImportStudents } from "@/components/students/import-students";

export const dynamic = "force-dynamic";

export default async function ImportStudentsPage() {
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  await requireScopedRole("ADMIN", "TEACHER");
  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Import students from Excel" : "استيراد طلاب من Excel"}
        description={en ? "Upload a CSV file or paste data to register students and parents in one batch." : "ارفع ملف CSV أو الصق البيانات، واتسجّل الطلاب وأولياء الأمور دفعة واحدة."}
      />
      <ImportStudents />
    </div>
  );
}
