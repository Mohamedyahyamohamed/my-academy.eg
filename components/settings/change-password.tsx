"use client";

import * as React from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { changePasswordAction } from "@/app/actions/auth";

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("الباسورد لازم 6 حروف على الأقل");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("الباسوردان مش متطابقين");
      return;
    }
    setLoading(true);
    try {
      const res = await changePasswordAction("", newPassword);
      if (res.ok === false) {
        toast.error(res.error ?? "فشل");
      } else {
        toast.success("تم تغيير الباسورد ✅");
        setNewPassword("");
        setConfirm("");
      }
    } catch {
      toast.error("حصل خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" /> تغيير الباسورد
        </CardTitle>
        <CardDescription>غيّر الباسورد بتاعك. الباسورد الجديد لازم 6 حروف على الأقل.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>الباسورد الجديد</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6 حروف على الأقل"
            />
          </div>
          <div className="space-y-1.5">
            <Label>تأكيد الباسورد</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="أعد كتابة الباسورد"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            تغيير الباسورد
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
