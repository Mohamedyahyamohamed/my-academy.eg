"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "@/app/actions/signup";

export function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ workspaceType: "ACADEMY" as "ACADEMY" | "TEACHER", academyName: "", fullName: "", email: "", password: "" });

  React.useEffect(() => {
    const workspace = new URLSearchParams(window.location.search).get("workspace");
    if (workspace === "teacher") setForm((current) => ({ ...current, workspaceType: "TEACHER" }));
  }, []);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await signupAction(form);
      if (result?.ok === false) {
        toast.error(result.error ?? "تعذّر إنشاء الأكاديمية.");
        return;
      }
      toast.success(form.workspaceType === "TEACHER" ? "تم إنشاء مساحة المدرس الخاصة بك بنجاح." : "تم إنشاء أكاديميتك بنجاح.");
      router.refresh();
    } catch {
      // redirect() from the server action transfers the owner to onboarding.
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label>كيف ستستخدم MYAcademy؟</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => set("workspaceType", "ACADEMY")} className={`rounded-xl border p-3 text-right transition-colors ${form.workspaceType === "ACADEMY" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
            <p className="font-semibold">أدير أكاديمية</p>
            <p className="mt-1 text-xs text-muted-foreground">إدارة مدرسين وطلاب وأولياء أمور وفوترة.</p>
          </button>
          <button type="button" onClick={() => set("workspaceType", "TEACHER")} className={`rounded-xl border p-3 text-right transition-colors ${form.workspaceType === "TEACHER" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
            <p className="font-semibold">مدرس مستقل</p>
            <p className="mt-1 text-xs text-muted-foreground">مساحة شخصية لإدارة مجموعاتك وطلابك مباشرة.</p>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>{form.workspaceType === "TEACHER" ? "سننشئ لك مساحة مدرس مستقلة تلقائيًا، ويمكنك لاحقًا قبول دعوات من أكاديميات أخرى دون فقدان مساحتك." : "أنشئ أكاديمية جديدة لتصبح مديرها. لإضافة المدرّسين والطلاب وأولياء الأمور، ستُرسل لهم دعوات شخصية وآمنة من الإعدادات بعد التسجيل."}</p>
        </div>
      </div>

      {form.workspaceType === "ACADEMY" && <div className="space-y-1.5">
        <Label htmlFor="academy">اسم الأكاديمية</Label>
        <Input id="academy" required placeholder="مثال: أكاديمية النخبة" value={form.academyName} onChange={(event) => set("academyName", event.target.value)} disabled={loading} />
      </div>}
      <div className="space-y-1.5">
        <Label htmlFor="name">اسمك بالكامل</Label>
        <Input id="name" required autoComplete="name" placeholder="الاسم بالكامل" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} disabled={loading} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" required type="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={(event) => set("email", event.target.value)} disabled={loading} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input id="password" required type="password" autoComplete="new-password" placeholder="8 أحرف على الأقل" value={form.password} onChange={(event) => set("password", event.target.value)} disabled={loading} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />جارٍ تجهيز مساحتك…</> : <>{form.workspaceType === "TEACHER" ? "إنشاء مساحة المدرس" : "إنشاء أكاديميتي"} <ArrowRight className="h-4 w-4" /></>}
      </Button>

      <p className="text-center text-xs text-muted-foreground">لديك دعوة من أكاديمية؟ افتح رابط الدعوة الذي وصل إلى بريدك. <Link href="/login" className="font-semibold text-primary hover:underline">لديّ حساب بالفعل</Link></p>
    </form>
  );
}
