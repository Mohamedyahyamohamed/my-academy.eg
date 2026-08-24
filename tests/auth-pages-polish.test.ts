import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("authentication page polish", () => {
  const loginPage = read("app/login/page.tsx");
  const loginForm = read("components/auth/login-form.tsx");
  const portalPage = read("app/portal/login/page.tsx");
  const portalForm = read("components/portal/portal-login-form.tsx");
  const styles = read("app/globals.css");

  it("adds premium split-screen depth to both authentication pages", () => {
    expect(loginPage).toContain("auth-info-panel");
    expect(loginPage).toContain("bg-gradient-to-br from-indigo-50/70");
    expect(loginPage).toContain("rounded-2xl border border-gray-100 bg-white");
    expect(loginPage).toContain("shadow-2xl");
    expect(portalPage).toContain("auth-info-panel");
    expect(portalPage).toContain("bg-gradient-to-br from-violet-700");
    expect(portalPage).toContain("bg-white p-6 text-slate-900 shadow-2xl");
    expect(styles).toContain(".auth-info-panel::before");
    expect(styles).toContain(".dark .auth-info-panel::before");
  });

  it("polishes main login inputs, autofocus, and inline failures", () => {
    expect(loginForm).toContain("autoFocus");
    expect(loginForm).toContain("border-gray-300");
    expect(loginForm).toContain("rounded-lg");
    expect(loginForm).toContain("bg-white");
    expect(loginForm).toContain("focus:ring-2 focus:ring-indigo-500");
    expect(loginForm).toContain("text-gray-400");
    expect(loginForm).toContain("text-red-500");
    expect(loginForm).toContain("role=\"alert\"");
  });

  it("provides a robust disabled loading state on the main login button", () => {
    expect(loginForm).toContain("setLoading(true)");
    expect(loginForm).toContain("Loader2 className=\"h-4 w-4 animate-spin\"");
    expect(loginForm).toContain("disabled:cursor-not-allowed");
    expect(loginForm).toContain("disabled:opacity-70");
    expect(loginForm).toContain("aria-busy={loading}");
  });

  it("polishes portal inputs, role controls, inline errors, and loading", () => {
    expect(portalForm).toContain("autoFocus");
    expect(portalForm).toContain("border-gray-300");
    expect(portalForm).toContain("rounded-lg");
    expect(portalForm).toContain("bg-white");
    expect(portalForm).toContain("focus:ring-2 focus:ring-indigo-500");
    expect(portalForm).toContain("value=\"student\"");
    expect(portalForm).toContain("value=\"parent\"");
    expect(portalForm).toContain("text-red-500");
    expect(portalForm).toContain("Loader2 className=\"h-4 w-4 animate-spin\"");
    expect(portalForm).toContain("disabled:cursor-not-allowed");
    expect(portalForm).toContain("aria-busy={pending}");
  });
});
