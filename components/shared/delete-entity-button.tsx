"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteStudentAction } from "@/app/actions/students";
import { deleteGroupAction } from "@/app/actions/groups";
import { deleteLessonAction } from "@/app/actions/lessons";
import { deleteHomeworkAction } from "@/app/actions/homework";
import { deletePaymentAction } from "@/app/actions/payments";
import { deleteParentAction } from "@/app/actions/parents";
import { useClientLang } from "@/lib/i18n-client";
import { isActionFailure } from "@/lib/action-result";

type DeleteResult = { mode: "hard_deleted" | "archived"; relationCount: number };

export function DeleteEntityButton({
  entity,
  id,
  name,
  redirectTo,
}: {
  entity: "student" | "group" | "lesson" | "homework" | "payment" | "parent";
  id: string;
  name: string;
  redirectTo: string;
}) {
  const en = useClientLang() === "en";
  const router = useRouter();

  const onConfirm = async () => {
    let result: any;
    if (entity === "student") result = await deleteStudentAction(id);
    else if (entity === "group") result = await deleteGroupAction(id);
    else if (entity === "lesson") result = await deleteLessonAction(id);
    else if (entity === "homework") result = await deleteHomeworkAction(id);
    else if (entity === "payment") result = await deletePaymentAction(id);
    else result = await deleteParentAction(id);
    if (isActionFailure(result)) return result;
    const archived = result && typeof result === "object" && result.mode === "archived";
    toast.success(en
      ? `${entity.charAt(0).toUpperCase() + entity.slice(1)} ${archived ? "archived" : "deleted"}.`
      : `تم ${archived ? "أرشفة" : "حذف"} ${name}.`);
    router.push(redirectTo);
    router.refresh();
    return result;
  };

  const label = entity === "student"
    ? (en ? "Delete student" : "حذف الطالب")
    : entity === "group"
      ? (en ? "Delete group" : "حذف المجموعة")
      : entity === "lesson"
        ? (en ? "Delete lesson" : "حذف الحصة")
        : entity === "homework"
          ? (en ? "Delete homework" : "حذف الواجب")
          : entity === "payment"
            ? (en ? "Delete payment" : "حذف الدفعة")
            : (en ? "Delete parent" : "حذف ولي الأمر");
  const title = en ? `Delete this ${entity}?` : `حذف ${label.replace(/^حذف /, "")}؟`;
  const description = entity === "group"
    ? (en
      ? `This will permanently delete ${name}, all its generated lessons, and related attendance records. Students will not be deleted; they will be unassigned from this group.`
      : `سيتم حذف ${name} نهائيًا وكل الحصص المُنشأة وسجلات الحضور المرتبطة بها. لن يتم حذف الطلاب، وسيتم إلغاء إسنادهم من هذه المجموعة.`)
    : (en
      ? `Delete ${name}. This action cannot be undone.`
      : `سيتم حذف ${name}. لا يمكن التراجع عن هذا الإجراء.`);

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
