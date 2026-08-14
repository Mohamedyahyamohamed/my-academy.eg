"use client";

import * as React from "react";
import { Copy, Link2, Loader2, Mail, Plus, RotateCcw, ShieldCheck, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import {
  createAcademyInviteAction,
  revokeAcademyInviteAction,
  type AcademyInviteView,
} from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS = {
  ADMIN: "مدير",
  TEACHER: "مدرّس",
  PARENT: "ولي أمر",
  STUDENT: "طالب",
} as const;

type Role = keyof typeof ROLE_LABELS;

function invitationStatus(invite: AcademyInviteView): { label: string; variant: "success" | "secondary" | "destructive" | "warning" } {
  if (invite.accepted_at) return { label: "مقبولة", variant: "success" };
  if (invite.revoked_at) return { label: "ملغاة", variant: "secondary" };
  if (new Date(invite.expires_at) <= new Date()) return { label: "منتهية", variant: "destructive" };
  return { label: "بانتظار القبول", variant: "warning" };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value));
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function InviteManager({ initialInvites }: { initialInvites: AcademyInviteView[] }) {
  const [invites, setInvites] = React.useState(initialInvites);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ fullName: "", email: "", phone: "", role: "TEACHER" as Role, expiry: "7" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await createAcademyInviteAction({
        fullName: form.fullName || undefined,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        expiresInDays: Number(form.expiry),
      });
      if (!result.ok) {
        toast.error(result.error ?? "تعذّر إرسال الدعوة.");
        return;
      }
      setFallbackUrl(result.inviteUrl ?? null);
      if (result.emailSent) {
        toast.success("تم إنشاء الدعوة وإرسالها بالبريد الإلكتروني.");
      } else {
        toast.success("تم إنشاء الدعوة بنجاح.");
        toast.warning(result.emailError ?? "تعذّر إرسال البريد. انسخ رابط الدعوة وأرسله يدويًا.", {
          description: "رابط الدعوة ظاهر أسفل الصفحة وجاهز للنسخ.",
          duration: 7000,
        });
      }
      setForm({ fullName: "", email: "", phone: "", role: "TEACHER", expiry: "7" });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function revoke(inviteId: string) {
    setRevokingId(inviteId);
    try {
      const result = await revokeAcademyInviteAction(inviteId);
      if (!result.ok) {
        toast.error(result.error ?? "تعذّر إلغاء الدعوة.");
        return;
      }
      setInvites((current) => current.map((invite) => invite.id === inviteId ? { ...invite, revoked_at: new Date().toISOString() } : invite));
      toast.success("تم إلغاء الدعوة.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" />إنشاء حسابات الأكاديمية</CardTitle>
            <CardDescription className="mt-1 leading-6">من هنا تضيف مدرسًا أو ولي أمر أو طالبًا إلى أكاديميتك. كل حساب يحصل على عضوية داخل هذه الأكاديمية فقط.</CardDescription>
            <p className="mt-2 text-xs text-muted-foreground">هل تريد إنشاء مساحة لمدرس يعمل بمفرده؟ <a href="/signup?workspace=teacher" className="font-semibold text-primary hover:underline">ابدأ تسجيل مدرس مستقل</a></p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4" />إضافة عضو للأكاديمية</Button></DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة حساب إلى الأكاديمية</DialogTitle>
                <DialogDescription>اختر نوع العضو داخل أكاديميتك. سيصل للمستخدم رابط شخصي لتعيين كلمة المرور وتفعيل الحساب، وتنتهي الدعوة تلقائيًا.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4" noValidate>
                <div className="space-y-1.5"><Label htmlFor="invite-name">الاسم الكامل (اختياري)</Label><Input id="invite-name" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="مثال: أحمد علي" /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="invite-email">البريد الإلكتروني</Label><Input id="invite-email" type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" /></div>
                  <div className="space-y-1.5"><Label htmlFor="invite-phone">الهاتف (اختياري)</Label><Input id="invite-phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="01xxxxxxxxx" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="invite-role">نوع الحساب داخل الأكاديمية</Label><select id="invite-role" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="TEACHER">مدرّس في الأكاديمية</option><option value="PARENT">ولي أمر</option><option value="STUDENT">طالب</option><option value="ADMIN">مدير</option></select></div>
                  <div className="space-y-1.5"><Label htmlFor="invite-expiry">صلاحية الرابط</Label><select id="invite-expiry" value={form.expiry} onChange={(event) => setForm((current) => ({ ...current, expiry: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="1">يوم واحد</option><option value="7">7 أيام</option><option value="14">14 يومًا</option><option value="30">30 يومًا</option></select></div>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}إنشاء الدعوة</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {invites.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground"><Link2 className="mx-auto mb-3 h-7 w-7" />لم تُرسل أي دعوات بعد.</div>
          ) : (
            <div className="divide-y">
              {invites.map((invite) => {
                const status = invitationStatus(invite);
                const canRevoke = !invite.accepted_at && !invite.revoked_at && new Date(invite.expires_at) > new Date();
                return (
                  <div key={invite.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{invite.metadata?.full_name || invite.email}</p><p className="truncate text-xs text-muted-foreground">{invite.email} · {ROLE_LABELS[invite.role]}</p></div>
                    <div className="text-xs text-muted-foreground">تنتهي {formatDate(invite.expires_at)}</div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {canRevoke && <Button size="icon" variant="ghost" aria-label="إلغاء الدعوة" disabled={revokingId === invite.id} onClick={() => revoke(invite.id)}>{revokingId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 text-destructive" />}</Button>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {fallbackUrl && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex-1"><p className="font-medium">تم إنشاء الدعوة — الرابط جاهز للإرسال</p><p className="text-xs text-muted-foreground">لم يُرسل البريد تلقائيًا لأن نطاق المرسل غير موثّق حاليًا. انسخ الرابط وأرسله للمستخدم يدويًا؛ الرابط صالح للاستخدام مرة واحدة فقط.</p></div>
            <Button variant="outline" onClick={async () => { if (await copyToClipboard(fallbackUrl)) toast.success("تم نسخ الرابط."); else toast.error("تعذّر نسخ الرابط. انسخه يدويًا."); }}><Copy className="h-4 w-4" />نسخ الرابط</Button>
            <Button variant="ghost" size="icon" aria-label="إخفاء الرابط" onClick={() => setFallbackUrl(null)}><X className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
