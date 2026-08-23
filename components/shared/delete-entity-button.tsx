"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteStudentAction } from "@/app/actions/students";
import { deleteGroupAction } from "@/app/actions/groups";
import { useClientLang } from "@/lib/i18n-client";

type DeleteResult = { mode: "hard_deleted" | "archived"; relationCount: number };

export function DeleteEntityButton({
  entity,
  id,
  name,
  redirectTo,
}: {
  entity: "student" | "group";
  id: string;
  name: string;
  redirectTo: string;
}) {
  const en = useClientLang() === "en";
  const router = useRouter();

  const onConfirm = async () => {
    const result = (entity === "student" ? await deleteStudentAction(id) : await deleteGroupAction(id)) as DeleteResult;
    if (result.mode === "archived") {
      toast.success(en
        ? `${entity === "student" ? "Student" : "Group"} archived. ${result.relationCount} related record${result.relationCount === 1 ? "" : "s"} were retained.`
        : `${entity === "student" ? "تمت أرشفة الطالب" : "تمت أرشفة المجموعة"} مع الاحتفاظ بـ ${result.relationCount} سجل مرتبط.`);
    } else {
      toast.success(en
        ? `${entity === "student" ? "Student" : "Group"} permanently deleted.`
        : `${entity === "student" ? "تم حذف الطالب نهائيًا" : "تم حذف المجموعة نهائيًا"}.`);
    }
    router.push(redirectTo);
    router.refresh();
  };

  const label = entity === "student" ? (en ? "Delete student" : "حذف الطالب") : (en ? "Delete group" : "حذف المجموعة");
  const title = entity === "student" ? (en ? "Delete this student?" : "حذف الطالب؟") : (en ? "Delete this group?" : "حذف المجموعة؟");
  const description = entity === "group"
    ? (en
      ? `This will permanently delete ${name}, all its generated lessons, and related attendance records. Students will not be deleted but will be unassigned from this group.`
      : `سيتم حذف ${name} نهائيًا مع جميع الحصص المُنشأة وسجلات الحضور المرتبطة به. لن يتم حذف الطلاب، بل سيتم فك ارتباطهم بهذه المجموعة.`)
    : (en
      ? `Delete ${name}. If related attendance, grades, payments, homework, notes, or memberships exist, the record will be archived instead so history is preserved.`
      : `سيتم حذف ${name}. إذا كانت هناك سجلات حضور أو درجات أو مدفوعات أو واجبات أو ملاحظات أو عضويات مرتبطة، ستتم أرشفته بدلًا من حذفه للحفاظ على السجل التاريخي.`);

  return (
    <ConfirmDialog
      destructive
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={label} title={label}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">{label}</span>
        </Button>
      }
      title={title}
      description={description}
      confirmLabel={en ? "Delete" : "حذف"}
      onConfirm={onConfirm}
    />
  );
}
