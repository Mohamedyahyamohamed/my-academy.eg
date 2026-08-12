import type { ComponentType } from "react";
import {
  LayoutDashboard,
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
  type LucideProps,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: ComponentType<LucideProps>;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavSection[] = [
  {
    items: [{ title: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "الإدارة",
    items: [
      { title: "الطلاب", href: "/students", icon: Users },
      { title: "المجموعات", href: "/groups", icon: UsersRound },
      { title: "الحصص", href: "/lessons", icon: BookOpen },
      { title: "الحضور", href: "/attendance", icon: CalendarCheck },
      { title: "المصاريف", href: "/payments", icon: Wallet },
      { title: "الدرجات", href: "/grades", icon: GraduationCap },
      { title: "الواجبات", href: "/homework", icon: ClipboardList },
    ],
  },
  {
    title: "التقارير",
    items: [
      { title: "التقارير", href: "/reports", icon: CalendarDays },
      { title: "التحليلات", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "النظام",
    items: [
      { title: "الإعدادات", href: "/settings", icon: Settings },
      { title: "الاشتراكات", href: "/billing", icon: BarChart3 },
      { title: "سجل العمليات", href: "/audit", icon: BarChart3 },
      { title: "الخصوصية", href: "/privacy", icon: Settings },
    ],
  },
];

export const TEACHER_NAV: NavSection[] = [
  {
    items: [
      { title: "لوحة التحكم", href: "/teacher", icon: LayoutDashboard },
    ],
  },
  {
    title: "التدريس",
    items: [
      { title: "مجموعاتي", href: "/groups", icon: UsersRound },
      { title: "الطلاب", href: "/students", icon: Users },
      { title: "الحصص", href: "/lessons", icon: BookOpen },
      { title: "الحضور", href: "/attendance", icon: CalendarCheck },
      { title: "الدرجات", href: "/grades", icon: GraduationCap },
      { title: "الواجبات", href: "/homework", icon: ClipboardList },
      { title: "المساعدون", href: "/teacher/assistants", icon: UsersRound },
      { title: "الرسائل", href: "/messages", icon: Bell },
    ],
  },
];

export const PARENT_NAV: NavSection[] = [
  {
    items: [{ title: "لوحة التحكم", href: "/parent", icon: LayoutDashboard }],
  },
  {
    title: "أبنائي",
    items: [
      { title: "الأبناء", href: "/parent/children", icon: Users },
      { title: "الرسائل", href: "/messages", icon: Bell },
      { title: "الحضور", href: "/parent/attendance", icon: CalendarCheck },
      { title: "الدرجات", href: "/parent/grades", icon: GraduationCap },
      { title: "الواجبات", href: "/parent/homework", icon: ClipboardList },
      { title: "المصاريف", href: "/parent/payments", icon: Wallet },
      { title: "الإشعارات", href: "/notifications", icon: Bell },
    ],
  },
];

export const STUDENT_NAV: NavSection[] = [
  {
    items: [{ title: "لوحة التحكم", href: "/student", icon: LayoutDashboard }],
  },
  {
    title: "التعلم",
    items: [
      { title: "فصولي", href: "/student/classes", icon: BookOpen },
      { title: "الحصص", href: "/student/lessons", icon: CalendarClock },
      { title: "الواجبات", href: "/student/homework", icon: ClipboardList },
      { title: "الدرجات", href: "/student/grades", icon: GraduationCap },
      { title: "تقدّمي", href: "/student/progress", icon: TrendingUp },
      { title: "الإشعارات", href: "/notifications", icon: Bell },
    ],
  },
];

export const SUPER_ADMIN_NAV: NavSection[] = [
  {
    items: [{ title: "المنصة", href: "/platform", icon: Crown }],
  },
  ...ADMIN_NAV,
];

export function navForRole(role: Role): NavSection[] {
  switch (role) {
    case "SUPER_ADMIN":
      return SUPER_ADMIN_NAV;
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
