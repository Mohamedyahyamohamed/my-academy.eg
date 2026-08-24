"use client";

import { useActionState } from "react";
import Link from "next/link";
import { GraduationCap, Loader2, LockKeyhole, UsersRound } from "lucide-react";
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
        <Input id="portal-email" name="email" type="email" autoComplete="username" autoFocus placeholder="student@portal.myacademy.local" required className="rounded-lg border border-gray-300 bg-white text-slate-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="portal-password">كلمة المرور</Label>
        <Input id="portal-password" name="password" type="password" autoComplete="current-password" required className="rounded-lg border border-gray-300 bg-white text-slate-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400" />
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

      {state?.ok === false && <p role="alert" aria-live="polite" className="mt-2 text-sm leading-6 text-red-500 dark:text-red-400">{state.error}</p>}
      <Button type="submit" className="h-11 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-70" disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
        {pending ? "جارٍ التحقق..." : "دخول البوابة"}
      </Button>
      <p className="text-center text-xs leading-6 text-muted-foreground">بيانات الدخول ينشئها مسؤول الأكاديمية فقط، ولا يمكن تعديلها من هذه الصفحة.</p>
      <p className="text-center text-sm"><Link href="/login" className="font-medium text-primary hover:underline">العودة إلى دخول الأكاديمية</Link></p>
    </form>
  );
}
