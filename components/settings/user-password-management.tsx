"use client";

import * as React from "react";
import { Copy, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resetUserPasswordAction } from "@/app/actions/password-management";

export type PasswordManagementUser = {
  id: string;
  full_name?: string | null;
  email: string;
  role: string;
  is_active: boolean;
  academy_name?: string | null;
};

function roleLabel(role: string, en: boolean) {
  const labels: Record<string, [string, string]> = {
    ADMIN: ["Academy Owner", "مالك الأكاديمية"],
    SUPER_ADMIN: ["Platform Owner", "مالك المنصة"],
    TEACHER: ["Teacher / Assistant", "مدرس / مساعد"],
    PARENT: ["Parent", "ولي أمر"],
    STUDENT: ["Student", "طالب"],
  };
  return labels[role]?.[en ? 0 : 1] ?? role;
}

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = new Uint32Array(14);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

export function UserPasswordManagement({
  users,
  lang = "ar",
  title,
  description,
}: {
  users: PasswordManagementUser[];
  lang?: "ar" | "en";
  title?: string;
  description?: string;
}) {
  const en = lang === "en";
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<PasswordManagementUser | null>(null);
  const [open, setOpen] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const filteredUsers = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.full_name, user.email, user.role, user.academy_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, users]);

  function closeDialog(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && !saving) {
      setSelected(null);
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirm(false);
    }
  }

  function openFor(user: PasswordManagementUser) {
    setSelected(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
    setOpen(true);
  }

  async function copyPassword() {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success(en ? "Temporary password copied." : "تم نسخ كلمة المرور المؤقتة.");
    } catch {
      toast.error(en ? "Could not copy the password." : "تعذّر نسخ كلمة المرور.");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const result = await resetUserPasswordAction(selected.id, newPassword, confirmPassword);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(en ? "Password reset successfully." : "تمت إعادة تعيين كلمة المرور بنجاح.");
      closeDialog(false);
    } catch (error) {
      console.error("password reset request failed", error instanceof Error ? error.message : "unknown error");
      toast.error(en ? "Could not reset the password." : "تعذّرت إعادة تعيين كلمة المرور.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" />{title ?? (en ? "User password management" : "إدارة كلمات مرور المستخدمين")}</CardTitle>
        <CardDescription>{description ?? (en ? "Reset another user's password without viewing or storing the old password." : "أعد تعيين كلمة مرور مستخدم دون رؤية كلمة المرور القديمة أو تخزينها.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="ps-9" placeholder={en ? "Search by name, email, role, or academy" : "ابحث بالاسم أو البريد أو الدور أو الأكاديمية"} aria-label={en ? "Search users" : "البحث عن مستخدمين"} />
        </div>
        {filteredUsers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{en ? "No users found." : "لم يتم العثور على مستخدمين."}</div>
        ) : (
          <div className="divide-y rounded-lg border">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.full_name || (en ? "Unnamed user" : "مستخدم بدون اسم")}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{roleLabel(user.role, en)}{user.academy_name ? ` · ${user.academy_name}` : ""} · {user.is_active ? (en ? "Active" : "نشط") : (en ? "Inactive" : "غير نشط")}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => openFor(user)} disabled={!user.is_active}>
                  <KeyRound className="h-4 w-4" />{en ? "Reset password" : "إعادة تعيين كلمة المرور"}
                </Button>
              </div>
            ))}
          </div>
        )}
        <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{en ? "Only the authorized server can update the password. Passwords are not returned, logged, or saved in the database." : "لا يستطيع تحديث كلمة المرور إلا الخادم المصرح له. لا يتم إرجاع كلمات المرور أو تسجيلها أو حفظها في قاعدة البيانات."}</p>
      </CardContent>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{en ? "Reset user password" : "إعادة تعيين كلمة مرور المستخدم"}</DialogTitle>
            <DialogDescription>{selected ? `${selected.full_name || selected.email} · ${selected.email}` : ""}</DialogDescription>
          </DialogHeader>
          {selected && (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p><span className="font-medium">{en ? "Role" : "الدور"}:</span> {roleLabel(selected.role, en)}</p>
                {selected.academy_name && <p><span className="font-medium">{en ? "Academy" : "الأكاديمية"}:</span> {selected.academy_name}</p>}
                <p><span className="font-medium">{en ? "Status" : "الحالة"}:</span> {selected.is_active ? (en ? "Active" : "نشط") : (en ? "Inactive" : "غير نشط")}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-reset-password">{en ? "New temporary password" : "كلمة المرور المؤقتة الجديدة"}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1"><Input id="owner-reset-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? (en ? "Hide password" : "إخفاء كلمة المرور") : (en ? "Show password" : "إظهار كلمة المرور")}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  <Button type="button" variant="outline" size="icon" onClick={() => { const generated = generatePassword(); setNewPassword(generated); setConfirmPassword(generated); }} aria-label={en ? "Generate temporary password" : "توليد كلمة مرور مؤقتة"}><RefreshCw className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="icon" onClick={copyPassword} disabled={!newPassword} aria-label={en ? "Copy temporary password" : "نسخ كلمة المرور المؤقتة"}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-reset-password-confirm">{en ? "Confirm password" : "تأكيد كلمة المرور"}</Label>
                <div className="relative"><Input id="owner-reset-password-confirm" type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} /><button type="button" onClick={() => setShowConfirm((value) => !value)} className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showConfirm ? (en ? "Hide confirmation" : "إخفاء التأكيد") : (en ? "Show confirmation" : "إظهار التأكيد")}>{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
              </div>
              <PasswordRequirements password={newPassword} confirmPassword={confirmPassword} lang={lang} minLength={8} />
              <p className="text-xs text-muted-foreground">{en ? "The old password is never shown. Do not share the temporary password through email or WhatsApp." : "لا تظهر كلمة المرور القديمة أبدًا. لا تشارك كلمة المرور المؤقتة عبر البريد أو WhatsApp."}</p>
              <DialogFooter><Button type="button" variant="outline" onClick={() => closeDialog(false)} disabled={saving}>{en ? "Cancel" : "إلغاء"}</Button><Button type="submit" disabled={saving || newPassword.length < 8 || newPassword !== confirmPassword}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{en ? "Reset password" : "إعادة تعيين كلمة المرور"}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
