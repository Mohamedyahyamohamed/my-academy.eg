"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { Button } from "@/components/ui/button";

const links = [
  { hash: "#features", ar: "المنصة", en: "Platform" },
  { hash: "#experience", ar: "التجربة", en: "Experience" },
  { hash: "#audiences", ar: "الأدوار", en: "Roles" },
  { hash: "#how", ar: "كيف تعمل", en: "How it works" },
  { hash: "#faq", ar: "الأسئلة", en: "FAQ" },
];

type LandingNavbarProps = {
  en: boolean;
  authenticated: boolean;
  destination: string;
  ctaLabel: string;
};

export function LandingNavbar({ en, authenticated, destination, ctaLabel }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 12);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  const close = () => setOpen(false);
  const staffLabel = en ? "Staff sign in" : "تسجيل الدخول";
  const staffHint = en ? "For academy owners and teachers" : "للمالكين والمدرسين";
  const portalLabel = en ? "Student & parent portal" : "دخول الطلاب وأولياء الأمور";
  const portalHint = en ? "For students and families" : "للطلاب وأولياء الأمور";

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,backdrop-filter,box-shadow] duration-300 ${
        scrolled
          ? "border-white/20 bg-white/75 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70"
          : "border-transparent bg-transparent backdrop-blur-0 dark:bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label={en ? "Main navigation" : "التنقل الرئيسي"} className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1 text-sm font-medium lg:flex">
          {links.map((link) => (
            <a key={link.hash} href={link.hash} className="rounded-full px-4 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:hover:text-indigo-300">
              {en ? link.en : link.ar}
            </a>
          ))}
          <Link href="/pricing" className="rounded-full px-4 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:hover:text-indigo-300">
            {en ? "Pricing" : "الأسعار"}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {!authenticated && (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex" title={staffHint}>
                <Link href="/login">
                  <span>{staffLabel}</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex border-primary/25 bg-primary/5 text-primary hover:bg-primary/10" title={portalHint}>
                <Link href="/portal/login">{portalLabel}</Link>
              </Button>
            </>
          )}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href={authenticated ? destination : "/signup"}>
              {authenticated ? ctaLabel : (en ? "Start free" : "ابدأ مجانًا")}
              <ArrowLeft className="ms-1 h-4 w-4" />
            </Link>
          </Button>
          <Button type="button" variant="outline" size="icon" className="lg:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="landing-mobile-menu" aria-label={open ? (en ? "Close menu" : "إغلاق القائمة") : (en ? "Open menu" : "فتح القائمة")}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      <div id="landing-mobile-menu" hidden={!open} className="border-t border-border/70 bg-background/95 px-4 pb-5 pt-3 shadow-lg backdrop-blur-md lg:hidden" dir={en ? "ltr" : "rtl"}>
        <nav aria-label={en ? "Mobile navigation" : "التنقل في الهاتف"} className="space-y-1">
          {links.map((link) => (
            <a key={link.hash} href={link.hash} onClick={close} className="block rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:hover:text-indigo-300">
              {en ? link.en : link.ar}
            </a>
          ))}
          <Link href="/pricing" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:hover:text-indigo-300">
            {en ? "Pricing" : "الأسعار"}
          </Link>
          {!authenticated && (
            <div className="border-t border-border/70 pt-3">
              <Link href="/login" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                <span className="block">{staffLabel}</span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{staffHint}</span>
              </Link>
              <Link href="/portal/login" onClick={close} className="mt-1 block rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                <span className="block">{portalLabel}</span>
                <span className="mt-0.5 block text-xs font-normal text-primary/80">{portalHint}</span>
              </Link>
            </div>
          )}
          <Link href={authenticated ? destination : "/signup"} onClick={close} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
            {authenticated ? ctaLabel : (en ? "Start free" : "ابدأ مجانًا")}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
