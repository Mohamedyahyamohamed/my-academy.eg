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
    ACTIVE: { variant: "success", label: "Active" },
    INACTIVE: { variant: "secondary", label: "Inactive" },
    ARCHIVED: { variant: "warning", label: "Archived" },
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
    PAID: "Paid",
    PARTIAL: "Partially Paid",
    UNPAID: "Unpaid",
  };
  return <Badge variant={map[status]}>{labels[status]}</Badge>;
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { variant: "success" | "destructive" | "warning"; label: string }> = {
    PRESENT: { variant: "success", label: "Present" },
    ABSENT: { variant: "destructive", label: "Absent" },
    LATE: { variant: "warning", label: "Late" },
  };
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function HomeworkBadge({ status }: { status: HomeworkStatus }) {
  const map: Record<HomeworkStatus, { variant: "secondary" | "info" | "success"; label: string }> = {
    PENDING: { variant: "secondary", label: "Pending" },
    SUBMITTED: { variant: "info", label: "Submitted" },
    REVIEWED: { variant: "success", label: "Reviewed" },
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
