"use client";

import { Badge } from "@/components/ui/badge";
import type {
  AttendanceStatus,
  HomeworkStatus,
  PaymentStatus,
  Role,
  StudentStatus,
} from "@/types";
import { useClientLang } from "@/lib/i18n-client";

const roleLabels = {
  ar: { SUPER_ADMIN: "مدير عام", ADMIN: "مدير", TEACHER: "مدرّس", PARENT: "ولي أمر", STUDENT: "طالب" },
  en: { SUPER_ADMIN: "Platform Owner", ADMIN: "Academy Admin", TEACHER: "Teacher", PARENT: "Parent", STUDENT: "Student" },
} as const;

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const lang = useClientLang();
  const map = {
    ACTIVE: { variant: "success" as const, ar: "نشط", en: "Active" },
    INACTIVE: { variant: "secondary" as const, ar: "غير نشط", en: "Inactive" },
    ARCHIVED: { variant: "warning" as const, ar: "مؤرشف", en: "Archived" },
  } as const;
  const s = map[status];
  return <Badge variant={s.variant}><span className="h-1.5 w-1.5 rounded-full bg-current" />{lang === "ar" ? s.ar : s.en}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const lang = useClientLang();
  const map = {
    PAID: { variant: "success" as const, ar: "مدفوع", en: "Paid" },
    PARTIAL: { variant: "warning" as const, ar: "مدفوع جزئيًا", en: "Partially paid" },
    UNPAID: { variant: "destructive" as const, ar: "غير مدفوع", en: "Unpaid" },
  } as const;
  const s = map[status];
  return <Badge variant={s.variant}>{lang === "ar" ? s.ar : s.en}</Badge>;
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const lang = useClientLang();
  const map = {
    PRESENT: { variant: "success" as const, ar: "حاضر", en: "Present" },
    ABSENT: { variant: "destructive" as const, ar: "غائب", en: "Absent" },
    LATE: { variant: "warning" as const, ar: "متأخر", en: "Late" },
  } as const;
  const s = map[status];
  return <Badge variant={s.variant}>{lang === "ar" ? s.ar : s.en}</Badge>;
}

export function HomeworkBadge({ status }: { status: HomeworkStatus }) {
  const lang = useClientLang();
  const map = {
    PENDING: { variant: "secondary" as const, ar: "معلّق", en: "Pending" },
    SUBMITTED: { variant: "info" as const, ar: "مُسلَّم", en: "Submitted" },
    REVIEWED: { variant: "success" as const, ar: "تمت المراجعة", en: "Reviewed" },
  } as const;
  const s = map[status];
  return <Badge variant={s.variant}>{lang === "ar" ? s.ar : s.en}</Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
  const lang = useClientLang();
  const variants: Record<Role, "default" | "info" | "warning" | "success"> = {
    SUPER_ADMIN: "default",
    ADMIN: "default",
    TEACHER: "info",
    PARENT: "warning",
    STUDENT: "success",
  };
  return <Badge variant={variants[role]}>{roleLabels[lang][role]}</Badge>;
}
