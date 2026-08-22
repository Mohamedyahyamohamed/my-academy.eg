"use client";

import * as React from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { transferStudentGroupAction } from "@/app/actions/groups";
import { useClientLang } from "@/lib/i18n-client";

type GroupOption = { id: string; name: string };

const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  fromGroupId: { ar: "المجموعة الحالية", en: "current group" },
  toGroupId: { ar: "المجموعة الجديدة", en: "new group" },
  studentId: { ar: "الطالب", en: "student" },
  transfer: { ar: "عملية النقل", en: "transfer" },
};

export function StudentGroupTransfer({
  studentId,
  currentGroups,
  targetGroups,
}: {
  studentId: string;
  currentGroups: GroupOption[];
  targetGroups: GroupOption[];
}) {
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  const [fromGroupId, setFromGroupId] = React.useState(currentGroups[0]?.id ?? "");
  const [toGroupId, setToGroupId] = React.useState(targetGroups[0]?.id ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!currentGroups.length || !targetGroups.length) return null;

  const formatError = (result: { field: string; message: string; details?: string }) => {
    const field = FIELD_LABELS[result.field]?.[en ? "en" : "ar"] ?? result.field;
    return en
      ? `The transfer failed. Field: ${field}. Reason: ${result.message}${result.details ? ` Details: ${result.details}` : ""}`
      : `فشل نقل الطالب. المكان: ${field}. السبب: ${result.message}${result.details ? ` التفاصيل: ${result.details}` : ""}`;
  };

  const transfer = async () => {
    setError(null);
    if (!fromGroupId) {
      setError(en ? "The current group is missing. Select the group the student is leaving." : "المجموعة الحالية غير محددة. اختر المجموعة التي سينتقل منها الطالب.");
      return;
    }
    if (!toGroupId) {
      setError(en ? "The new group is missing. Select the group the student will join." : "المجموعة الجديدة غير محددة. اختر المجموعة التي سينضم إليها الطالب.");
      return;
    }
    setSaving(true);
    try {
      const result = await transferStudentGroupAction(studentId, fromGroupId, toGroupId);
      if (!result.ok) {
        const message = formatError(result);
        setError(message);
        toast.error(message);
        return;
      }
      toast.success(en ? "Student moved to the new group." : "تم نقل الطالب إلى المجموعة الجديدة.");
      setOpen(false);
      window.location.reload();
    } catch (caught) {
      const details = caught instanceof Error ? caught.message : "";
      const message = en
        ? `The transfer failed. Field: transfer. Reason: ${details || "Unknown error."}`
        : `فشل نقل الطالب. المكان: عملية النقل. السبب: ${details || "سبب غير معروف."}`;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ArrowRightLeft className="h-4 w-4" />
          {en ? "Transfer group" : "نقل مجموعة"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{en ? "Transfer student to another group" : "نقل الطالب إلى مجموعة أخرى"}</DialogTitle>
          <DialogDescription>
            {en ? "This replaces one membership. The student record and historical attendance remain unchanged." : "هذا يستبدل عضوية واحدة فقط. يظل ملف الطالب وسجل الحضور التاريخي بدون تغيير."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{en ? "Current group" : "المجموعة الحالية"}</span>
            <select value={fromGroupId} onChange={(event) => setFromGroupId(event.target.value)} disabled={saving} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              {currentGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{en ? "New group" : "المجموعة الجديدة"}</span>
            <select value={toGroupId} onChange={(event) => setToGroupId(event.target.value)} disabled={saving} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              {targetGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>{en ? "Cancel" : "إلغاء"}</Button>
          <Button type="button" onClick={transfer} disabled={saving || !fromGroupId || !toGroupId}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {en ? "Confirm transfer" : "تأكيد النقل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
