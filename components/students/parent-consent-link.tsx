"use client";

import { useState, useTransition } from "react";
import { createParentConsentRequestAction } from "@/app/actions/parent-consent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ParentConsentLink({ studentId, en }: { studentId: string; en: boolean }) {
  const [parentEmail, setParentEmail] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setMessage(null);
    startTransition(async () => {
      const result = await createParentConsentRequestAction({ studentId, parentEmail });
      if (result.ok) {
        setUrl(result.url || "");
        setMessage(en ? "Link created. Copy it and provide it to the parent through your approved channel." : "تم إنشاء الرابط. انسخه وقدّمه لولي الأمر عبر القناة المعتمدة لديكم.");
      } else {
        setMessage(result.error || (en ? "Could not create the link." : "تعذّر إنشاء الرابط."));
      }
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed p-4">
      <p className="text-sm font-medium">{en ? "Create a separate consent link" : "إنشاء رابط موافقة منفصل"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{en ? "No email or WhatsApp message is sent by this action." : "هذا الإجراء لا يرسل بريدًا أو رسالة واتساب."}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} placeholder={en ? "Parent email" : "بريد ولي الأمر"} />
        <Button type="button" variant="outline" onClick={generate} disabled={pending}>{pending ? (en ? "Creating…" : "جارٍ الإنشاء…") : (en ? "Create link" : "إنشاء الرابط")}</Button>
      </div>
      {url && <Input className="mt-3" readOnly value={url} aria-label={en ? "Consent link" : "رابط الموافقة"} />}
      {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
