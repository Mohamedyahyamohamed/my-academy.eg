"use client";

import * as React from "react";
import { CalendarClock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cancelLessonAction, updateLessonAction } from "@/app/actions/lessons";
import type { Lesson } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

export function LessonExceptionDialog({ lesson }: { lesson: Lesson }) {
  const en = useClientLang() === "en";
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(lesson.date.slice(0, 10));
  const [start, setStart] = React.useState(lesson.start_time.slice(0, 5));
  const [end, setEnd] = React.useState(lesson.end_time.slice(0, 5));
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDate(lesson.date.slice(0, 10));
    setStart(lesson.start_time.slice(0, 5));
    setEnd(lesson.end_time.slice(0, 5));
    setReason(lesson.cancellation_reason ?? "");
  }, [lesson, open]);

  const reschedule = async () => {
    setSaving(true);
    try {
      await updateLessonAction(lesson.id, { date, start_time: start, end_time: end });
      toast.success(en ? "This lesson was rescheduled without changing the group schedule." : "تم تعديل موعد هذه الحصة فقط دون تغيير جدول المجموعة.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (en ? "The lesson could not be updated." : "تعذر تعديل الحصة."));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    setSaving(true);
    try {
      await cancelLessonAction(lesson.id, reason);
      toast.success(en ? "Lesson cancelled. It will not count toward attendance." : "تم إلغاء الحصة، ولن تدخل في احتساب الحضور.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (en ? "The lesson could not be cancelled." : "تعذر إلغاء الحصة."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={lesson.status === "canceled" || lesson.is_cancelled === true}>
          <CalendarClock className="h-4 w-4" /> {en ? "Exception" : "استثناء الحصة"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{en ? "Change this lesson only" : "تعديل هذه الحصة فقط"}</DialogTitle>
          <DialogDescription>{en ? "Rescheduling changes this lesson, not the group's recurring schedule. You can also cancel it so it is excluded from attendance." : "تعديل الموعد يغيّر هذه الحصة فقط، ولا يغيّر جدول المجموعة المتكرر. ويمكنك إلغاؤها حتى لا تدخل في احتساب الحضور."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label>{en ? "Date" : "التاريخ"}</Label><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>{en ? "Start" : "البداية"}</Label><Input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>{en ? "End" : "النهاية"}</Label><Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></div>
        </div>
        <div className="space-y-1.5">
          <Label>{en ? "Cancellation reason (optional)" : "سبب الإلغاء (اختياري)"}</Label>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={en ? "e.g. Holiday" : "مثال: إجازة رسمية"} />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="destructive" onClick={cancel} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            {en ? "Cancel lesson" : "إلغاء الحصة"}
          </Button>
          <Button type="button" onClick={reschedule} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {en ? "Save one-lesson change" : "حفظ تعديل الحصة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
