"use client";

import * as React from "react";
import { Copy, KeyRound, Loader2, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createMissingSharedPortalAccountsAction } from "@/app/actions/portal-auth";
import { useClientLang } from "@/lib/i18n-client";

type Credential = { studentId: string; studentName: string; email: string; password: string };

export function CreateAccountsButton() {
  const en = useClientLang() === "en";
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [credentials, setCredentials] = React.useState<Credential[]>([]);

  const createAccounts = async () => {
    setBusy(true);
    try {
      const result = await createMissingSharedPortalAccountsAction();
      if (result.ok === false) {
        toast.error(result.error ?? (en ? "Could not create portal accounts." : "تعذر إنشاء حسابات البوابة."));
        return;
      }
      setCredentials(result.credentials);
      setOpen(true);
      if (result.created > 0) {
        toast.success(en ? `${result.created} shared portal account(s) created.` : `تم إنشاء ${result.created} حساب بوابة مشترك.`);
      } else {
        toast.success(en ? "All active students already have portal accounts." : "كل الطلاب النشطين لديهم حسابات بوابة بالفعل.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (en ? "Could not create portal accounts." : "تعذر إنشاء حسابات البوابة."));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(en ? `${label} copied.` : `تم نسخ ${label}.`);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => void createAccounts()} disabled={busy}>
        {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <UserRoundPlus className="me-2 h-4 w-4" />}
        {en ? "Create shared portal accounts" : "إنشاء حسابات البوابة للطلاب"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl" dir={en ? "ltr" : "rtl"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" />{en ? "Shared portal credentials" : "بيانات حسابات البوابة المشتركة"}</DialogTitle>
            <DialogDescription>
              {en ? "Use the same email and password for the student or parent. They choose Student or Parent on the public portal login page. This password list is shown only now, so save it securely." : "يستخدم الطالب أو ولي الأمر نفس البريد وكلمة المرور، ثم يختار الطالب أو ولي الأمر من صفحة الدخول العامة. البيانات تظهر الآن فقط؛ احفظها في مكان آمن."}
            </DialogDescription>
          </DialogHeader>
          {credentials.length ? (
            <div className="max-h-[55vh] space-y-3 overflow-y-auto">
              {credentials.map((item) => (
                <div key={item.studentId} className="rounded-xl border border-border bg-muted/20 p-3">
                  <p className="mb-2 font-semibold">{item.studentName}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-lg bg-background p-2 text-sm"><span className="min-w-0 flex-1 truncate" dir="ltr">{item.email}</span><Button type="button" variant="ghost" size="icon" aria-label={en ? "Copy email" : "نسخ البريد"} onClick={() => void copy(item.email, en ? "Email" : "البريد")}><Copy className="h-4 w-4" /></Button></div>
                    <div className="flex items-center gap-2 rounded-lg bg-background p-2 text-sm"><span className="min-w-0 flex-1 font-mono tracking-wider" dir="ltr">{item.password}</span><Button type="button" variant="ghost" size="icon" aria-label={en ? "Copy password" : "نسخ كلمة المرور"} onClick={() => void copy(item.password, en ? "Password" : "كلمة المرور")}><Copy className="h-4 w-4" /></Button></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-muted/30 p-5 text-center text-sm text-muted-foreground">{en ? "No new accounts were needed." : "لا توجد حسابات جديدة تحتاج إلى إنشاء."}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
