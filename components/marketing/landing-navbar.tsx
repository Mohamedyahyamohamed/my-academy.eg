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
      className={`sticky top-0 z-50 border-b transition-[background-color,backdrop-filter,box-shadow,height] duration-300 ${
        scrolled
          ? "border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-950/75"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-[height] duration-300 sm:px-6 ${scrolled ? "h-[4.25rem]" : "h-[4.75rem]"}`}>
        <Logo />
        <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1 text-sm font-medium md:flex">
          <a href="#features" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">{en ? "Platform" : "المنصة"}</a>
          <a href="#experience" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">{en ? "Experience" : "التجربة"}</a>
          <a href="#how" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">{en ? "How it works" : "كيف تعمل"}</a>
          <Link href="/pricing" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">{en ? "Pricing" : "الأسعار"}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {!authenticated && <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login">{en ? "Sign in" : "تسجيل الدخول"}</Link></Button>}
          <Button asChild size="sm"><Link href={destination}>{authenticated ? ctaLabel : (en ? "Start free" : "ابدأ مجانًا")}<ArrowLeft className="ms-1 h-4 w-4" /></Link></Button>
        </div>
      </div>
    </header>
  );
}
