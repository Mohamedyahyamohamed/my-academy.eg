"use client";

import * as React from "react";
import { Copy, Link2, Loader2, Mail, ShieldCheck, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { createAcademyInviteAction, revokeAcademyInviteAction, type AcademyInviteView } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useClientLang } from "@/lib/i18n-client";

const ROLE_LABELS = { ADMIN: { ar: "مدير", en: "Manager" }, TEACHER: { ar: "مدرّس", en: "Teacher" }, PARENT: { ar: "ولي أمر", en: "Parent" }, STUDENT: { ar: "طالب", en: "Student" } } as const;
type Role = keyof typeof ROLE_LABELS;

function invitationStatus(invite: AcademyInviteView, en: boolean) {
  if (invite.accepted_at) return { label: en ? "Accepted" : "مقبولة", variant: "success" as const };
  if (invite.revoked_at) return { label: en ? "Revoked" : "ملغاة", variant: "secondary" as const };
  if (new Date(invite.expires_at) <= new Date()) return { label: en ? "Expired" : "منتهية", variant: "destructive" as const };
  return { label: en ? "Pending" : "بانتظار القبول", variant: "warning" as const };
}

function formatDate(value: string, en: boolean) {
  return new Intl.DateTimeFormat(en ? "en-US" : "ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value));
}

async function copyToClipboard(value: string) { try { await navigator.clipboard.writeText(value); return true; } catch { return false; } }

export function InviteManager({ initialInvites }: { initialInvites: AcademyInviteView[] }) {
  const lang = useClientLang();
  const en = lang === "en";
  const [invites, setInvites] = React.useState(initialInvites);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ fullName: "", email: "", phone: "", role: "TEACHER" as Role, expiry: "7" });
  const text = { title: en ? "Create academy accounts" : "إنشاء حسابات الأكاديمية", desc: en ? "Add a teacher, parent, or student to your academy. Each account receives membership in this academy only." : "من هنا تضيف مدرسًا أو ولي أمر أو طالبًا إلى أكاديميتك. كل حساب يحصل على عضوية داخل هذه الأكاديمية فقط.", independent: en ? "Want to create a workspace for an independent teacher?" : "هل تريد إنشاء مساحة لمدرس يعمل بمفرده؟", independentLink: en ? "Register an independent teacher" : "ابدأ تسجيل مدرس مستقل", add: en ? "Add academy member" : "إضافة عضو للأكاديمية", dialogTitle: en ? "Add an account to the academy" : "إضافة حساب إلى الأكاديمية", dialogDesc: en ? "Choose the member type. The user will receive a personal link to set a password and activate the account." : "اختر نوع العضو داخل أكاديميتك. سيصل للمستخدم رابط شخصي لتعيين كلمة المرور وتفعيل الحساب.", name: en ? "Full name (optional)" : "الاسم الكامل (اختياري)", email: en ? "Email address" : "البريد الإلكتروني", phone: en ? "Phone (optional)" : "الهاتف (اختياري)", role: en ? "Account type in academy" : "نوع الحساب داخل الأكاديمية", expiry: en ? "Link validity" : "صلاحية الرابط", cancel: en ? "Cancel" : "إلغاء", create: en ? "Create invitation" : "إنشاء الدعوة", none: en ? "No invitations have been sent yet." : "لم تُرسل أي دعوات بعد.", expires: en ? "Expires" : "تنتهي", hide: en ? "Hide link" : "إخفاء الرابط" };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try {
      const result = await createAcademyInviteAction({ fullName: form.fullName || undefined, email: form.email, phone: form.phone || undefined, role: form.role, expiresInDays: Number(form.expiry) });
      if (!result.ok) { toast.error(result.error ?? (en ? "Unable to create the invitation." : "تعذّر إرسال الدعوة.")); return; }
      setFallbackUrl(result.inviteUrl ?? null);
      if (result.emailSent) toast.success(en ? "Invitation created and sent by email." : "تم إنشاء الدعوة وإرسالها بالبريد الإلكتروني.");
      else { toast.success(en ? "Invitation created successfully." : "تم إنشاء الدعوة بنجاح."); toast.warning(result.emailError ?? (en ? "Email could not be sent. Copy the invitation link and send it manually." : "تعذّر إرسال البريد. انسخ رابط الدعوة وأرسله يدويًا."), { description: en ? "The invitation link is ready below." : "رابط الدعوة ظاهر أسفل الصفحة وجاهز للنسخ.", duration: 7000 }); }
      setForm({ fullName: "", email: "", phone: "", role: "TEACHER", expiry: "7" }); setOpen(false);
    } finally { setSaving(false); }
  }

  async function revoke(inviteId: string) { setRevokingId(inviteId); try { const result = await revokeAcademyInviteAction(inviteId); if (!result.ok) { toast.error(result.error ?? (en ? "Unable to revoke the invitation." : "تعذّر إلغاء الدعوة.")); return; } setInvites(current => current.map(invite => invite.id === inviteId ? { ...invite, revoked_at: new Date().toISOString() } : invite)); toast.success(en ? "Invitation revoked." : "تم إلغاء الدعوة."); } finally { setRevokingId(null); } }

  return <div className="space-y-4" dir={en ? "ltr" : "rtl"}><Card><CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" />{text.title}</CardTitle><CardDescription className="mt-1 leading-6">{text.desc}</CardDescription><p className="mt-2 text-xs text-muted-foreground">{text.independent} <a href="/signup?workspace=teacher" className="font-semibold text-primary hover:underline">{text.independentLink}</a></p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4" />{text.add}</Button></DialogTrigger><DialogContent dir={en ? "ltr" : "rtl"}><DialogHeader><DialogTitle>{text.dialogTitle}</DialogTitle><DialogDescription>{text.dialogDesc}</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4" noValidate><div className="space-y-1.5"><Label htmlFor="invite-name">{text.name}</Label><Input id="invite-name" value={form.fullName} onChange={event => setForm(current => ({ ...current, fullName: event.target.value }))} placeholder={en ? "Example: Ahmed Ali" : "مثال: أحمد علي"} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="invite-email">{text.email}</Label><Input id="invite-email" type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="name@example.com" /></div><div className="space-y-1.5"><Label htmlFor="invite-phone">{text.phone}</Label><Input id="invite-phone" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} placeholder="01xxxxxxxxx" /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="invite-role">{text.role}</Label><select id="invite-role" value={form.role} onChange={event => setForm(current => ({ ...current, role: event.target.value as Role }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="TEACHER">{ROLE_LABELS.TEACHER[lang]}</option><option value="PARENT">{ROLE_LABELS.PARENT[lang]}</option><option value="STUDENT">{ROLE_LABELS.STUDENT[lang]}</option><option value="ADMIN">{ROLE_LABELS.ADMIN[lang]}</option></select></div><div className="space-y-1.5"><Label htmlFor="invite-expiry">{text.expiry}</Label><select id="invite-expiry" value={form.expiry} onChange={event => setForm(current => ({ ...current, expiry: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="1">{en ? "1 day" : "يوم واحد"}</option><option value="7">{en ? "7 days" : "7 أيام"}</option><option value="14">{en ? "14 days" : "14 يومًا"}</option><option value="30">{en ? "30 days" : "30 يومًا"}</option></select></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>{text.cancel}</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}{text.create}</Button></DialogFooter></form></DialogContent></Dialog></CardHeader><CardContent className="p-0">{invites.length === 0 ? <div className="px-6 py-10 text-center text-sm text-muted-foreground"><Link2 className="mx-auto mb-3 h-7 w-7" />{text.none}</div> : <div className="divide-y">{invites.map(invite => { const status = invitationStatus(invite, en); const canRevoke = !invite.accepted_at && !invite.revoked_at && new Date(invite.expires_at) > new Date(); return <div key={invite.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{invite.metadata?.full_name || invite.email}</p><p className="truncate text-xs text-muted-foreground">{invite.email} · {ROLE_LABELS[invite.role][lang]}</p></div><div className="text-xs text-muted-foreground">{text.expires} {formatDate(invite.expires_at, en)}</div><Badge variant={status.variant}>{status.label}</Badge>{canRevoke && <Button size="icon" variant="ghost" aria-label={en ? "Revoke invitation" : "إلغاء الدعوة"} disabled={revokingId === invite.id} onClick={() => revoke(invite.id)}>{revokingId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 text-destructive" />}</Button>}</div>; })}</div>}</CardContent></Card>{fallbackUrl && <Card className="border-primary/30 bg-primary/5"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-medium">{en ? "Invitation created — link ready to send" : "تم إنشاء الدعوة — الرابط جاهز للإرسال"}</p><p className="text-xs text-muted-foreground">{en ? "Email was not sent because the sender domain is not verified. Copy the link and send it manually; it is valid for one use." : "لم يُرسل البريد تلقائيًا لأن نطاق المرسل غير موثّق حاليًا. انسخ الرابط وأرسله للمستخدم يدويًا؛ الرابط صالح للاستخدام مرة واحدة فقط."}</p></div><Button variant="outline" onClick={async () => { if (await copyToClipboard(fallbackUrl)) toast.success(en ? "Link copied." : "تم نسخ الرابط."); else toast.error(en ? "Unable to copy the link." : "تعذّر نسخ الرابط. انسخه يدويًا."); }}><Copy className="h-4 w-4" />{en ? "Copy link" : "نسخ الرابط"}</Button><Button variant="ghost" size="icon" aria-label={text.hide} onClick={() => setFallbackUrl(null)}><X className="h-4 w-4" /></Button></CardContent></Card>}</div>;
}
