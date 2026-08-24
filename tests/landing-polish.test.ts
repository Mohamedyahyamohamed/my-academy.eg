import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("landing premium polish", () => {
  const page = read("app/page.tsx");
  const navbar = read("components/marketing/landing-navbar.tsx");
  const styles = read("app/globals.css");

  it("uses the required sticky glass navbar and navigation hover states", () => {
    expect(navbar).toContain("sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-white/20 shadow-sm");
    expect(navbar).toContain("dark:bg-slate-950/75");
    expect(navbar).toContain("window.scrollY > 12");
    expect(navbar).toContain("hover:text-indigo-600 transition-colors");
    expect(navbar).not.toContain("rtl:-scale-x-100");
  });

  it("removes the muddy glow and uses the crisp layered mockup treatment", () => {
    expect(page).toContain("hero-dashboard-float");
    expect(page).toContain("shadow-[0_20px_50px_rgba(79,70,229,0.15)]");
    expect(page).toContain("border border-slate-200/60 bg-white");
    expect(page).toContain("ring-1 ring-gray-900/5");
    expect(page).toContain("transition-[transform,box-shadow]");
    expect(page).toContain("hover:-translate-y-2");
    expect(page).not.toContain("hero-ambient-blob");
    expect(page).not.toContain("blur-2xl");
    expect(styles).toContain("@keyframes hero-dashboard-float");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });

  it("uses the required subtitle contrast and protects the gradient title from clipping", () => {
    expect(page).toContain("text-base font-medium leading-8 text-slate-600 dark:text-slate-300");
    expect(page).toContain("max-w-full break-words");
    expect(page).toContain("hero-gradient-text");
  });

  it("routes public signup CTAs to registration and styles the portal CTA", () => {
    expect(page).toContain('href={authenticated ? destination : "/signup"}');
    expect(page).toContain("border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50");
    expect(page).not.toContain("rtl:-scale-x-100");
  });

  it("routes authenticated users to their dashboard or portal and hides signup CTAs", () => {
    expect(page).toContain("const user = await loadCurrentUser();");
    expect(page).toContain("const portalSession = await readPortalSession();");
    expect(page).toContain("const destination = portalSession ? portalDestination : user ? roleHome(user.role) : \"/signup\";");
    expect(page).toContain("/portal/student");
    expect(page).toContain("/portal/parent");
    expect(page).toContain("!authenticated &&");
    expect(page).toContain("{authenticated ? ctaLabel");
    expect(page).not.toContain("redirect(roleHome(user.role))");
  });

  it("aligns trust badges with flex spacing and indigo icons", () => {
    expect(page).toContain("flex flex-wrap items-center gap-6");
    expect(page).toContain("text-indigo-500");
  });

  it("keeps the hero responsive and avoids an unstable image LCP candidate", () => {
    expect(page).toContain("grid-cols-[1.02fr_.98fr]");
    expect(page).toContain("lg:grid-cols-[1.02fr_.98fr]");
    expect(page).toContain("max-w-xl");
    expect(page).toContain("sm:p-5");
    expect(page).not.toContain("<img");
    expect(page).not.toContain("next/image");
    expect(page).toContain("Owner intelligence");
  });
});
