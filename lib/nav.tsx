import type { ComponentType } from "react";
import {
  LayoutDashboard,
  UserPlus,
  Plus,
  Users,
  UsersRound,
  CalendarDays,
  Wallet,
  GraduationCap,
  ClipboardList,
  BookOpen,
  BarChart3,
  Settings,
  Bell,
  CalendarCheck,
  TrendingUp,
  CalendarClock,
  Crown,
  CircleHelp,
  type LucideProps,
} from "lucide-react";
import type { Role } from "@/types";
import type { Lang } from "@/lib/i18n";

export interface NavItem {
  titleAr: string;
  titleEn: string;
  href: string;
  icon: ComponentType<LucideProps>;
}

export interface NavSection {
  titleAr?: string;
  titleEn?: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavSection[] = [
  {
    items: [{ titleAr: "لوحة التحكم", titleEn: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    titleAr: "البداية السريعة", titleEn: "Quick Start",
    items: [
      { titleAr: "دعوة مدرس", titleEn: "Invite Teacher", href: "/settings?tab=users#invite", icon: UserPlus },
      { titleAr: "إضافة طالب", titleEn: "Add Student", href: "/students", icon: Plus },
      { titleAr: "إنشاء مجموعة", titleEn: "Create Group", href: "/groups", icon: Plus },
    ],
  },
  {
    titleAr: "التشغيل الأكاديمي", titleEn: "Academic Operations",
    items: [
      { titleAr: "المجموعات", titleEn: "Groups", href: "/groups", icon: UsersRound },
      { titleAr: "الحصص", titleEn: "Lessons", href: "/lessons", icon: BookOpen },
      { titleAr: "الحضور", titleEn: "Attendance", href: "/attendance", icon: CalendarCheck },
      { titleAr: "الواجبات", titleEn: "Homework", href: "/homework", icon: ClipboardList },
      { titleAr: "الدرجات", titleEn: "Grades", href: "/grades", icon: GraduationCap },
    ],
  },
  {
    titleAr: "الأشخاص والمالية", titleEn: "People & Finance",
    items: [
      { titleAr: "الطلاب", titleEn: "Students", href: "/students", icon: Users },
      { titleAr: "المصاريف", titleEn: "Payments", href: "/payments", icon: Wallet },
    ],
  },
  {
    titleAr: "التقارير", titleEn: "Insights",
    items: [
      { titleAr: "التقارير", titleEn: "Reports", href: "/reports", icon: CalendarDays },
      { titleAr: "التحليلات", titleEn: "Analytics", href: "/analytics", icon: BarChart3 },
      { titleAr: "التقويم", titleEn: "Calendar", href: "/calendar", icon: CalendarCheck },
    ],
  },
  {
    titleAr: "النظام", titleEn: "System",
    items: [
      { titleAr: "الإعدادات", titleEn: "Settings", href: "/settings", icon: Settings },
      { titleAr: "الاشتراكات", titleEn: "Billing", href: "/billing", icon: BarChart3 },
      { titleAr: "سجل العمليات", titleEn: "Audit Logs", href: "/audit", icon: BarChart3 },
      { titleAr: "الخصوصية", titleEn: "Privacy", href: "/privacy", icon: Settings },
      { titleAr: "المساعدة والدعم", titleEn: "Help & Support", href: "/support", icon: CircleHelp },
    ],
  },
];

export const TEACHER_NAV: NavSection[] = [
  {
    items: [
      { titleAr: "لوحة التحكم", titleEn: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    ],
  },
  {
    titleAr: "التدريس", titleEn: "Teaching",
    items: [
      { titleAr: "مجموعاتي", titleEn: "My Groups", href: "/groups", icon: UsersRound },
      { titleAr: "الحصص", titleEn: "Lessons", href: "/lessons", icon: BookOpen },
      { titleAr: "الحضور", titleEn: "Attendance", href: "/attendance", icon: CalendarCheck },
      { titleAr: "الواجبات", titleEn: "Homework", href: "/homework", icon: ClipboardList },
      { titleAr: "الدرجات", titleEn: "Grades", href: "/grades", icon: GraduationCap },
      { titleAr: "الطلاب", titleEn: "Students", href: "/students", icon: Users },
      { titleAr: "الرسائل", titleEn: "Messages", href: "/messages", icon: Bell },
      { titleAr: "المساعدة والدعم", titleEn: "Help & Support", href: "/support", icon: CircleHelp },
    ],
  },
];

export const PARENT_NAV: NavSection[] = [
  {
    items: [{ titleAr: "لوحة التحكم", titleEn: "Dashboard", href: "/parent", icon: LayoutDashboard }],
  },
  {
    titleAr: "متابعة الأبناء", titleEn: "Children Overview",
    items: [
      { titleAr: "الأبناء", titleEn: "Children", href: "/parent/children", icon: Users },
      { titleAr: "الحضور", titleEn: "Attendance", href: "/parent/attendance", icon: CalendarCheck },
      { titleAr: "الواجبات", titleEn: "Homework", href: "/parent/homework", icon: ClipboardList },
      { titleAr: "الدرجات", titleEn: "Grades", href: "/parent/grades", icon: GraduationCap },
      { titleAr: "المدفوعات", titleEn: "Payments", href: "/parent/payments", icon: Wallet },
    ],
  },
  {
    titleAr: "التواصل", titleEn: "Communication",
    items: [
      { titleAr: "الرسائل", titleEn: "Messages", href: "/messages", icon: Bell },
      { titleAr: "الإشعارات", titleEn: "Notifications", href: "/notifications", icon: Bell },
      { titleAr: "المساعدة والدعم", titleEn: "Help & Support", href: "/support", icon: CircleHelp },
    ],
  },
];

export const STUDENT_NAV: NavSection[] = [
  {
    items: [{ titleAr: "لوحة التحكم", titleEn: "Dashboard", href: "/student", icon: LayoutDashboard }],
  },
  {
    titleAr: "التعلم", titleEn: "Learning",
    items: [
      { titleAr: "فصولي", titleEn: "My Classes", href: "/student/classes", icon: BookOpen },
      { titleAr: "الحصص", titleEn: "Lessons", href: "/student/lessons", icon: CalendarClock },
      { titleAr: "الواجبات", titleEn: "Homework", href: "/student/homework", icon: ClipboardList },
      { titleAr: "الدرجات", titleEn: "Grades", href: "/student/grades", icon: GraduationCap },
      { titleAr: "تقدّمي", titleEn: "Progress", href: "/student/progress", icon: TrendingUp },
      { titleAr: "الإشعارات", titleEn: "Notifications", href: "/notifications", icon: Bell },
      { titleAr: "المساعدة والدعم", titleEn: "Help & Support", href: "/support", icon: CircleHelp },
    ],
  },
];

export const SUPER_ADMIN_NAV: NavSection[] = [
  {
    titleAr: "إدارة المنصة", titleEn: "Platform Management",
    items: [{ titleAr: "المنصة", titleEn: "Platform", href: "/platform", icon: Crown }],
  },
  {
    titleAr: "الرقابة والمالية", titleEn: "Governance & Finance",
    items: [
      { titleAr: "الاشتراكات", titleEn: "Subscriptions", href: "/billing", icon: Wallet },
      { titleAr: "سجل العمليات", titleEn: "Audit Logs", href: "/audit", icon: BarChart3 },
    ],
  },
  {
    titleAr: "النظام والدعم", titleEn: "System & Support",
    items: [
      { titleAr: "المساعدة والدعم", titleEn: "Help & Support", href: "/support", icon: CircleHelp },
      { titleAr: "الخصوصية", titleEn: "Privacy", href: "/privacy", icon: Settings },
    ],
  },
];

/** Academy managers handle administration; teaching operations stay with teachers. */
export const ACADEMY_MANAGER_NAV: NavSection[] = [
  {
    items: [{ titleAr: "لوحة التحكم", titleEn: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    titleAr: "التقارير والمتابعة", titleEn: "Reports & Oversight",
    items: [
      { titleAr: "التقارير", titleEn: "Reports", href: "/reports", icon: CalendarDays },
      { titleAr: "التحليلات", titleEn: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    titleAr: "المالية والرقابة", titleEn: "Finance & Governance",
    items: [
      { titleAr: "المصاريف", titleEn: "Payments", href: "/payments", icon: Wallet },
      { titleAr: "الاشتراك", titleEn: "Subscription", href: "/billing", icon: BarChart3 },
      { titleAr: "سجل العمليات", titleEn: "Audit Logs", href: "/audit", icon: BarChart3 },
    ],
  },
  {
    titleAr: "النظام والدعم", titleEn: "System & Support",
    items: [
      { titleAr: "الإعدادات", titleEn: "Settings", href: "/settings", icon: Settings },
      { titleAr: "المساعدة والدعم", titleEn: "Help & Support", href: "/support", icon: CircleHelp },
    ],
  },
];

export function navForRole(role: Role): NavSection[] {
  switch (role) {
    case "SUPER_ADMIN":
      return SUPER_ADMIN_NAV;
    case "ADMIN":
      return ACADEMY_MANAGER_NAV;
    case "TEACHER":
      return TEACHER_NAV;
    case "PARENT":
      return PARENT_NAV;
    case "STUDENT":
      return STUDENT_NAV;
    default:
      return ADMIN_NAV;
  }
}
