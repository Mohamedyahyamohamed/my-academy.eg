/**
 * Central product configuration for MY Academy.
 * Nothing about the academy's identity is hardcoded in feature logic —
 * it lives here / in the database so the platform is multi-tenant ready.
 */
export const APP_CONFIG = {
  name: "MY Academy",
  shortName: "MY Academy",
  tagline: "Run your academy in one place",
  description:
    "A modern platform to manage students, groups, attendance, payments and grades — beautifully.",
  locale: "en-US",
  currency: "EGP",
  defaultPageSize: 10,
} as const;

/** Every role in the platform. */
export const ROLES = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  PARENT: "PARENT",
  STUDENT: "STUDENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Human-readable role labels. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  PARENT: "Parent",
  STUDENT: "Student",
};

/** Sidebar sections grouped by role. */
export type NavItem = {
  title: string;
  href: string;
  icon: string; // lucide icon name
  /** Show a dynamic badge key, if any */
  badge?: "unreadNotifications";
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

/** Statuses shared across the product. */
export const STUDENT_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export const PAYMENT_STATUS = {
  PAID: "PAID",
  PARTIAL: "PARTIAL",
  UNPAID: "UNPAID",
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
} as const;

export const HOMEWORK_STATUS = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  REVIEWED: "REVIEWED",
} as const;

export const PERFORMANCE_LEVELS = {
  EXCELLENT: "Excellent",
  VERY_GOOD: "Very Good",
  GOOD: "Good",
  NEEDS_IMPROVEMENT: "Needs Improvement",
} as const;

/** Derive a performance level from a percentage score. */
export function performanceLevel(pct: number): string {
  if (pct >= 90) return PERFORMANCE_LEVELS.EXCELLENT;
  if (pct >= 75) return PERFORMANCE_LEVELS.VERY_GOOD;
  if (pct >= 60) return PERFORMANCE_LEVELS.GOOD;
  return PERFORMANCE_LEVELS.NEEDS_IMPROVEMENT;
}

/** Map a performance level to a tailwind text/bg token for badges. */
export function performanceColor(level: string) {
  switch (level) {
    case PERFORMANCE_LEVELS.EXCELLENT:
      return "text-emerald-700 bg-emerald-50 ring-emerald-600/20";
    case PERFORMANCE_LEVELS.VERY_GOOD:
      return "text-sky-700 bg-sky-50 ring-sky-600/20";
    case PERFORMANCE_LEVELS.GOOD:
      return "text-amber-700 bg-amber-50 ring-amber-600/20";
    default:
      return "text-rose-700 bg-rose-50 ring-rose-600/20";
  }
}

export const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Wallet", "Other"] as const;
