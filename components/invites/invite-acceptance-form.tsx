"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { acceptAcademyInviteAction, type InvitePreview } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_COPY: Record<InvitePreview["role"], string> = {
  ADMIN: "مدير أكاديمية",
  TEACHER: "مدرّس",
  PARENT: "ولي أمر",
  STUDENT: "طالب",
};

export function InviteAcceptanceForm({ token, invite }: { token: string; invite: InvitePreview }) {
  const router = useRouter();
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
      toast.error("أدخل الاسم الكامل.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("اختر كلمة مرور من 8 أحرف على الأقل.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين.");
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
        toast.error(result.error ?? "تعذّر قبول الدعوة.");
        return;
      }
      toast.success("تم قبول الدعوة بنجاح.");
      router.push(result.destination);
      router.refresh();
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
            <p className="font-semibold">دعوة آمنة ومخصصة لك</p>
            <p className="text-muted-foreground">
              ستنضم إلى <strong className="text-foreground">{invite.academyName}</strong> بصفتك {ROLE_COPY[invite.role]} باستخدام البريد {invite.email}.
            </p>
          </div>
        </div>
      </div>

      {!hasPresetName && (
        <div className="space-y-1.5">
          <Label htmlFor="full-name">الاسم بالكامل</Label>
          <Input
            id="full-name"
            autoComplete="name"
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            placeholder="مثال: أحمد محمد علي"
            disabled={loading}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="8 أحرف على الأقل"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
          placeholder="أعد كتابة كلمة المرور"
          disabled={loading}
        />
      </div>

      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        يقتصر استخدام الرابط على مرة واحدة فقط، ولا يمكن لأي شخص آخر الوصول إلى بيانات الأكاديمية عبره.
      </p>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "قبول الدعوة وإنشاء الحساب"}
      </Button>
    </form>
  );
}
