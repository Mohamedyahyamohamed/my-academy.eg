import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("login toast and RTL polish", () => {
  const loginPage = read("app/login/page.tsx");
  const loginForm = read("components/auth/login-form.tsx");
  const layout = read("app/layout.tsx");

  it("keeps the Arabic success toast BiDi-safe with an LTR name span", () => {
    expect(loginForm).toContain('const firstName = data.user.full_name.split(" ")[0];');
    expect(loginForm).toContain('<span dir="rtl">أهلاً بك، <span dir="ltr">{firstName}</span>!</span>');
    expect(loginForm).toContain('<span dir="ltr">Welcome, {firstName}!</span>');
  });

  it("uses a left-facing arrow for the Arabic signup link", () => {
    expect(loginPage).toContain("سجّل الآن (أكاديمية / مدرس مستقل) ←");
    expect(loginPage).not.toContain("سجّل الآن (أكاديمية / مدرس مستقل) →");
  });

  it("polishes the forgot-password link and preserves premium input/loading UX", () => {
    expect(loginForm).toContain("transition-colors hover:text-indigo-700 hover:underline");
    expect(loginForm).toContain("bg-white");
    expect(loginForm).toContain("border-gray-300");
    expect(loginForm).toContain("focus:ring-2 focus:ring-indigo-500");
    expect(loginForm).toContain("Loader2 className=\"h-4 w-4 animate-spin\"");
    expect(loginForm).toContain("disabled:cursor-not-allowed");
  });

  it("uses a compact, centered premium Sonner presentation", () => {
    expect(layout).toContain('position="top-center"');
    expect(layout).toContain("rounded-xl px-4 py-3 text-sm shadow-lg");
    expect(layout).toContain('borderRadius: "0.75rem"');
  });
});
