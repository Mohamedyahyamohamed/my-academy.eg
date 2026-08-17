"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { acceptAcademyInviteAction, type InvitePreview } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientLang } from "@/lib/i18n-client";

const ROLE_COPY: Record<InvitePreview["role"], { ar: string; en: string }> = {
  ADMIN: { ar: "مدير أكاديمية", en: "Academy administrator" },
  TEACHER: { ar: "مدرّس", en: "Teacher" },
  PARENT: { ar: "ولي أمر", en: "Parent" },
  STUDENT: { ar: "طالب", en: "Student" },
};

export function InviteAcceptanceForm({ token, invite }: { token: string; invite: InvitePreview }) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    fullName: invite.fullName ?? "",
    password: "",
    confirmPassword: "",
  });

  const hasPresetName = Boolean(invite.fullName);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasPresetName && !form.fullName.trim()) {
      toast.error(en ? "Enter your full name." : "أدخل الاسم الكامل.");
      return;
    }
    if (form.password.length < 8) {
      toast.error(en ? "Choose a password with at least 8 characters." : "اختر كلمة مرور من 8 أحرف على الأقل.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error(en ? "The passwords do not match." : "كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    try {
      const result = await acceptAcademyInviteAction({
        token,
        fullName: form.fullName,
        password: form.password,
      });
      if (!result.ok || !result.destination) {
        toast.error(result.error ?? (en ? "Unable to accept the invitation." : "تعذّر قبول الدعوة."));
        return;
      }
      toast.success(en ? "Invitation accepted successfully." : "تم قبول الدعوة بنجاح.");
      router.push(result.destination);
      router.refresh();
    } catch (error) {
      console.error("async action failed:", error);
      toast.error(en ? "Something went wrong. Please try again." : "حدث خطأ، حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-semibold">{en ? "A secure invitation for you" : "دعوة آمنة ومخصصة لك"}</p>
            <p className="text-muted-foreground">
              {en ? <>You will join <strong className="text-foreground">{invite.academyName}</strong> as a {ROLE_COPY[invite.role].en} using {invite.email}.</> : <>ستنضم إلى <strong className="text-foreground">{invite.academyName}</strong> بصفتك {ROLE_COPY[invite.role].ar} باستخدام البريد {invite.email}.</>}
            </p>
          </div>
        </div>
      </div>

      {!hasPresetName && (
        <div className="space-y-1.5">
          <Label htmlFor="full-name">{en ? "Full name" : "الاسم بالكامل"}</Label>
          <Input
            id="full-name"
            autoComplete="name"
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            placeholder={en ? "Example: Ahmed Mohamed Ali" : "مثال: أحمد محمد علي"}
            disabled={loading}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password">{en ? "Password" : "كلمة المرور"}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder={en ? "At least 8 characters" : "8 أحرف على الأقل"}
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">{en ? "Confirm password" : "تأكيد كلمة المرور"}</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
          placeholder={en ? "Re-enter your password" : "أعد كتابة كلمة المرور"}
          disabled={loading}
        />
      </div>

      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {en ? "This link can only be used once, and no one else can access the academy data through it." : "يقتصر استخدام الرابط على مرة واحدة فقط، ولا يمكن لأي شخص آخر الوصول إلى بيانات الأكاديمية عبره."}
      </p>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (en ? "Accept invitation and create account" : "قبول الدعوة وإنشاء الحساب")}
      </Button>
    </form>
  );
}
