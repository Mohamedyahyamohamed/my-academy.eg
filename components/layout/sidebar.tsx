"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/lib/nav";
import { useClientLang } from "@/lib/i18n-client";

interface SidebarProps {
  sections: NavSection[];
  academyName: string;
}

/** Desktop sidebar — renders the role-based navigation. */
export function Sidebar({ sections, academyName }: SidebarProps) {
  const pathname = usePathname();
  const lang = useClientLang();

  const homeHref = sections[0]?.items[0]?.href || "/dashboard";

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href={homeHref} className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
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
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
        <p className="truncate text-xs text-muted-foreground">{academyName}</p>
      </div>
    </aside>
  );
}
