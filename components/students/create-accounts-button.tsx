"use client";

import * as React from "react";
import { UserCog, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createMissingStudentAccountsAction } from "@/app/actions/students";
import { fixParentAccountsAction } from "@/app/actions/parents";
import { STUDENT_DEFAULT_PASSWORD, PARENT_DEFAULT_PASSWORD } from "@/lib/auth";
import { useClientLang } from "@/lib/i18n-client";

export function CreateAccountsButton() {
  const en = useClientLang() === "en";
  const [studentLoading, setStudentLoading] = React.useState(false);
  const [parentLoading, setParentLoading] = React.useState(false);

  const createStudents = async () => {
    setStudentLoading(true);
    try {
      const res = await createMissingStudentAccountsAction();
      if (res.ok === false) {
        toast.error(res.error ?? (en ? "Failed" : "فشل"));
      } else {
        toast.success(
          en ? `${res.created} student account(s) created ✅ — Password: ${STUDENT_DEFAULT_PASSWORD}` : `تم إنشاء ${res.created} حساب طالب ✅ — الباسورد: ${STUDENT_DEFAULT_PASSWORD}`,
          { duration: 10000 },
        );
      }
    } catch {
      toast.error(en ? "An error occurred." : "حصل خطأ");
    } finally {
      setStudentLoading(false);
    }
  };

  const createParents = async () => {
    setParentLoading(true);
    try {
      const res = await fixParentAccountsAction();
      if (res.ok === false) {
        toast.error(res.error ?? (en ? "Failed" : "فشل"));
      } else {
        toast.success(
          en ? `${res.updated ?? 0} updated + ${res.created ?? 0} parent account(s) created ✅ — Password: ${PARENT_DEFAULT_PASSWORD}` : `تم تحديث ${res.updated ?? 0} + إنشاء ${res.created ?? 0} حساب ولي أمر ✅ — الباسورد: ${PARENT_DEFAULT_PASSWORD}`,
          { duration: 10000 },
        );
      }
    } catch {
      toast.error(en ? "An error occurred." : "حصل خطأ");
    } finally {
      setParentLoading(false);
    }
  };

  return (
    <div className="flex gap-2" dir={en ? "ltr" : "rtl"}>
      <Button variant="outline" size="sm" onClick={createStudents} disabled={studentLoading}>
        {studentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCog className="mr-2 h-4 w-4" />}
        {en ? "Student accounts" : "حسابات الطلاب"}
      </Button>
      <Button variant="outline" size="sm" onClick={createParents} disabled={parentLoading}>
        {parentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
        {en ? "Parent accounts" : "حسابات الأهالي"}
      </Button>
    </div>
  );
}
