"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { Button } from "@/components/ui/button";

type LandingNavbarProps = {
  en: boolean;
  authenticated: boolean;
  destination: string;
  ctaLabel: string;
};

export function LandingNavbar({ en, authenticated, destination, ctaLabel }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 12);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-white/20 shadow-sm transition-[background-color,backdrop-filter,box-shadow,height] duration-300 dark:bg-slate-950/75 dark:border-white/10 ${
        scrolled ? "shadow-sm" : "shadow-none"
      }`}
    >
      <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-[height] duration-300 sm:px-6 ${scrolled ? "h-[4.25rem]" : "h-[4.75rem]"}`}>
        <Logo />
        <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1 text-sm font-medium md:flex">
          <a href="#features" className="rounded-full px-4 py-2 text-muted-foreground hover:text-indigo-600 transition-colors hover:bg-muted dark:hover:text-indigo-300">{en ? "Platform" : "المنصة"}</a>
          <a href="#experience" className="rounded-full px-4 py-2 text-muted-foreground hover:text-indigo-600 transition-colors hover:bg-muted dark:hover:text-indigo-300">{en ? "Experience" : "التجربة"}</a>
          <a href="#how" className="rounded-full px-4 py-2 text-muted-foreground hover:text-indigo-600 transition-colors hover:bg-muted dark:hover:text-indigo-300">{en ? "How it works" : "كيف تعمل"}</a>
          <Link href="/pricing" className="rounded-full px-4 py-2 text-muted-foreground hover:text-indigo-600 transition-colors hover:bg-muted dark:hover:text-indigo-300">{en ? "Pricing" : "الأسعار"}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {!authenticated && <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login">{en ? "Sign in" : "تسجيل الدخول"}</Link></Button>}
          <Button asChild size="sm"><Link href={destination}>{authenticated ? ctaLabel : (en ? "Start free" : "ابدأ مجانًا")}<ArrowLeft className="ms-1 h-4 w-4 rtl:-scale-x-100" /></Link></Button>
        </div>
      </div>
    </header>
  );
}
