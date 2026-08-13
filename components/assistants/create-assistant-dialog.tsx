"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { createAssistantAction } from "@/app/actions/assistants";
import type { Group } from "@/types";

export function CreateAssistantDialog({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ full_name: "", email: "", password: "" });
  const [selected, setSelected] = React.useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = async () => {
    setSaving(true);
    try {
      const res = await createAssistantAction({ ...form, groupIds: selected });
      if (!res.ok) { toast.error(res.error ?? "تعذّر إنشاء حساب المساعد."); return; }
      toast.success("تم إنشاء حساب المساعد.");
      setForm({ full_name: "", email: "", password: "" });
      setSelected([]);
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserPlus className="h-4 w-4" /> إضافة مساعد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>إنشاء مساعد</DialogTitle>
          <DialogDescription>
            An assistant logs in with this email and gets the same access as you on the selected groups.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>الاسم بالكامل</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="مثال: سارة محمد" />
            </div>
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني (لتسجيل الدخول)</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="assistant@academy.edu" />
            </div>
            <div className="space-y-1.5">
              <Label>كلمة المرور</Label>
              <Input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="6 أحرف على الأقل" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>المجموعات المشتركة ({selected.length} مختارة)</Label>
            <div className="grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2">
              {groups.map((g) => (
                <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2 text-sm hover:bg-accent/50">
                  <Checkbox checked={selected.includes(g.id)} onCheckedChange={() => toggle(g.id)} />
                  <span className="flex-1 truncate">{g.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
