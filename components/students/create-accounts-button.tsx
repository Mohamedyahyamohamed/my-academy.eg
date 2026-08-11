"use client";

import * as React from "react";
import { UserCog, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createMissingStudentAccountsAction } from "@/app/actions/students";
import { STUDENT_DEFAULT_PASSWORD } from "@/lib/auth";

export function CreateAccountsButton() {
  const [loading, setLoading] = React.useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await createMissingStudentAccountsAction();
      if (res.ok === false) {
        toast.error(res.error ?? "فشل");
      } else {
        toast.success(
          `تم إنشاء ${res.created} حساب دخول ✅ — الباسورد للكل: ${STUDENT_DEFAULT_PASSWORD}`,
          { duration: 10000 },
        );
        if ((res.errors ?? []).length > 0) {
          toast.error(`${res.errors!.length} طالب فشل: ${res.errors![0]}`);
        }
      }
    } catch {
      toast.error("حصل خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCog className="mr-2 h-4 w-4" />}
      أنشئ حسابات دخول
    </Button>
  );
}