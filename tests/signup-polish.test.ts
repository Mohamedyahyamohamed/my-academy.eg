import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("signup page polish", () => {
  const page = read("app/signup/page.tsx");
  const form = read("components/auth/signup-form.tsx");
  const requirements = read("components/auth/password-requirements.tsx");

  it("uses a premium rounded signup card with light and dark surfaces", () => {
    expect(page).toContain("bg-slate-50/60");
    expect(page).toContain("rounded-2xl border border-gray-100 bg-white");
    expect(page).toContain("shadow-xl");
    expect(page).toContain("dark:bg-slate-900");
  });

  it("keeps signup direction correct and uses a left-facing RTL action icon", () => {
    expect(page).toContain('dir={isRTL(lang) ? "rtl" : "ltr"}');
    expect(form).toContain("ArrowLeft");
    expect(form).not.toContain("ArrowRight");
    expect(form).toContain('className={`h-4 w-4 ${en ? "rotate-180" : ""}`}');
  });

  it("polishes all signup inputs and focuses the first relevant field", () => {
    expect(form).toContain("autoFocus");
    expect(form).toContain("bg-white");
    expect(form).toContain("border-gray-300");
    expect(form).toContain("rounded-lg");
    expect(form).toContain("focus:ring-2 focus:ring-indigo-500");
    expect(form).toContain("focus:border-indigo-500");
  });

  it("adds role-card hover feedback and an accessible selected state", () => {
    expect(form).toContain("hover:-translate-y-0.5");
    expect(form).toContain("hover:bg-indigo-50/50");
    expect(form).toContain("aria-pressed");
    expect(form).toContain("dark:hover:bg-indigo-950/40");
  });

  it("provides dynamic password feedback and a robust submit loading state", () => {
    expect(requirements).toContain("password.length >= minLength");
    expect(requirements).toContain("CheckCircle2");
    expect(requirements).toContain("text-green-500");
    expect(form).toContain("Loader2 className=\"h-4 w-4 animate-spin\"");
    expect(form).toContain("disabled:opacity-70");
    expect(form).toContain("disabled:cursor-not-allowed");
    expect(form).toContain("aria-busy={loading}");
  });
});
