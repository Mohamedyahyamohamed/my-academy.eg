"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { createDirectAccountAction, type DirectAccountRole } from "@/app/actions/direct-accounts";
import { toast } from "sonner";

const roles: Array<{ value: DirectAccountRole; en: string; ar: string }> = [
  { value: "STUDENT", en: "Student", ar: "طالب" },
  { value: "TEACHER", en: "Teacher", ar: "مدرس" },
  { value: "PARENT", en: "Parent", ar: "ولي أمر" },
];

export function DirectAccountManager({ lang = "en" }: { lang?: "en" | "ar" }) {
  const en = lang === "en";
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "STUDENT" as DirectAccountRole });
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const result = await createDirectAccountAction(form);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error || (en ? "Could not create account." : "تعذّر إنشاء الحساب."));
      return;
    }
    setLastCreated(`${form.email} · ${roles.find(role => role.value === form.role)?.[en ? "en" : "ar"]}`);
    toast.success(en ? "Real account created without sending an invitation." : "تم إنشاء حساب حقيقي بدون إرسال دعوة.");
    setForm(current => ({ ...current, fullName: "", email: "", password: "" }));
  }

  return <Card className="mt-4 border-primary/20">
    <CardHeader>
      <CardTitle className="text-base">{en ? "Create a real test account" : "إنشاء حساب اختبار حقيقي"}</CardTitle>
      <CardDescription>{en ? "Creates a confirmed Auth account directly. No invitation or email is sent." : "ينشئ حساب Auth مؤكدًا مباشرةً بدون دعوة أو إرسال بريد."}</CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="space-y-1.5"><Label htmlFor="direct-full-name">{en ? "Full name" : "الاسم الكامل"}</Label><Input id="direct-full-name" value={form.fullName} onChange={event => setForm(current => ({ ...current, fullName: event.target.value }))} required /></div>
        <div className="space-y-1.5"><Label htmlFor="direct-email">{en ? "Email" : "البريد الإلكتروني"}</Label><Input id="direct-email" type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} required /></div>
        <div className="space-y-1.5"><Label htmlFor="direct-role">{en ? "Role" : "الدور"}</Label><select id="direct-role" value={form.role} onChange={event => setForm(current => ({ ...current, role: event.target.value as DirectAccountRole }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="STUDENT">{en ? "Student" : "طالب"}</option><option value="TEACHER">{en ? "Teacher" : "مدرس"}</option><option value="PARENT">{en ? "Parent" : "ولي أمر"}</option></select></div>
        <div className="space-y-1.5"><Label htmlFor="direct-password">{en ? "Password" : "كلمة المرور"}</Label><Input id="direct-password" type="password" autoComplete="new-password" value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} required /><PasswordRequirements password={form.password} lang={lang} /></div>
        <div className="sm:col-span-2 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{en ? "Enter the password privately; it is never displayed or logged." : "أدخل كلمة المرور بشكل خاص؛ لا يتم عرضها أو تسجيلها."}</p><Button type="submit" disabled={saving}>{saving ? (en ? "Creating…" : "جارٍ الإنشاء…") : (en ? "Create account" : "إنشاء الحساب")}</Button></div>
      </form>
      {lastCreated && <p className="mt-4 text-sm text-emerald-700">{en ? "Last created: " : "آخر حساب تم إنشاؤه: "}{lastCreated}</p>}
    </CardContent>
  </Card>;
}
