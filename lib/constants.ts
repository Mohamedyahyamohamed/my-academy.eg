/**
 * Central product configuration for MY Academy.
 * Nothing about the academy's identity is hardcoded in feature logic —
 * it lives here / in the database so the platform is multi-tenant ready.
 */
export const APP_CONFIG = {
  name: "MY Academy",
  shortName: "MY Academy",
  tagline: "أدر أكاديميتك في مكان واحد",
  description:
    "منصة متكاملة لإدارة الطلاب والمجموعات والحضور والمصاريف والدرجات في الأكاديميات — مع بوابات للمدرّسين وأولياء الأمور والطلاب.",
  locale: "ar-EG",
  currency: "EGP",
  defaultPageSize: 10,
} as const;

/** Every role in the platform. */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  PARENT: "PARENT",
  STUDENT: "STUDENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Human-readable role labels. */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "مدير عام",
  ADMIN: "مدير",
  TEACHER: "مدرّس",
  PARENT: "ولي أمر",
  STUDENT: "طالب",
};

export const ROLE_LABELS_EN: Record<Role, string> = {
  SUPER_ADMIN: "Platform owner",
  ADMIN: "Administrator",
  TEACHER: "Teacher",
  PARENT: "Parent",
  STUDENT: "Student",
};

export function roleLabel(role: Role, en = false): string {
  return (en ? ROLE_LABELS_EN : ROLE_LABELS)[role];
}

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

/** Arabic display labels for persisted performance-level values. */
export const PERFORMANCE_LEVEL_LABELS: Record<string, string> = {
  Excellent: "ممتاز",
  "Very Good": "جيد جدًا",
  Good: "جيد",
  "Needs Improvement": "يحتاج تحسين",
};

/** Format persisted or calculated performance levels for the Arabic interface. */
export const PERFORMANCE_LEVEL_LABELS_EN: Record<string, string> = {
  Excellent: "Excellent",
  "Very Good": "Very Good",
  Good: "Good",
  "Needs Improvement": "Needs Improvement",
};

export function performanceLabel(level: string | null | undefined, en = false): string {
  return level ? (en ? PERFORMANCE_LEVEL_LABELS_EN[level] ?? level : PERFORMANCE_LEVEL_LABELS[level] ?? level) : "—";
}

/** Arabic display labels for persisted payment-method values. */
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  Cash: "نقدي",
  Card: "بطاقة",
  "Bank Transfer": "تحويل بنكي",
  Wallet: "محفظة إلكترونية",
  Other: "أخرى",
};

/** Format persisted payment methods for the Arabic interface. */
export const PAYMENT_METHOD_LABELS_EN: Record<(typeof PAYMENT_METHODS)[number], string> = {
  Cash: "Cash",
  Card: "Card",
  "Bank Transfer": "Bank transfer",
  Wallet: "Wallet",
  Other: "Other",
};

export function paymentMethodLabel(method: string | null | undefined, en = false): string {
  return method ? (en ? PAYMENT_METHOD_LABELS_EN[method as keyof typeof PAYMENT_METHOD_LABELS_EN] ?? method : PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ?? method) : "—";
}
