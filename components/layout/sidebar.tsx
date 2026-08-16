"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/lib/nav";
import type { Role } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

interface SidebarProps {
  sections: NavSection[];
  academyName: string;
  role: Role;
}

/** Desktop sidebar — renders the role-based navigation. */
export function Sidebar({ sections, academyName, role }: SidebarProps) {
  const pathname = usePathname();
  const lang = useClientLang();

  const homeHref = sections[0]?.items[0]?.href || "/dashboard";
  const roleLabel = {
    SUPER_ADMIN: lang === "ar" ? "مالك المنصة" : "Platform Owner",
    ADMIN: lang === "ar" ? "مدير أكاديمية" : "Academy Manager",
    TEACHER: lang === "ar" ? "مدرس" : "Teacher",
    PARENT: lang === "ar" ? "ولي أمر" : "Parent",
    STUDENT: lang === "ar" ? "طالب" : "Student",
  }[role];

  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col border-e border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href={homeHref} className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
      </div>
      <div className="mx-3 mb-2 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{roleLabel}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-sidebar-foreground" title={academyName}>{academyName}</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section, si) => (
          <div key={si} className="space-y-1">
            {(section.titleAr || section.titleEn) && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {lang === "ar" ? section.titleAr : section.titleEn}
              </p>
            )}
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname?.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "border-s-2 border-primary bg-primary/10 ps-2.5 text-primary"
                        : "border-s-2 border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  {lang === "ar" ? item.titleAr : item.titleEn}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[11px] text-muted-foreground">{lang === "ar" ? "مساحة العمل الحالية" : "Current workspace"}</p>
        <p className="truncate text-xs font-medium text-sidebar-foreground" title={academyName}>{academyName}</p>
      </div>
    </aside>
  );
}
