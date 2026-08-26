"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, ImageIcon, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  uploadExamPaperAction,
  finalizeExamPaperUploadAction,
  deleteExamPaperAction,
} from "@/app/actions/grades";
import { useClientLang } from "@/lib/i18n-client";

export type ExamPaper = { id: string; name: string; mime_type: string | null; size: number | null };

export function ExamPapers({ examId, papers }: { examId: string; papers: ExamPaper[] }) {
  const en = useClientLang() === "en";
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const onPick = async (file: File) => {
    setUploading(true);
    try {
      // 1) Ask the server for a signed upload URL.
      const fd = new FormData();
      fd.set("examId", examId);
      fd.set("fileName", file.name);
      fd.set("fileSize", String(file.size));
      const intent = await uploadExamPaperAction(fd);
      if (!intent.ok) {
        toast.error(intent.error);
        return;
      }
      // 2) Upload straight to storage with the signed token.
      const supabaseMod = await import("@/lib/supabase/client");
      const supabase = supabaseMod.createBrowserSupabaseClient();
      const up = await supabase.storage.from(intent.bucket).uploadToSignedUrl(intent.path, intent.token, file, {
        contentType: intent.contentType,
      });
      if (up.error) {
        toast.error(en ? "Upload failed. Try again." : "فشل الرفع، حاول تاني.");
        return;
      }
      // 3) Register the file row.
      const fin = new FormData();
      fin.set("examId", examId);
      fin.set("path", intent.path);
      fin.set("fileName", file.name);
      fin.set("fileSize", String(file.size));
      const done = await finalizeExamPaperUploadAction(fin);
      if (!done.ok) {
        toast.error(done.error);
        return;
      }
      toast.success(en ? "Exam paper uploaded." : "تم رفع ورقة الامتحان.");
      router.refresh();
    } catch (err) {
      console.error("exam paper upload failed:", err);
      toast.error(en ? "Something went wrong." : "حدث خطأ غير متوقع.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDelete = async (fileId: string) => {
    setBusyId(fileId);
    try {
      await deleteExamPaperAction(fileId, examId);
      toast.success(en ? "Attachment removed." : "تم حذف الملف.");
      router.refresh();
    } catch {
      toast.error(en ? "Could not delete the file." : "تعذر حذف الملف.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4 text-violet-500" />
          {en ? "Exam paper" : "ورقة الامتحان"}
        </CardTitle>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPick(f);
            }}
          />
          <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {en ? "Upload image/PDF" : "ارفع صورة/PDF"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {papers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {en
              ? "Upload the exam sheet so students can review it from their portal."
              : "ارفع ورقة الامتحان عشان الطلاب يقدروا يراجعوها من بوابة الطالب."}
          </p>
        ) : (
          <ul className="space-y-2">
            {papers.map((f) => {
              const isImage = (f.mime_type ?? "").startsWith("image/");
              return (
                <li key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    {isImage ? <ImageIcon className="h-4 w-4 shrink-0 text-sky-500" /> : <FileText className="h-4 w-4 shrink-0 text-violet-500" />}
                    <span className="truncate">{f.name}</span>
                    {f.size ? <span className="shrink-0 text-xs text-muted-foreground">{Math.max(1, Math.round(f.size / 1024))} KB</span> : null}
                  </span>
                  <button
                    type="button"
                    aria-label={en ? "Remove attachment" : "حذف المرفق"}
                    disabled={busyId === f.id}
                    onClick={() => void onDelete(f.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    {busyId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
