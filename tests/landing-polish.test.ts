import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("landing premium polish", () => {
  const page = read("app/page.tsx");
  const styles = read("app/globals.css");

  it("uses a sticky glass navbar with a high stacking context", () => {
    expect(page).toContain("sticky top-0 z-50");
    expect(page).toContain("bg-white/70");
    expect(page).toContain("backdrop-blur-md");
    expect(page).toContain("dark:bg-slate-950/75");
  });

  it("adds subtle floating motion and reduced-motion support to the dashboard mockup", () => {
    expect(page).toContain("hero-dashboard-float");
    expect(page).toContain("shadow-indigo-500/10");
    expect(styles).toContain("@keyframes hero-dashboard-float");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });

  it("uses a darker, breathable hero subheadline", () => {
    expect(page).toContain("text-slate-600 dark:text-slate-300");
    expect(page).toContain("leading-8");
  });

  it("routes authenticated users to roleHome and hides sign-up CTAs", () => {
    expect(page).toContain("const user = await loadCurrentUser();");
    expect(page).toContain("const destination = user ? roleHome(user.role) : \"/signup\";");
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
