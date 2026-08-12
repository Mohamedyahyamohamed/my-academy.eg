/**
 * i18n — نظام اللغة (عربي/إنجليزي).
 * اللغة بتتخزن في كوكيز (server reads) + localStorage (client reads).
 */

export type Lang = "ar" | "en";

export const DEFAULT_LANG: Lang = "ar";

export const LANG_COOKIE = "ma_lang";

/** ترجمات الكلمات الأساسية */
export const T: Record<Lang, Record<string, string>> = {
  ar: {
    dashboard: "لوحة التحكم",
    students: "الطلاب",
    groups: "المجموعات",
    lessons: "الحصص",
    attendance: "الحضور",
    payments: "المصاريف",
    grades: "الدرجات",
    homework: "الواجبات",
    reports: "التقارير",
    analytics: "التحليلات",
    settings: "الإعدادات",
    billing: "الاشتراكات",
    audit: "سجل العمليات",
    privacy: "الخصوصية",
    platform: "المنصة",
    messages: "الرسائل",
    notifications: "الإشعارات",
    assistants: "المساعدون",
    children: "الأبناء",
    classes: "فصولي",
    progress: "تقدّمي",
    manage: "الإدارة",
    insights: "التقارير",
    system: "النظام",
    teaching: "التدريس",
    learning: "التعلم",
    myChildren: "أبنائي",
    welcome: "أهلاً بك",
    search: "بحث...",
    addStudent: "إضافة طالب",
    save: "حفظ",
    cancel: "إلغاء",
    back: "رجوع",
  },
  en: {
    dashboard: "Dashboard",
    students: "Students",
    groups: "Groups",
    lessons: "Lessons",
    attendance: "Attendance",
    payments: "Payments",
    grades: "Grades",
    homework: "Homework",
    reports: "Reports",
    analytics: "Analytics",
    settings: "Settings",
    billing: "Billing",
    audit: "Audit Logs",
    privacy: "Privacy",
    platform: "Platform",
    messages: "Messages",
    notifications: "Notifications",
    assistants: "Assistants",
    children: "Children",
    classes: "My Classes",
    progress: "Progress",
    manage: "Manage",
    insights: "Insights",
    system: "System",
    teaching: "Teaching",
    learning: "Learning",
    myChildren: "My Children",
    welcome: "Welcome",
    search: "Search...",
    addStudent: "Add Student",
    save: "Save",
    cancel: "Cancel",
    back: "Back",
  },
};

export function getLangFromCookie(cookieValue?: string): Lang {
  return cookieValue === "en" ? "en" : "ar";
}

export function isRTL(lang: Lang): boolean {
  return lang === "ar";
}
