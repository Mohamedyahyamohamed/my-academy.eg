"use client";

import * as React from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { changePasswordAction } from "@/app/actions/auth";
import { useClientLang } from "@/lib/i18n-client";
import { PasswordRequirements } from "@/components/auth/password-requirements";

export function ChangePasswordForm() {
  const en = useClientLang() === "en";
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(en ? "Password must be at least 8 characters." : "الباسورد لازم 8 حروف على الأقل");
      return;
    }
    if (newPassword !== confirm) {
      toast.error(en ? "Passwords do not match." : "الباسوردان مش متطابقين");
      return;
    }
    setLoading(true);
    try {
      const res = await changePasswordAction("", newPassword);
      if (res.ok === false) {
        toast.error(res.error ?? (en ? "Unable to change password." : "فشل"));
      } else {
        toast.success(en ? "Password changed successfully." : "تم تغيير الباسورد");
        setNewPassword("");
        setConfirm("");
      }
    } catch {
      toast.error(en ? "Something went wrong." : "حصل خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" /> {en ? "Change password" : "تغيير الباسورد"}
        </CardTitle>
        <CardDescription>{en ? "Change your password. The new password must be at least 8 characters." : "غيّر الباسورد بتاعك. الباسورد الجديد لازم 8 حروف على الأقل."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{en ? "New password" : "الباسورد الجديد"}</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={en ? "At least 8 characters" : "8 حروف على الأقل"}
            />
            <PasswordRequirements password={newPassword} confirmPassword={confirm} lang={en ? "en" : "ar"} minLength={8} />
          </div>
          <div className="space-y-1.5">
            <Label>{en ? "Confirm password" : "تأكيد الباسورد"}</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={en ? "Enter the password again" : "أعد كتابة الباسورد"}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {en ? "Change password" : "تغيير الباسورد"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
