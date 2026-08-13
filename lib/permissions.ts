import type { Role, SessionUser } from "@/types";

export type Permission =
  | "academy.manage"
  | "academy.billing.manage"
  | "academy.members.manage"
  | "students.read"
  | "students.manage"
  | "groups.read"
  | "groups.manage"
  | "lessons.read"
  | "lessons.manage"
  | "attendance.record"
  | "grades.record"
  | "homework.manage"
  | "homework.submit"
  | "payments.read_own"
  | "payments.manage"
  | "reports.read"
  | "messages.send"
  | "audit.read";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: [
    "academy.manage", "academy.billing.manage", "academy.members.manage",
    "students.read", "students.manage", "groups.read", "groups.manage",
    "lessons.read", "lessons.manage", "attendance.record", "grades.record",
    "homework.manage", "homework.submit", "payments.read_own", "payments.manage",
    "reports.read", "messages.send", "audit.read",
  ],
  ADMIN: [
    "academy.manage", "academy.billing.manage", "academy.members.manage",
    "students.read", "students.manage", "groups.read", "groups.manage",
    "lessons.read", "lessons.manage", "attendance.record", "grades.record",
    "homework.manage", "payments.read_own", "payments.manage", "reports.read",
    "messages.send", "audit.read",
  ],
  TEACHER: [
    "students.read", "groups.read", "lessons.read", "lessons.manage",
    "attendance.record", "grades.record", "homework.manage", "messages.send",
  ],
  PARENT: [
    "students.read", "groups.read", "lessons.read", "homework.submit",
    "payments.read_own", "messages.send",
  ],
  STUDENT: [
    "students.read", "groups.read", "lessons.read", "homework.submit",
  ],
};

/** Role-wide permission. Always combine with a resource ownership check. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function can(user: Pick<SessionUser, "role">, permission: Permission): boolean {
  return hasPermission(user.role, permission);
}

/**
 * An explicit policy for resource-level checks performed by server actions.
 * ADMIN/SUPER_ADMIN have academy-wide scope. Teachers require assignment to the
 * group; students and parents require the student id to be in their own scope.
 */
export function hasAcademyWideScope(role: Role): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canManageAssignedGroup(role: Role): boolean {
  return hasAcademyWideScope(role) || role === "TEACHER";
}

export function isPortalRole(role: Role): boolean {
  return role === "TEACHER" || role === "PARENT" || role === "STUDENT";
}

export const permissions = ROLE_PERMISSIONS;
