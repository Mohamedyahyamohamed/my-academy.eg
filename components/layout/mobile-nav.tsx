"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { useClientLang } from "@/lib/i18n-client";
import type { NavSection } from "@/lib/nav";

export function MobileNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const lang = useClientLang();
  const en = lang === "en";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={en ? "Open menu" : "فتح القائمة"}>
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={en ? "left" : "right"} dir={en ? "ltr" : "rtl"} className="w-[min(88vw,22rem)] border-sidebar-border bg-sidebar/98 p-0 shadow-2xl backdrop-blur-xl">
        <SheetHeader className="h-16 justify-center border-b border-sidebar-border bg-sidebar-accent/25 px-4">
          <SheetTitle className={en ? "text-left" : "text-right"}>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav className="space-y-5 overflow-y-auto px-3 py-5">
          {sections.map((section, si) => (
            <div key={si} className="space-y-1">
              {(section.titleAr || section.titleEn) && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {en ? section.titleEn : section.titleAr}
                </p>
              )}
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "border-s-2 border-primary bg-primary/10 ps-2.5 text-primary shadow-sm"
                        : "border-s-2 border-transparent text-sidebar-foreground/80 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {en ? item.titleEn : item.titleAr}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
