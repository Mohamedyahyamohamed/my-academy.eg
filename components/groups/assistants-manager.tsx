"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { assignAssistantAction, removeAssistantAction } from "@/app/actions/assistants";
import type { Teacher } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

export function AssistantsManager({
  groupId,
  assistants,
  teachers,
  ownerId,
}: {
  groupId: string;
  assistants: { teacherId: string; name: string }[];
  teachers: Teacher[];
  ownerId: string;
}) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [selected, setSelected] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const available = teachers.filter(
    (t) =>
      t.id !== ownerId &&
      !assistants.some((a) => a.teacherId === t.id),
  );

  const add = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await assignAssistantAction(groupId, selected);
      if (!res.ok) { toast.error(res.error ?? (en ? "Unable to add assistant." : "تعذّر إضافة المساعد.")); return; }
      toast.success(en ? "Assistant added." : "تمت إضافة المساعد.");
      setSelected("");
      router.refresh();
    } catch (error) {
      console.error("async action failed:", error);
      toast.error(en ? "Something went wrong. Please try again." : "حدث خطأ، حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (teacherId: string) => {
    await removeAssistantAction(groupId, teacherId);
    toast.success(en ? "Assistant removed." : "تمت إزالة المساعد.");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {assistants.length === 0 ? (
          <p className="text-sm text-muted-foreground">{en ? "No assistants yet." : "لا يوجد مساعدون بعد."}</p>
        ) : (
          assistants.map((a) => (
            <div key={a.teacherId} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[11px]">{initials(a.name)}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium">{a.name}</span>
              <Badge>{en ? "Assistant" : "مساعد"}</Badge>
              <Button variant="ghost" size="icon-sm" aria-label={en ? "Remove assistant" : "إزالة المساعد"} onClick={() => remove(a.teacherId)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))
        )}
      </div>
      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{en ? "Add an assistant teacher…" : "أضف معلّمًا مساعدًا…"}</option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>
          <Button size="sm" onClick={add} disabled={busy || !selected}>
            {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <UserPlus className="me-2 h-4 w-4" />} {en ? "Add" : "إضافة"}
          </Button>
        </div>
      )}
    </div>
  );
}
