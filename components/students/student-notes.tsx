"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelative } from "@/lib/utils";
import { addNoteAction, deleteNoteAction } from "@/app/actions/notes";
import type { Note } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

export function StudentNotes({
  studentId,
  notes,
}: {
  studentId: string;
  notes: Note[];
}) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [content, setContent] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await addNoteAction(studentId, content.trim());
      setContent("");
      toast.success(en ? "Note added." : "تمت إضافة الملاحظة.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" dir={en ? "ltr" : "rtl"}>
      <div className="card-surface p-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={en ? "Add a note about this student…" : "أضف ملاحظة عن هذا الطالب…"}
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={submit} disabled={saving || !content.trim()} size="sm">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {en ? "Add note" : "إضافة ملاحظة"}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={en ? "No notes yet" : "لا توجد ملاحظات بعد"}
          description={en ? "Add reminders or notes about this student." : "أضف تذكيرات أو ملاحظات عن هذا الطالب."}
        />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{n.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {n.author_name ?? (en ? "Unknown" : "غير معروف")} · {formatRelative(n.created_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={en ? "Delete note" : "حذف الملاحظة"}
                  onClick={async () => {
                    await deleteNoteAction(studentId, n.id);
                    toast.success(en ? "Note deleted." : "تم حذف الملاحظة.");
                    router.refresh();
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
