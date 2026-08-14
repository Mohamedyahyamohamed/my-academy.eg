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

type Lang = "ar" | "en";

export function SignupForm({ initialLang = "ar" }: { initialLang?: Lang }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [lang, setLang] = React.useState<Lang>(initialLang);
  const [form, setForm] = React.useState({ workspaceType: "ACADEMY" as "ACADEMY" | "TEACHER", academyName: "", fullName: "", email: "", password: "" });
  const en = lang === "en";

  React.useEffect(() => {
    const workspace = new URLSearchParams(window.location.search).get("workspace");
    if (workspace === "teacher") setForm((current) => ({ ...current, workspaceType: "TEACHER" }));
    const stored = document.cookie.match(/(?:^|; )ma_lang=(en|ar)/)?.[1] as Lang | undefined;
    if (stored) setLang(stored);
  }, []);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await signupAction(form);
      if (result?.ok === false) {
        toast.error(result.error ?? (en ? "Unable to create the workspace." : "تعذّر إنشاء المساحة."));
        return;
      }
      toast.success(form.workspaceType === "TEACHER"
        ? (en ? "Your teacher workspace was created successfully." : "تم إنشاء مساحة المدرس الخاصة بك بنجاح.")
        : (en ? "Your academy was created successfully." : "تم إنشاء أكاديميتك بنجاح."));
      router.refresh();
    } catch {
      // redirect() from the server action transfers the owner to onboarding.
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate dir={en ? "ltr" : "rtl"}>
      <div className="space-y-2">
        <Label>{en ? "How will you use MYAcademy?" : "كيف ستستخدم MYAcademy؟"}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => set("workspaceType", "ACADEMY")} className={`rounded-xl border p-3 ${en ? "text-left" : "text-right"} transition-colors ${form.workspaceType === "ACADEMY" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
            <p className="font-semibold">{en ? "I manage an academy" : "أدير أكاديمية"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{en ? "Manage teachers, students, parents, and billing." : "إدارة مدرسين وطلاب وأولياء أمور وفوترة."}</p>
          </button>
          <button type="button" onClick={() => set("workspaceType", "TEACHER")} className={`rounded-xl border p-3 ${en ? "text-left" : "text-right"} transition-colors ${form.workspaceType === "TEACHER" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
            <p className="font-semibold">{en ? "Independent teacher" : "مدرس مستقل"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{en ? "A personal workspace for your groups and students." : "مساحة شخصية لإدارة مجموعاتك وطلابك مباشرة."}</p>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>{form.workspaceType === "TEACHER"
            ? (en ? "We will automatically create an independent teacher workspace. You can later accept invitations from academies without losing your personal workspace." : "سننشئ لك مساحة مدرس مستقلة تلقائيًا، ويمكنك لاحقًا قبول دعوات من أكاديميات أخرى دون فقدان مساحتك.")
            : (en ? "Create a new academy and become its manager. You can invite teachers, students, and parents securely from Settings after signup." : "أنشئ أكاديمية جديدة لتصبح مديرها. لإضافة المدرسين والطلاب وأولياء الأمور، ستُرسل لهم دعوات شخصية وآمنة من الإعدادات بعد التسجيل.")}</p>
        </div>
      </div>

      {form.workspaceType === "ACADEMY" && <div className="space-y-1.5"><Label htmlFor="academy">{en ? "Academy name" : "اسم الأكاديمية"}</Label><Input id="academy" required placeholder={en ? "Example: Elite Academy" : "مثال: أكاديمية النخبة"} value={form.academyName} onChange={(event) => set("academyName", event.target.value)} disabled={loading} /></div>}
      <div className="space-y-1.5"><Label htmlFor="name">{en ? "Full name" : "اسمك بالكامل"}</Label><Input id="name" required autoComplete="name" placeholder={en ? "Full name" : "الاسم بالكامل"} value={form.fullName} onChange={(event) => set("fullName", event.target.value)} disabled={loading} /></div>
      <div className="space-y-1.5"><Label htmlFor="email">{en ? "Email address" : "البريد الإلكتروني"}</Label><Input id="email" required type="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={(event) => set("email", event.target.value)} disabled={loading} /></div>
      <div className="space-y-1.5"><Label htmlFor="password">{en ? "Password" : "كلمة المرور"}</Label><Input id="password" required type="password" autoComplete="new-password" placeholder={en ? "At least 8 characters" : "8 أحرف على الأقل"} value={form.password} onChange={(event) => set("password", event.target.value)} disabled={loading} /></div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />{en ? "Preparing your workspace…" : "جارٍ تجهيز مساحتك…"}</> : <>{form.workspaceType === "TEACHER" ? (en ? "Create teacher workspace" : "إنشاء مساحة المدرس") : (en ? "Create my academy" : "إنشاء أكاديميتي")} <ArrowRight className="h-4 w-4" /></>}
      </Button>

      <p className="text-center text-xs text-muted-foreground">{en ? "Have an academy invitation? Open the invitation link sent to your email." : "لديك دعوة من أكاديمية؟ افتح رابط الدعوة الذي وصل إلى بريدك."} <Link href="/login" className="font-semibold text-primary hover:underline">{en ? "I already have an account" : "لديّ حساب بالفعل"}</Link></p>
    </form>
  );
}
