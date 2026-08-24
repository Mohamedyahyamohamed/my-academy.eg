import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("landing premium polish", () => {
  const page = read("app/page.tsx");
  const navbar = read("components/marketing/landing-navbar.tsx");
  const styles = read("app/globals.css");

  it("uses a sticky glass navbar with a high stacking context", () => {
    expect(navbar).toContain("sticky top-0 z-50 border-b border-gray-100 bg-white/70 backdrop-blur-md");
    expect(navbar).toContain("dark:bg-slate-950/75");
    expect(navbar).toContain("window.scrollY > 12");
  });

  it("adds subtle floating motion and reduced-motion support to the dashboard mockup", () => {
    expect(page).toContain("hero-dashboard-float");
    expect(page).toContain("shadow-2xl shadow-indigo-500/20 ring-1 ring-gray-900/5 transition-transform hover:-translate-y-2");
    expect(styles).toContain("@keyframes hero-dashboard-float");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });

  it("uses a darker, breathable hero subheadline", () => {
    expect(page).toContain("text-base font-medium leading-8 text-slate-600 dark:text-slate-300");
  });

  it("routes authenticated users to roleHome and hides sign-up CTAs", () => {
    expect(page).toContain("const user = await loadCurrentUser();");
    expect(page).toContain("const portalSession = await readPortalSession();");
    expect(page).toContain("const destination = portalSession ? portalDestination : user ? roleHome(user.role) : \"/signup\";");
    expect(page).toContain("/portal/student");
    expect(page).toContain("/portal/parent");
    expect(page).toContain("!authenticated &&");
    expect(page).toContain("{authenticated ? ctaLabel");
    expect(page).not.toContain("redirect(roleHome(user.role))");
  });

  it("does not claim an image LCP asset where the hero is a CSS dashboard mockup", () => {
    expect(page).not.toContain("<img");
    expect(page).not.toContain("next/image");
    expect(page).toContain("Owner intelligence");
  });
});
