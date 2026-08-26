"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { deleteExamAction } from "@/app/actions/grades";
import { useClientLang } from "@/lib/i18n-client";

export function DeleteExamButton({ examId, examName }: { examId: string; examName: string }) {
  const en = useClientLang() === "en";
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteExamAction(examId);
      toast.success(en ? "Exam deleted." : "تم حذف الاختبار.");
      router.refresh();
    } catch {
      toast.error(en ? "Could not delete the exam." : "تعذر حذف الاختبار.");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="absolute top-3 end-3 z-10">
      {confirming ? (
        <div className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-background/95 p-1 shadow-md backdrop-blur">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-md bg-destructive px-2 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : en ? "Delete" : "احذف"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            {en ? "Cancel" : "إلغاء"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label={en ? `Delete ${examName}` : `حذف ${examName}`}
          title={en ? "Delete exam" : "حذف الاختبار"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-all hover:border-destructive/40 hover:text-destructive focus-visible:opacity-100 group-hover/card:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}


/** Always-visible destructive action for the exam detail page header. */
export function DeleteExamDetailButton({ examId, examName }: { examId: string; examName: string }) {
  const en = useClientLang() === "en";
  const router = useRouter();

  return (
    <ConfirmDialog
      destructive
      trigger={
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          {en ? "Delete exam" : "حذف الامتحان"}
        </Button>
      }
      title={en ? "Delete this exam?" : "حذف الامتحان؟"}
      description={
        en
          ? `"${examName}" and all its recorded grades will be permanently deleted, along with any uploaded exam papers. This cannot be undone.`
          : `سيتم حذف "${examName}" وكل الدرجات المسجلة فيه نهائيًا، مع حذف أوراق الامتحان المرفوعة. هذا الإجراء لا يمكن التراجع عنه.`
      }
      confirmLabel={en ? "Delete permanently" : "حذف نهائي"}
      onConfirm={async () => {
        await deleteExamAction(examId);
        toast.success(en ? "Exam deleted successfully." : "تم حذف الامتحان بنجاح.");
        router.push("/grades");
        router.refresh();
      }}
    />
  );
}
