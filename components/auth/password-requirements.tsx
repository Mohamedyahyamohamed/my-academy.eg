"use client";

import { CheckCircle2, Circle } from "lucide-react";

export function PasswordRequirements({
  password,
  confirmPassword,
  lang = "ar",
  minLength = 8,
}: {
  password: string;
  confirmPassword?: string;
  lang?: "ar" | "en";
  minLength?: number;
}) {
  const en = lang === "en";
  const lengthOk = password.length >= minLength;
  const matchOk = confirmPassword === undefined || (confirmPassword.length > 0 && password === confirmPassword);
  const items = [
    {
      ok: lengthOk,
      text: en ? `At least ${minLength} characters` : `8 أحرف على الأقل`,
    },
    {
      ok: matchOk,
      text: en ? "Passwords match" : "كلمتا المرور متطابقتان",
      hidden: confirmPassword === undefined,
    },
  ].filter((item) => !item.hidden);

  return (
    <div className="rounded-lg border border-border/70 bg-muted/35 px-3 py-2.5 text-xs text-muted-foreground" aria-live="polite">
      <p className="font-medium text-foreground">{en ? "Password requirements" : "متطلبات كلمة المرور"}</p>
      <div className="mt-1.5 grid gap-1">
        {items.map((item) => (
          <div key={item.text} className="flex items-center gap-1.5">
            {item.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
            <span className={item.ok ? "text-emerald-700 dark:text-emerald-400" : undefined}>{item.text}</span>
          </div>
        ))}
      </div>
      <p className="mt-1.5 leading-5">{en ? "Letters, numbers, and symbols are allowed. Common or leaked passwords may be rejected for security." : "مسموح بالحروف والأرقام والرموز. قد تُرفض كلمات المرور الشائعة أو التي ظهرت في تسريب حفاظًا على الأمان."}</p>
    </div>
  );
}
