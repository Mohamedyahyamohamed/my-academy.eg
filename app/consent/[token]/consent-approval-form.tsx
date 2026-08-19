"use client";

import { useState, useTransition } from "react";
import { approveParentConsentAction } from "@/app/actions/parent-consent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConsentApprovalForm({ token, en }: { token: string; en: boolean }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await approveParentConsentAction({ token, parentEmail: email });
      if (result.ok) {
        setSuccess(true);
        setMessage(en ? "Consent recorded successfully. The student account is now active." : "تم تسجيل الموافقة بنجاح، وأصبح حساب الطالب مفعّلًا.");
      } else {
        setMessage(result.error || (en ? "Could not record consent." : "تعذّر تسجيل الموافقة."));
      }
    });
  }

  if (success) {
    return <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>;
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block space-y-2 text-sm font-medium">
        <span>{en ? "Parent email" : "بريد ولي الأمر"}</span>
        <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="parent@example.com" autoComplete="email" />
      </label>
      <label className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
        <input type="checkbox" required className="mt-1" />
        <span>{en ? "I approve the student's access and the applicable privacy terms." : "أوافق على وصول الطالب إلى المنصة وعلى شروط الخصوصية المعمول بها."}</span>
      </label>
      {message && <p className="text-sm text-destructive">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? (en ? "Saving…" : "جارٍ الحفظ…") : (en ? "Approve consent" : "اعتماد الموافقة")}</Button>
    </form>
  );
}
