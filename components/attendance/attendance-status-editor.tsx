"use client";

import * as React from "react";
import { Check, Clock3, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
}: {
  groupId: string;
  lessonId: string;
  studentId: string;
  currentStatus: AttendanceStatus | null;
}) {
  const en = useClientLang() === "en";
  const router = useRouter();
  const [status, setStatus] = React.useState<AttendanceStatus | null>(currentStatus);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setStatus(currentStatus), [currentStatus]);

  const update = async (next: AttendanceStatus) => {
    if (saving || next === status) return;
    const previous = status;
    setStatus(next);
    setSaving(true);
    try {
      const result = await updateAttendanceStatusAction(groupId, lessonId, studentId, next);
      if (!result.ok) {
        setStatus(previous);
        toast.error(errorText(result, en));
        return;
      }
      toast.success(en ? `Attendance changed to ${next.toLowerCase()}.` : `تم تغيير الحضور إلى ${next === "PRESENT" ? "حاضر" : next === "LATE" ? "متأخر" : "غائب"}.`);
      router.refresh();
    } catch (error) {
      setStatus(previous);
      const details = error instanceof Error ? error.message : "";
      toast.error(en ? `Attendance update failed. Field: attendance. Reason: ${details || "Unknown error."}` : `فشل تعديل الحضور. المكان: سجل الحضور. السبب: ${details || "سبب غير معروف."}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5" aria-label={en ? "Manual attendance status" : "تعديل حالة الحضور يدويًا"}>
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = status === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            aria-pressed={active}
            aria-label={en ? `Set ${option.en}` : `تسجيل ${option.ar}`}
            onClick={() => update(option.value)}
            className={cn("h-8 gap-1 px-2 text-xs", active && option.active)}
          >
            {saving && active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
            {en ? option.en : option.ar}
          </Button>
        );
      })}
    </div>
  );
}
