import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { GroupsService, requireScopedRole } from "@/services";
import { QrPrintCards } from "@/components/qr/qr-print-cards";

export const dynamic = "force-dynamic";

export default async function GroupQrPrintPage(
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const detail = await GroupsService.getGroupDetail(params.id, user.academy_id);
  if (!detail) notFound();

  const students = detail.students
    .filter((student) => student.status !== "ARCHIVED" && student.is_active !== false)
    .map((student) => ({
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      grade: student.grade,
    }));
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";

  return (
    <QrPrintCards
      groupId={detail.id}
      groupName={detail.name}
      students={students}
      en={en}
    />
  );
}
