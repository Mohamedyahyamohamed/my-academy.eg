"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useClientLang } from "@/lib/i18n-client";
import { deleteContentFileAction, deleteContentLessonAction } from "@/app/actions/content";
import { isActionFailure } from "@/lib/action-result";

export function DeleteContentFileButton({ fileId, fileName }: { fileId: string; fileName: string }) {
  const en = useClientLang() === "en";
  const router = useRouter();

  const onConfirm = async () => {
    const result = await deleteContentFileAction(fileId);
    if (isActionFailure(result)) return result;
    toast.success(en ? "File deleted." : "تم حذف الملف.");
    router.refresh();
    return result;
  };

  return (
    <ConfirmDialog
      destructive
      trigger={
        <Button type="button" variant="ghost" size="icon-sm" aria-label={en ? `Delete ${fileName}` : `حذف ${fileName}`} title={en ? "Delete file" : "حذف الملف"}>
          <Trash2 className="h-4 w-4 text-destructive" />
          <span className="sr-only">{en ? "Delete file" : "حذف الملف"}</span>
        </Button>
      }
      title={en ? "Delete this file?" : "حذف الملف؟"}
      description={en ? `The file “${fileName}” will be removed permanently from the lesson and storage.` : `سيتم حذف الملف «${fileName}» نهائيًا من الدرس ومن التخزين.`}
      confirmLabel={en ? "Delete file" : "حذف الملف"}
      onConfirm={onConfirm}
    />
  );
}

export function DeleteContentLessonButton({ courseId, lessonId, lessonTitle }: { courseId: string; lessonId: string; lessonTitle: string }) {
  const en = useClientLang() === "en";
  const router = useRouter();

  const onConfirm = async () => {
    const result = await deleteContentLessonAction(courseId, lessonId);
    if (isActionFailure(result)) return result;
    toast.success(en ? "Lesson deleted." : "تم حذف الدرس.");
    router.push(`/teacher/content/${courseId}`);
    router.refresh();
    return result;
  };

  return (
    <ConfirmDialog
      destructive
      trigger={
        <Button type="button" variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          {en ? "Delete lesson" : "حذف الدرس"}
        </Button>
      }
      title={en ? "Delete this lesson?" : "حذف هذا الدرس؟"}
      description={en ? `“${lessonTitle}”, its attached files, links, and progress records will be deleted permanently.` : `سيتم حذف «${lessonTitle}» وملفاته وروابطه وسجلات تقدمه نهائيًا.`}
      confirmLabel={en ? "Delete lesson" : "حذف الدرس"}
      onConfirm={onConfirm}
    />
  );
}
