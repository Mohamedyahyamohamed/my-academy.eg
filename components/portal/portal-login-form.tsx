"use client";

import { useActionState } from "react";
import Link from "next/link";
import { GraduationCap, LockKeyhole, UsersRound } from "lucide-react";
import { portalLoginAction } from "@/app/actions/portal-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PortalLoginForm() {
  const [state, formAction, pending] = useActionState(portalLoginAction, { ok: true });

  return (
    <form action={formAction} className="space-y-5" dir="rtl">
      <div className="space-y-2">
        <Label htmlFor="portal-email">البريد الافتراضي</Label>
        <Input id="portal-email" name="email" type="email" autoComplete="username" placeholder="student@portal.myacademy.local" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="portal-password">كلمة المرور</Label>
        <Input id="portal-password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">تسجيل الدخول بصفة</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="cursor-pointer">
            <input className="peer sr-only" type="radio" name="role" value="student" defaultChecked required />
            <span className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
              <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
              <span><span className="block font-semibold">طالب</span><span className="block text-xs text-muted-foreground">الواجبات والحصص والحضور</span></span>
            </span>
          </label>
          <label className="cursor-pointer">
            <input className="peer sr-only" type="radio" name="role" value="parent" required />
            <span className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
              <UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />
              <span><span className="block font-semibold">ولي أمر</span><span className="block text-xs text-muted-foreground">الأداء والماليات والمتابعة</span></span>
            </span>
          </label>
        </div>
      </fieldset>

      {state?.ok === false && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" className="h-11 w-full gap-2" disabled={pending}>
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        {pending ? "جارٍ التحقق..." : "دخول البوابة"}
      </Button>
      <p className="text-center text-xs leading-6 text-muted-foreground">بيانات الدخول ينشئها مسؤول الأكاديمية فقط، ولا يمكن تعديلها من هذه الصفحة.</p>
      <p className="text-center text-sm"><Link href="/login" className="font-medium text-primary hover:underline">العودة إلى دخول الأكاديمية</Link></p>
    </form>
  );
}
