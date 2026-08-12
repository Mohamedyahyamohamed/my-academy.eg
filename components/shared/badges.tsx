import { Badge } from "@/components/ui/badge";
import type {
  AttendanceStatus,
  HomeworkStatus,
  PaymentStatus,
  Role,
  StudentStatus,
} from "@/types";
import { ROLE_LABELS } from "@/lib/constants";

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const map: Record<StudentStatus, { variant: "default" | "success" | "warning" | "secondary"; label: string }> = {
    ACTIVE: { variant: "success", label: "نشط" },
    INACTIVE: { variant: "secondary", label: "غير نشط" },
    ARCHIVED: { variant: "warning", label: "مؤرشف" },
  };
  const s = map[status];
  return (
    <Badge variant={s.variant}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, "success" | "warning" | "destructive"> = {
    PAID: "success",
    PARTIAL: "warning",
    UNPAID: "destructive",
  };
  const labels: Record<PaymentStatus, string> = {
    PAID: "مدفوع",
    PARTIAL: "مدفوع جزئيًا",
    UNPAID: "غير مدفوع",
  };
  return <Badge variant={map[status]}>{labels[status]}</Badge>;
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { variant: "success" | "destructive" | "warning"; label: string }> = {
    PRESENT: { variant: "success", label: "حاضر" },
    ABSENT: { variant: "destructive", label: "غائب" },
    LATE: { variant: "warning", label: "متأخر" },
  };
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function HomeworkBadge({ status }: { status: HomeworkStatus }) {
  const map: Record<HomeworkStatus, { variant: "secondary" | "info" | "success"; label: string }> = {
    PENDING: { variant: "secondary", label: "معلّق" },
    SUBMITTED: { variant: "info", label: "مُسلَّم" },
    REVIEWED: { variant: "success", label: "تمت المراجعة" },
  };
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, "default" | "info" | "warning" | "success"> = {
    SUPER_ADMIN: "default",
    ADMIN: "default",
    TEACHER: "info",
    PARENT: "warning",
    STUDENT: "success",
  };
  return <Badge variant={map[role]}>{ROLE_LABELS[role]}</Badge>;
}
