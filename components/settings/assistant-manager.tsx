"use client";

import * as React from "react";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createAssistantAction } from "@/app/actions/assistants";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientLang } from "@/lib/i18n-client";

type GroupOption = { id: string; name: string };

export function AssistantManager({ groups }: { groups: GroupOption[] }) {
  const lang = useClientLang();
  const en = lang === "en";
  const [form, setForm] = React.useState({ fullName: "", email: "", password: "" });
  const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const text = {
    title: en ? "Create a group-scoped assistant" : "إنشاء مساعد بصلاحيات محددة",
    description: en
      ? "An assistant signs in as a teacher but can access only the groups you select. This does not grant academy-admin access."
      : "يسجّل المساعد الدخول كمدرّس، لكنه يرى المجموعات التي تختارها فقط. لا يحصل على صلاحيات مدير الأكاديمية.",
    name: en ? "Full name" : "الاسم الكامل",
    email: en ? "Email address" : "البريد الإلكتروني",
    password: en ? "Temporary password" : "كلمة المرور المؤقتة",
    groups: en ? "Groups this assistant can access" : "المجموعات التي يمكن للمساعد الوصول إليها",
    noGroups: en ? "Create at least one group before creating an assistant." : "أنشئ مجموعة واحدة على الأقل قبل إنشاء المساعد.",
    create: en ? "Create assistant" : "إنشاء المساعد",
    creating: en ? "Creating…" : "جارٍ الإنشاء…",
    success: en ? "Assistant created successfully." : "تم إنشاء المساعد بنجاح.",
    failed: en ? "Unable to create assistant." : "تعذّر إنشاء المساعد.",
    selectAtLeastOne: en ? "Select at least one group." : "اختر مجموعة واحدة على الأقل.",
    role: en ? "Effective role" : "الدور الفعلي",
    roleValue: en ? "Teacher — selected groups only" : "مدرّس — المجموعات المحددة فقط",
  };

  function toggleGroup(id: string) {
    setSelectedGroups(current => current.includes(id) ? current.filter(groupId => groupId !== id) : [...current, id]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroups.length) {
      toast.error(text.selectAtLeastOne);
      return;
    }
    setSaving(true);
    try {
      const result = await createAssistantAction({ full_name: form.fullName, email: form.email, password: form.password, groupIds: selectedGroups });
      if (!result.ok) {
        toast.error(result.error ?? text.failed);
        return;
      }
      toast.success(text.success);
      setForm({ fullName: "", email: "", password: "" });
      setSelectedGroups([]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-4 border-sky-200/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-sky-600" />{text.title}</CardTitle>
        <CardDescription>{text.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{text.noGroups}</p>
        ) : (
          <form onSubmit={submit} className="space-y-4" dir={en ? "ltr" : "rtl"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="assistant-name">{text.name}</Label><Input id="assistant-name" required value={form.fullName} onChange={event => setForm(current => ({ ...current, fullName: event.target.value }))} autoComplete="name" /></div>
              <div className="space-y-1.5"><Label htmlFor="assistant-email">{text.email}</Label><Input id="assistant-email" type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} autoComplete="email" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="assistant-password">{text.password}</Label><Input id="assistant-password" type="password" required minLength={8} value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} autoComplete="new-password" /><PasswordRequirements password={form.password} lang={lang} /></div>
            <div className="space-y-2"><Label>{text.groups}</Label><div className="grid gap-2 sm:grid-cols-2">{groups.map(group => <label key={group.id} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" checked={selectedGroups.includes(group.id)} onChange={() => toggleGroup(group.id)} /><span className="min-w-0 flex-1 truncate">{group.name}</span></label>)}</div></div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted p-3"><div className="flex items-center gap-2 text-sm"><Badge variant="secondary">{text.role}</Badge><span>{text.roleValue}</span></div><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{saving ? text.creating : text.create}</Button></div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
