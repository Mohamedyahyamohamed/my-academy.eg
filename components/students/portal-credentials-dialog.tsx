"use client";

import * as React from "react";
import { Clipboard, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { generatePortalCredentialsAction } from "@/app/actions/portal-auth";
import { useClientLang } from "@/lib/i18n-client";

export function PortalCredentialsDialog({ student }: { student: { id: string; first_name: string; last_name: string; portal_email?: string | null } }) {
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [credentials, setCredentials] = React.useState<{ email: string; password: string; mode: "created" | "reset" } | null>(null);
  const hasCredentials = Boolean(student.portal_email);

  async function generate() {
    setBusy(true);
    try {
      const result = await generatePortalCredentialsAction(student.id);
      setCredentials(result);
      setOpen(true);
      toast.success(en ? "Portal credentials generated." : "تم إنشاء بيانات دخول البوابة.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (en ? "Could not generate credentials." : "تعذر إنشاء بيانات الدخول."));
    } finally { setBusy(false); }
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(en ? `${label} copied.` : `تم نسخ ${label}.`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" onClick={() => { setCredentials(null); void generate(); }} disabled={busy}>
          {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : hasCredentials ? <RefreshCw className="me-2 h-4 w-4" /> : <KeyRound className="me-2 h-4 w-4" />}
          {hasCredentials ? (en ? "Reset portal password" : "إعادة تعيين كلمة المرور") : (en ? "Generate credentials" : "إنشاء بيانات الدخول")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir={en ? "ltr" : "rtl"}>
        <DialogHeader><DialogTitle>{en ? "Portal credentials" : "بيانات دخول البوابة"}</DialogTitle><DialogDescription>{en ? `Share these credentials with ${student.first_name} or their parent. The password is shown only now.` : `شارك هذه البيانات مع ${student.first_name} أو ولي أمره. كلمة المرور تظهر الآن فقط ولن تُعرض مرة أخرى.`}</DialogDescription></DialogHeader>
        {credentials ? <div className="space-y-4"><div className="space-y-2"><Label>{en ? "Virtual email" : "البريد الافتراضي"}</Label><div className="flex gap-2"><Input readOnly value={credentials.email} /><Button type="button" variant="outline" size="icon" aria-label={en ? "Copy email" : "نسخ البريد"} onClick={() => void copy(credentials.email, en ? "Email" : "البريد")}><Clipboard className="h-4 w-4" /></Button></div></div><div className="space-y-2"><Label>{en ? "Password" : "كلمة المرور"}</Label><div className="flex gap-2"><Input readOnly value={credentials.password} className="font-mono tracking-widest" /><Button type="button" variant="outline" size="icon" aria-label={en ? "Copy password" : "نسخ كلمة المرور"} onClick={() => void copy(credentials.password, en ? "Password" : "كلمة المرور")}><Clipboard className="h-4 w-4" /></Button></div></div><p className="rounded-xl bg-amber-500/10 p-3 text-sm leading-6 text-amber-700 dark:text-amber-300">{credentials.mode === "reset" ? (en ? "The previous password is no longer valid." : "كلمة المرور السابقة لم تعد صالحة.") : (en ? "Both Student and Parent choose their role with these same credentials." : "يستخدم الطالب وولي الأمر نفس البيانات مع اختيار الدور المناسب عند الدخول.")}</p></div> : <div className="py-8 text-center text-sm text-muted-foreground">{en ? "Generating…" : "جارٍ إنشاء البيانات…"}</div>}
      </DialogContent>
    </Dialog>
  );
}
