"use client";

import * as React from "react";
import { Check, Clock3, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAttendanceStatusAction } from "@/app/actions/attendance";
import { useClientLang } from "@/lib/i18n-client";
import type { AttendanceStatus } from "@/types";

const OPTIONS: Array<{ value: AttendanceStatus; ar: string; en: string; icon: typeof Check; active: string }> = [
  { value: "PRESENT", ar: "حاضر", en: "Present", icon: Check, active: "border-emerald-500 bg-emerald-500 text-white" },
  { value: "LATE", ar: "متأخر", en: "Late", icon: Clock3, active: "border-amber-500 bg-amber-500 text-white" },
  { value: "ABSENT", ar: "غائب", en: "Absent", icon: X, active: "border-rose-500 bg-rose-500 text-white" },
];

const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  groupId: { ar: "مجموعة الحصة", en: "lesson group" },
  lessonId: { ar: "الحصة", en: "lesson" },
  studentId: { ar: "الطالب", en: "student" },
  attendance: { ar: "سجل الحضور", en: "attendance record" },
  status: { ar: "حالة الحضور", en: "attendance status" },
};

function errorText(result: { field: string; message: string; details?: string }, en: boolean) {
  const field = FIELD_LABELS[result.field]?.[en ? "en" : "ar"] ?? result.field;
  return en
    ? `Attendance was not updated. Field: ${field}. Reason: ${result.message}${result.details ? ` Details: ${result.details}` : ""}`
    : `لم يتم تعديل الحضور. المكان: ${field}. السبب: ${result.message}${result.details ? ` التفاصيل: ${result.details}` : ""}`;
}

export function AttendanceStatusEditor({
  groupId,
  lessonId,
  studentId,
  currentStatus,
  currentNote,
  disabled = false,
}: {
  groupId: string;
  lessonId: string;
  studentId: string;
  currentStatus: AttendanceStatus | null;
  currentNote?: string | null;
  disabled?: boolean;
}) {
  const en = useClientLang() === "en";
  const router = useRouter();
  const [status, setStatus] = React.useState<AttendanceStatus | null>(currentStatus);
  const [note, setNote] = React.useState(currentNote ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setStatus(currentStatus);
    setNote(currentNote ?? "");
  }, [currentStatus, currentNote]);

  const save = async (nextStatus: AttendanceStatus, nextNote = note) => {
    if (saving || disabled || (nextStatus === status && nextNote === (currentNote ?? ""))) return;
    const previous = status;
    setStatus(nextStatus);
    setSaving(true);
    try {
      const result = await updateAttendanceStatusAction(groupId, lessonId, studentId, nextStatus, nextNote);
      if (!result.ok) {
        setStatus(previous);
        toast.error(errorText(result, en));
        return;
      }
      toast.success(en ? `Attendance changed to ${nextStatus.toLowerCase()}.` : `تم تغيير الحضور إلى ${nextStatus === "PRESENT" ? "حاضر" : nextStatus === "LATE" ? "متأخر" : "غائب"}.`);
      router.refresh();
    } catch (error) {
      setStatus(previous);
      const details = error instanceof Error ? error.message : "";
      toast.error(en ? `Attendance update failed. Field: attendance. Reason: ${details || "Unknown error."}` : `فشل تعديل الحضور. المكان: سجل الحضور. السبب: ${details || "سبب غير معروف."}`);
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async () => {
    if (!status) {
      toast.error(en ? "Choose an attendance status before saving a note." : "اختر حالة الحضور أولًا قبل حفظ الملاحظة.");
      return;
    }
    await save(status, note);
  };

  return (
    <div className="space-y-1.5" aria-label={en ? "Manual attendance status" : "تعديل حالة الحضور يدويًا"}>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = status === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant="outline"
              disabled={saving || disabled}
              aria-pressed={active}
              aria-label={en ? `Set ${option.en}` : `تسجيل ${option.ar}`}
              onClick={() => save(option.value)}
              className={cn("h-8 gap-1 px-2 text-xs", active && option.active)}
            >
              {saving && active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
              {en ? option.en : option.ar}
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={saving || disabled}
          placeholder={en ? "Manual note, e.g. Late 15 mins" : "ملاحظة، مثال: تأخر 15 دقيقة"}
          aria-label={en ? "Attendance note" : "ملاحظة الحضور"}
          className="h-8 text-xs"
        />
        {note !== (currentNote ?? "") && (
          <Button type="button" size="sm" variant="outline" onClick={saveNote} disabled={saving || disabled}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (en ? "Save" : "حفظ")}
          </Button>
        )}
      </div>
    </div>
  );
}
