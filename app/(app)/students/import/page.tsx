import { PageHeader } from "@/components/shared/page-header";
import { requireScopedRole } from "@/services";
import { ImportStudents } from "@/components/students/import-students";

export const dynamic = "force-dynamic";

export default async function ImportStudentsPage() {
  await requireScopedRole("ADMIN", "TEACHER");
  return (
    <div className="space-y-6">
      <PageHeader
        title="استيراد طلاب من Excel"
        description="ارفع ملف CSV أو الصق البيانات، واتسجّل الطلاب وأولياء الأمور دفعة واحدة."
      />
      <ImportStudents />
    </div>
  );
}
