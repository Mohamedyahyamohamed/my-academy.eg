"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { submitHomeworkAction } from "@/app/actions/homework";
import { uploadHomeworkFile } from "@/app/actions/upload";
import { useClientLang } from "@/lib/i18n-client";

export function SubmitHomework({
  homeworkId,
  studentId,
  disabled,
}: {
  homeworkId: string;
  studentId: string;
  disabled?: boolean;
}) {
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("homeworkId", homeworkId);
      fd.append("studentId", studentId);
      const res = await uploadHomeworkFile(fd);
      if (!res.ok) throw new Error(res.error);
      setFileUrl(res.url!);
      setFileName(res.name!);
      toast.success(en ? "File attached." : "تم إرفاق الملف.");
    } catch (e) {
      toast.error((en ? "Could not upload file: " : "تعذّر رفع الملف: ") + (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!content.trim() && !fileUrl) {
      toast.error(en ? "Write your answer or attach a file." : "اكتب إجابتك أو أرفق ملفًا.");
      return;
    }
    setSaving(true);
    try {
      await submitHomeworkAction(homeworkId, studentId, content.trim(), fileUrl ?? undefined);
      toast.success(en ? "Homework submitted." : "تم تسليم الواجب.");
      setOpen(false);
      setContent("");
      setFileUrl(null);
      setFileName(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Upload className="h-3.5 w-3.5" /> {disabled ? (en ? "Submitted" : "مُسلَّم") : (en ? "Submit" : "تسليم")}
        </Button>
      </DialogTrigger>
      <DialogContent dir={en ? "ltr" : "rtl"}>
        <DialogHeader><DialogTitle>{en ? "Submit homework" : "تسليم الواجب"}</DialogTitle></DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder={en ? "Write your answer or paste your work here…" : "اكتب إجابتك أو الصق عملك هنا…"}
        />
        <div className="space-y-2">
          {fileUrl ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{fileName}</span>
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => { setFileUrl(null); setFileName(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-accent/50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? (en ? "Uploading…" : "جارٍ الرفع…") : (en ? "Attach a file (PDF, image, doc)" : "إرفاق ملف (PDF أو صورة أو مستند)")}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{en ? "Cancel" : "إلغاء"}</Button>
          <Button onClick={submit} disabled={saving || uploading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {en ? "Submit" : "تسليم"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
