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
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Manage",
    items: [
      { title: "Students", href: "/students", icon: Users },
      { title: "Groups", href: "/groups", icon: UsersRound },
      { title: "Lessons", href: "/lessons", icon: BookOpen },
      { title: "Attendance", href: "/attendance", icon: CalendarCheck },
      { title: "Payments", href: "/payments", icon: Wallet },
      { title: "Grades", href: "/grades", icon: GraduationCap },
      { title: "Homework", href: "/homework", icon: ClipboardList },
    ],
  },
  {
    title: "Insights",
    items: [
      { title: "Reports", href: "/reports", icon: CalendarDays },
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Billing", href: "/billing", icon: BarChart3 },
      { title: "Audit Logs", href: "/audit", icon: BarChart3 },
      { title: "Privacy", href: "/privacy", icon: Settings },
    ],
  },
];

export const TEACHER_NAV: NavSection[] = [
  {
    items: [
      { title: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    ],
  },
  {
    title: "Teaching",
    items: [
      { title: "My Groups", href: "/groups", icon: UsersRound },
      { title: "Students", href: "/students", icon: Users },
      { title: "Lessons", href: "/lessons", icon: BookOpen },
      { title: "Attendance", href: "/attendance", icon: CalendarCheck },
      { title: "Grades", href: "/grades", icon: GraduationCap },
      { title: "Homework", href: "/homework", icon: ClipboardList },
      { title: "Assistants", href: "/teacher/assistants", icon: UsersRound },
      { title: "Messages", href: "/messages", icon: Bell },
    ],
  },
];

export const PARENT_NAV: NavSection[] = [
  {
    items: [{ title: "Dashboard", href: "/parent", icon: LayoutDashboard }],
  },
  {
    title: "My Children",
    items: [
      { title: "Children", href: "/parent/children", icon: Users },
      { title: "Messages", href: "/messages", icon: Bell },
      { title: "Attendance", href: "/parent/attendance", icon: CalendarCheck },
      { title: "Grades", href: "/parent/grades", icon: GraduationCap },
      { title: "Homework", href: "/parent/homework", icon: ClipboardList },
      { title: "Payments", href: "/parent/payments", icon: Wallet },
      { title: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
];

export const STUDENT_NAV: NavSection[] = [
  {
    items: [{ title: "Dashboard", href: "/student", icon: LayoutDashboard }],
  },
  {
    title: "Learning",
    items: [
      { title: "My Classes", href: "/student/classes", icon: BookOpen },
      { title: "Lessons", href: "/student/lessons", icon: CalendarClock },
      { title: "Homework", href: "/student/homework", icon: ClipboardList },
      { title: "Grades", href: "/student/grades", icon: GraduationCap },
      { title: "Progress", href: "/student/progress", icon: TrendingUp },
      { title: "Notifications", href: "/notifications", icon: Bell },
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
